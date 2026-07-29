import type { CloudProvider, LatencyBand } from '@/types/domain';
import type { VisualPair } from '@/lib/data/pairs';

/**
 * THE SHARED VISIBILITY PREDICATE.
 *
 * Every surface that can hide something routes through here: arcs, exchange
 * markers, region markers, the visible-link counter, and the table. Before
 * this existed, LatencyArcs ignored provider filters entirely while the region
 * markers honoured them, so toggling AWS hid the dots and left the arcs.
 *
 * Pure and allocation-free: it is called once per pair per frame inside the
 * scene's useFrame loop, and again at snapshot time for the DOM surfaces.
 */

export interface LinkFilters {
  providers: Record<CloudProvider, boolean>;
  bands: Record<LatencyBand, boolean>;
  /** null = no exchange filter. Otherwise only these exchange ids pass. */
  exchangeIds: ReadonlySet<string> | null;
  showArcs: boolean;
  showExchanges: boolean;
  showRegions: boolean;
}

/**
 * Is this link drawn / counted / listed?
 * `band` is undefined when the pair has no sample yet — those never show.
 */
export function isLinkVisible(
  pair: VisualPair,
  band: LatencyBand | undefined,
  filters: LinkFilters,
): boolean {
  if (!filters.showArcs) return false;
  if (band === undefined) return false;
  if (!filters.bands[band]) return false;
  if (!filters.providers[pair.region.provider]) return false;
  if (filters.exchangeIds && !filters.exchangeIds.has(pair.exchange.id)) return false;
  return true;
}

/** Exchange markers follow the exchange filter + their layer toggle. */
export function isExchangeVisible(
  exchangeId: string,
  filters: LinkFilters,
): boolean {
  if (!filters.showExchanges) return false;
  if (filters.exchangeIds && !filters.exchangeIds.has(exchangeId)) return false;
  return true;
}

/** Region markers follow the provider filter + their layer toggle. */
export function isRegionVisible(
  provider: CloudProvider,
  filters: LinkFilters,
): boolean {
  if (!filters.showRegions) return false;
  return filters.providers[provider] !== false;
}