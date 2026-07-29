import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type {
  CloudProvider,
  ExchangeId,
  LatencyBand,
  PairKey,
  RegionId,
} from '@/types/domain';

/**
 * WORLD / UI STORE — low-frequency, React-facing state.
 *
 * Hover and selection change at human speed (a few Hz at most), so normal
 * zustand subscriptions are correct here. The rule is only that *latency
 * values* never live in this store — those stay in the latency store and are
 * read by reference inside useFrame.
 */

export type HoverTarget =
  | { kind: 'exchange'; id: ExchangeId }
  | { kind: 'region'; id: RegionId }
  | { kind: 'arc'; key: PairKey; pairIndex: number; band: LatencyBand };

export interface WorldState {
  /** Null when nothing is hovered. Written from the canvas, read by the DOM. */
  hovered: HoverTarget | null;
  /** Pointer position in CSS pixels, for tooltip placement. */
  pointer: { x: number; y: number };
  /** Click-to-pin selection; survives pointer-out. */
  selected: HoverTarget | null;

  // --- filters (consumed by the scene via getState(), not subscriptions) ---
  visibleProviders: Record<CloudProvider, boolean>;
  showArcs: boolean;
  showRegions: boolean;
  showExchanges: boolean;

  setHovered: (target: HoverTarget | null) => void;
  setPointer: (x: number, y: number) => void;
  setSelected: (target: HoverTarget | null) => void;
  toggleProvider: (provider: CloudProvider) => void;
  setLayer: (layer: 'showArcs' | 'showRegions' | 'showExchanges', on: boolean) => void;
}

export const worldStore = createStore<WorldState>((set, get) => ({
  hovered: null,
  pointer: { x: 0, y: 0 },
  selected: null,
  visibleProviders: { aws: true, gcp: true, azure: true, unknown: true },
  showArcs: true,
  showRegions: true,
  showExchanges: true,

  setHovered(target) {
    // Guard: the raycast runs every frame, but we only notify on real change.
    const prev = get().hovered;
    if (sameTarget(prev, target)) return;
    set({ hovered: target });
  },

  /**
   * Pointer position is intentionally NOT used to drive React renders — the
   * tooltip positions itself imperatively. Stored here only so the tooltip can
   * read an initial position on mount.
   */
  setPointer(x, y) {
    get().pointer.x = x;
    get().pointer.y = y;
  },

  setSelected(target) {
    set({ selected: target });
  },

  toggleProvider(provider) {
    const next = { ...get().visibleProviders, [provider]: !get().visibleProviders[provider] };
    set({ visibleProviders: next });
  },

  setLayer(layer, on) {
    set({ [layer]: on } as Partial<WorldState>);
  },
}));

/** Structural equality for hover targets; avoids redundant store notifications. */
export function sameTarget(a: HoverTarget | null, b: HoverTarget | null): boolean {
  if (a === b) return true;
  if (!a || !b || a.kind !== b.kind) return false;
  if (a.kind === 'exchange' && b.kind === 'exchange') return a.id === b.id;
  if (a.kind === 'region' && b.kind === 'region') return a.id === b.id;
  if (a.kind === 'arc' && b.kind === 'arc') return a.key === b.key;
  return false;
}

export const useHovered = (): HoverTarget | null =>
  useStore(worldStore, (s) => s.hovered);
export const useSelected = (): HoverTarget | null =>
  useStore(worldStore, (s) => s.selected);
export const useLayerFlags = (): {
  showArcs: boolean; showRegions: boolean; showExchanges: boolean;
} => ({
  showArcs: useStore(worldStore, (s) => s.showArcs),
  showRegions: useStore(worldStore, (s) => s.showRegions),
  showExchanges: useStore(worldStore, (s) => s.showExchanges),
});
export const useVisibleProviders = (): Record<CloudProvider, boolean> =>
  useStore(worldStore, (s) => s.visibleProviders);