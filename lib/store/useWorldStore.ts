import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type {
  CloudProvider,
  ExchangeId,
  LatencyBand,
  PairKey,
  RegionId,
  RouteSortKey,
  SortDirection,
  TableMode,
} from '@/types/domain';
import { BANDS } from '@/lib/data/latencyScale';
import type { LinkFilters } from '@/lib/scene/visibility';

/**
 * WORLD / UI STORE — low-frequency, React-facing state.
 *
 * Hover, selection and filters change at human speed, so normal zustand
 * subscriptions are correct here. The invariant from earlier passes still
 * holds: no latency *values* live in this store. The scene reads filters via
 * getState() inside useFrame; the DOM reads them via selectors.
 *
 * This is also why no filter state lives in a React parent of <Canvas>: a
 * useState in a shared ancestor would re-render the whole scene on every
 * checkbox click.
 */

export type HoverTarget =
  | { kind: 'exchange'; id: ExchangeId }
  | { kind: 'region'; id: RegionId }
  | { kind: 'arc'; key: PairKey; pairIndex: number; band: LatencyBand };

const ALL_BANDS = Object.fromEntries(BANDS.map((b) => [b, true])) as Record<LatencyBand, boolean>;

export interface WorldState {
  hovered: HoverTarget | null;
  selected: HoverTarget | null;
  /** Pointer position, mutated in place — never triggers a render. */
  pointer: { x: number; y: number };

  // --- filters ---
  providers: Record<CloudProvider, boolean>;
  bands: Record<LatencyBand, boolean>;
  /** null = all exchanges. */
  exchangeIds: ReadonlySet<string> | null;
  exchangeQuery: string;
  showArcs: boolean;
  showExchanges: boolean;
  showRegions: boolean;
  showGraticule: boolean;

  // --- dock ---
  tableMode: TableMode;
  sortKey: RouteSortKey;
  sortDir: SortDirection;
  dockOpen: boolean;

  /**
   * Truthful scene counters, published by the arc layer when they change.
   * `ingested` is how many pairs the store has ever seen; `drawable` is how
   * many the current view strategy could draw; `visible` is how many survive
   * filters right now. The old StatusBar showed `ingested` and claimed it was
   * what you were looking at.
   */
  stats: { ingested: number; drawable: number; visible: number };

  setHovered: (t: HoverTarget | null) => void;
  setSelected: (t: HoverTarget | null) => void;
  setPointer: (x: number, y: number) => void;
  toggleProvider: (p: CloudProvider) => void;
  toggleBand: (b: LatencyBand) => void;
  setExchangeQuery: (q: string) => void;
  toggleExchange: (id: string) => void;
  clearExchangeFilter: () => void;
  setLayer: (layer: 'showArcs' | 'showExchanges' | 'showRegions' | 'showGraticule', on: boolean) => void;
  setTableMode: (m: TableMode) => void;
  setSort: (key: RouteSortKey) => void;
  setDockOpen: (open: boolean) => void;
  publishStats: (next: { ingested: number; drawable: number; visible: number }) => void;
  resetFilters: () => void;
}

export const worldStore = createStore<WorldState>((set, get) => ({
  hovered: null,
  selected: null,
  pointer: { x: 0, y: 0 },

  providers: { aws: true, gcp: true, azure: true, unknown: true },
  bands: { ...ALL_BANDS },
  exchangeIds: null,
  exchangeQuery: '',
  showArcs: true,
  showExchanges: true,
  showRegions: true,
  showGraticule: true,

  tableMode: 'exchange-region',
  sortKey: 'rtt',
  sortDir: 'desc',
  dockOpen: true,

  stats: { ingested: 0, drawable: 0, visible: 0 },

  setHovered(target) {
    if (sameTarget(get().hovered, target)) return;
    set({ hovered: target });
  },

  setSelected(target) {
    if (sameTarget(get().selected, target)) return;
    set({ selected: target });
  },

  /** Mutated in place on purpose: 200 pointer moves must cost 0 renders. */
  setPointer(x, y) {
    const p = get().pointer;
    p.x = x;
    p.y = y;
  },

  toggleProvider(provider) {
    set({ providers: { ...get().providers, [provider]: !get().providers[provider] } });
  },

  toggleBand(band) {
    set({ bands: { ...get().bands, [band]: !get().bands[band] } });
  },

  setExchangeQuery(exchangeQuery) {
    set({ exchangeQuery });
  },

  toggleExchange(id) {
    const current = get().exchangeIds;
    const next = new Set(current ?? []);
    if (current === null) {
      // First click switches from "all" to "only this one".
      set({ exchangeIds: new Set([id]) });
      return;
    }
    if (next.has(id)) next.delete(id);
    else next.add(id);
    set({ exchangeIds: next.size === 0 ? null : next });
  },

  clearExchangeFilter() {
    set({ exchangeIds: null, exchangeQuery: '' });
  },

  setLayer(layer, on) {
    set({ [layer]: on } as Partial<WorldState>);
  },

  setTableMode(tableMode) {
    set({ tableMode });
  },

  setSort(key) {
    const { sortKey, sortDir } = get();
    if (sortKey === key) set({ sortDir: sortDir === 'asc' ? 'desc' : 'asc' });
    else set({ sortKey: key, sortDir: key === 'route' || key === 'provider' ? 'asc' : 'desc' });
  },

  setDockOpen(dockOpen) {
    set({ dockOpen });
  },

  /** Called from the arc layer only when a count actually changes. */
  publishStats(next) {
    const s = get().stats;
    if (s.ingested === next.ingested && s.drawable === next.drawable && s.visible === next.visible) {
      return;
    }
    set({ stats: next });
  },

  resetFilters() {
    set({
      providers: { aws: true, gcp: true, azure: true, unknown: true },
      bands: { ...ALL_BANDS },
      exchangeIds: null,
      exchangeQuery: '',
      showArcs: true,
      showExchanges: true,
      showRegions: true,
    });
  },
}));

export function sameTarget(a: HoverTarget | null, b: HoverTarget | null): boolean {
  if (a === b) return true;
  if (!a || !b || a.kind !== b.kind) return false;
  if (a.kind === 'exchange' && b.kind === 'exchange') return a.id === b.id;
  if (a.kind === 'region' && b.kind === 'region') return a.id === b.id;
  if (a.kind === 'arc' && b.kind === 'arc') return a.key === b.key;
  return false;
}

/** Build the predicate input. Called in useFrame — must not allocate per pair. */
export function selectFilters(s: WorldState): LinkFilters {
  return {
    providers: s.providers,
    bands: s.bands,
    exchangeIds: s.exchangeIds,
    showArcs: s.showArcs,
    showExchanges: s.showExchanges,
    showRegions: s.showRegions,
  };
}

/** Cheap identity-stable read for the scene's useFrame loop. */
export function getFilters(): LinkFilters {
  return selectFilters(worldStore.getState());
}

/* ---------------- React bindings ---------------- */

export const useHovered = (): HoverTarget | null => useStore(worldStore, (s) => s.hovered);
export const useSelected = (): HoverTarget | null => useStore(worldStore, (s) => s.selected);
export const useProviders = (): Record<CloudProvider, boolean> =>
  useStore(worldStore, (s) => s.providers);
export const useBandFilter = (): Record<LatencyBand, boolean> => useStore(worldStore, (s) => s.bands);
export const useExchangeIds = (): ReadonlySet<string> | null =>
  useStore(worldStore, (s) => s.exchangeIds);
export const useExchangeQuery = (): string => useStore(worldStore, (s) => s.exchangeQuery);
export const useTableMode = (): TableMode => useStore(worldStore, (s) => s.tableMode);
export const useDockOpen = (): boolean => useStore(worldStore, (s) => s.dockOpen);
export const useSort = (): { key: RouteSortKey; dir: SortDirection } => ({
  key: useStore(worldStore, (s) => s.sortKey),
  dir: useStore(worldStore, (s) => s.sortDir),
});
export const useLayers = (): {
  showArcs: boolean; showExchanges: boolean; showRegions: boolean; showGraticule: boolean;
} => ({
  showArcs: useStore(worldStore, (s) => s.showArcs),
  showExchanges: useStore(worldStore, (s) => s.showExchanges),
  showRegions: useStore(worldStore, (s) => s.showRegions),
  showGraticule: useStore(worldStore, (s) => s.showGraticule),
});