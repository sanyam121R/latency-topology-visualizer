import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type { LatencySample, PairKey, PairState, StreamStatus } from '@/types/domain';
import { pairKey } from '@/lib/data/keys';
import { RingBuffer } from './ringBuffer';
/**
 * LATENCY STORE — read contract
 *
 *  - The 3D scene reads `latencyStore.getState()` INSIDE useFrame. No hook
 *    subscription, so new samples never trigger React reconciliation.
 *  - DOM/UI reads the low-frequency slice via `useLatencyMeta`. Those change
 *    at ~0.2Hz; React is fine there.
 *  - Charts read history via `getHistory(key)`, snapshot-on-demand.
 *
 * `pairs` is a plain Map mutated in place. History lives OUTSIDE the zustand
 * state object so pushing samples never invalidates selectors.
 */
/** ~1 hour of history at a 5s cadence. Tune per memory budget. */
export const HISTORY_CAPACITY = 720;
/** Duration over which the renderer eases from `previous` to `current`. */
export const TRANSITION_MS = 400;
export interface LatencyState {
  pairs: Map<PairKey, PairState>;
  status: StreamStatus;
  lastUpdatedAt: number | null;
  lastError: string | null;
  pairCount: number;
  ingest: (samples: LatencySample[]) => void;
  setStatus: (status: StreamStatus, error?: string | null) => void;
  reset: () => void;
}
/** History is deliberately outside reactive state. */
const history = new Map<PairKey, RingBuffer<LatencySample>>();
export const latencyStore = createStore<LatencyState>((set, get) => ({
  pairs: new Map(),
  status: 'idle',
  lastUpdatedAt: null,
  lastError: null,
  pairCount: 0,
  ingest(samples) {
    if (samples.length === 0) return;
    const { pairs } = get();
    const now = Date.now();
    for (const s of samples) {
      const key = pairKey(s.fromId, s.toId);
      const existing = pairs.get(key);
      if (existing) {
        // Mutate in place: the scene holds a reference to this object.
        existing.previous = existing.current;
        existing.current = s;
        existing.committedAt = now;
      } else {
        pairs.set(key, {
          key, fromId: s.fromId, toId: s.toId, current: s, committedAt: now,
        });
      }
      let buf = history.get(key);
      if (!buf) { buf = new RingBuffer<LatencySample>(HISTORY_CAPACITY); history.set(key, buf); }
      buf.push(s);
    }
    // One notification per batch, not per sample.
    set({ status: 'live', lastUpdatedAt: now, lastError: null, pairCount: pairs.size });
  },
  setStatus(status, error = null) { set({ status, lastError: error }); },
  reset() {
    history.clear();
    set({ pairs: new Map(), status: 'idle', lastUpdatedAt: null, lastError: null, pairCount: 0 });
  },
}));
/* ---------------- Read helpers — the stable public surface ---------------- */
/** Hot path. Call inside useFrame. Returns the live, mutated Map. */
export function getPairs(): ReadonlyMap<PairKey, PairState> {
  return latencyStore.getState().pairs;
}
export function getPair(key: PairKey): PairState | undefined {
  return latencyStore.getState().pairs.get(key);
}
/** Snapshot for charts. Allocates; never call per frame. */
export function getHistory(key: PairKey): LatencySample[] {
  return history.get(key)?.toArray() ?? [];
}
export function getHistoryKeys(): PairKey[] { return [...history.keys()]; }
/**
 * Eased value for rendering: interpolates previous -> current over
 * TRANSITION_MS so arcs never snap between poll ticks.
 */
export function interpolatedRtt(pair: PairState, now: number): number {
  if (!pair.previous) return pair.current.rttMs;
  const t = Math.min(1, (now - pair.committedAt) / TRANSITION_MS);
  const e = t * t * (3 - 2 * t); // smoothstep
  return pair.previous.rttMs + (pair.current.rttMs - pair.previous.rttMs) * e;
}
/* ---------------- React bindings — LOW FREQUENCY ONLY ---------------- */
export interface LatencyMeta {
  status: StreamStatus;
  lastUpdatedAt: number | null;
  lastError: string | null;
  pairCount: number;
}
/**
 * For status bars / "last updated" indicators.
 *
 * Each field is selected individually and returns a primitive, so there is no
 * new object per render and no module-level memo cache (which would be shared
 * across requests on the server). Excludes `pairs` by design.
 */
export function useLatencyMeta(): LatencyMeta {
  const status = useStore(latencyStore, (s) => s.status);
  const lastUpdatedAt = useStore(latencyStore, (s) => s.lastUpdatedAt);
  const lastError = useStore(latencyStore, (s) => s.lastError);
  const pairCount = useStore(latencyStore, (s) => s.pairCount);
  return { status, lastUpdatedAt, lastError, pairCount };
}
/** Narrower subscriptions for components that only need one signal. */
export const useStreamStatus = (): StreamStatus =>
  useStore(latencyStore, (s) => s.status);
export const useLastUpdatedAt = (): number | null =>
  useStore(latencyStore, (s) => s.lastUpdatedAt);