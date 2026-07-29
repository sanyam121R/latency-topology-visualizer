import type { CloudRegion, Exchange, PairKey } from '@/types/domain';
import { EXCHANGES } from './exchanges';
import { CLOUD_REGIONS, PROVIDERS } from './regions';
import { pairKey } from './keys';
import { greatCircleDistanceKm } from '@/lib/geo/projection';

/**
 * Which (exchange, region) pairs the scene actually draws.
 *
 * The full matrix is 170 arcs, which is visually unreadable on a globe and
 * wasteful to render. The default strategy draws each exchange's *nearest*
 * region per provider (<= 3 arcs per exchange, 30 total), which is also the
 * topology a latency dashboard actually cares about.
 *
 * This is a VIEW concern, not a data concern: the store still ingests every
 * sample the source provides, so switching strategy or adding a filter later
 * needs no change to ingestion or history.
 */
export type PairStrategy = 'nearest-per-provider' | 'full-matrix' | 'hosted-only';

export interface VisualPair {
  key: PairKey;
  exchange: Exchange;
  region: CloudRegion;
  /** Surface distance, precomputed for arc altitude + tooltip display. */
  distanceKm: number;
}

export function buildVisualPairs(
  strategy: PairStrategy = 'nearest-per-provider',
  exchanges: readonly Exchange[] = EXCHANGES,
  regions: readonly CloudRegion[] = CLOUD_REGIONS,
): VisualPair[] {
  const make = (exchange: Exchange, region: CloudRegion): VisualPair => ({
    key: pairKey(exchange.id, region.id),
    exchange,
    region,
    distanceKm: greatCircleDistanceKm(exchange.location, region.location),
  });

  if (strategy === 'full-matrix') {
    return exchanges.flatMap((e) => regions.map((r) => make(e, r)));
  }

  if (strategy === 'hosted-only') {
    const byId = new Map(regions.map((r) => [r.id as string, r]));
    return exchanges.flatMap((e) => {
      const r = e.hostedInRegionId ? byId.get(e.hostedInRegionId) : undefined;
      return r ? [make(e, r)] : [];
    });
  }

  // nearest-per-provider
  const out: VisualPair[] = [];
  for (const e of exchanges) {
    for (const provider of PROVIDERS) {
      let best: CloudRegion | undefined;
      let bestKm = Infinity;
      for (const r of regions) {
        if (r.provider !== provider) continue;
        const km = greatCircleDistanceKm(e.location, r.location);
        if (km < bestKm) { bestKm = km; best = r; }
      }
      if (best) out.push(make(e, best));
    }
  }
  return out;
}
