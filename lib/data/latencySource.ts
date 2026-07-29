import type { Exchange, CloudRegion, LatencySample, LatencySource } from '@/types/domain';
import { EXCHANGES } from './exchanges';
import { CLOUD_REGIONS } from './regions';
import { greatCircleDistanceKm } from '@/lib/geo/projection';
/**
 * THE SWAP POINT.
 *
 * Everything downstream depends only on `LatencySource`. To move from synthetic
 * data to a real feed, implement this interface and change ONE line in the
 * store bootstrap. No component changes.
 */
/** Speed of light in fibre, ~2/3 c, as km/ms. */
const KM_PER_MS = 200;
/** Fixed per-hop overhead: switching, routing, TLS termination. */
const BASE_OVERHEAD_MS = 4;
/** Physically-plausible baseline from geography alone. Also a gap-fill fallback. */
export function baselineRttMs(from: Exchange, to: CloudRegion): number {
  const km = greatCircleDistanceKm(from.location, to.location);
  // Round trip => 2x distance, plus a routing-inefficiency factor.
  return BASE_OVERHEAD_MS + (km * 2 * 1.35) / KM_PER_MS;
}
/** Deterministic pseudo-random in [0,1) from a string seed + tick. */
function hashNoise(seed: string, tick: number): number {
  let h = 2166136261 ^ tick;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}
export interface SyntheticSourceOptions {
  jitter?: number;        // fraction of baseline; 0.15 = +/-15%
  spikeChance?: number;   // probability a pair spikes on a tick
  pairs?: ReadonlyArray<readonly [Exchange, CloudRegion]>;
}
/** Geography-derived baselines + bounded jitter + rare spikes. */
export function createSyntheticLatencySource(
  options: SyntheticSourceOptions = {},
): LatencySource {
  const { jitter = 0.12, spikeChance = 0.02 } = options;
  const pairs = options.pairs
    ?? EXCHANGES.flatMap((e) => CLOUD_REGIONS.map((r) => [e, r] as const));
  const baselines = pairs.map(([e, r]) => baselineRttMs(e, r)); // never change
  let tick = 0;
  return {
    id: 'synthetic',
    async fetchBatch(): Promise<LatencySample[]> {
      const t = Date.now();
      tick++;
      return pairs.map(([e, r], i) => {
        const base = baselines[i] ?? 50;
        const n = hashNoise(`${e.id}:${r.id}`, tick);
        let rtt = base * (1 + (n - 0.5) * 2 * jitter);
        if (hashNoise(`${r.id}:${e.id}`, tick) < spikeChance) rtt *= 2.5;
        return { fromId: e.id, toId: r.id, rttMs: Math.round(rtt * 10) / 10, t };
      });
    },
  };
}
/**
 * HTTP source: polls our own Next.js route, which normalizes whatever public
 * provider we're using. Components never learn the upstream's shape.
 */
export function createHttpLatencySource(endpoint = '/api/latency'): LatencySource {
  return {
    id: `http:${endpoint}`,
    async fetchBatch(signal?: AbortSignal): Promise<LatencySample[]> {
      const res = await fetch(endpoint, { signal, cache: 'no-store' });
      if (!res.ok) throw new Error(`Latency fetch failed: ${res.status}`);
      const json: unknown = await res.json();
      return parseLatencyPayload(json);
    },
  };
}
/** Defensive parse at the network boundary — never trust the wire. */
export function parseLatencyPayload(input: unknown): LatencySample[] {
  if (!input || typeof input !== 'object') return [];
  const raw = (input as { samples?: unknown }).samples;
  if (!Array.isArray(raw)) return [];
  const out: LatencySample[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    if (
      typeof o.fromId === 'string' && typeof o.toId === 'string' &&
      typeof o.rttMs === 'number' && Number.isFinite(o.rttMs)
    ) {
      out.push({
        fromId: o.fromId as LatencySample['fromId'],
        toId: o.toId as LatencySample['toId'],
        rttMs: o.rttMs,
        t: typeof o.t === 'number' ? o.t : Date.now(),
      });
    }
  }
  return out;
}