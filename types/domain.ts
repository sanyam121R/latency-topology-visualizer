/**
 * Shared domain model for the Latency Topology Visualizer.
 *
 * STABILITY CONTRACT: these shapes are consumed by the 3D scene, the filter
 * panel, and (later) the historical charts. Additive changes are cheap;
 * renaming or re-nesting fields is not. Treat this file as an API.
 */
export type CloudProvider = 'aws' | 'gcp' | 'azure' | 'unknown';
export type Continent =
  | 'north-america' | 'south-america' | 'europe'
  | 'africa' | 'asia' | 'oceania';
/** Branded ids so an ExchangeId can never be passed where a RegionId is wanted. */
export type ExchangeId = string & { readonly __brand: 'ExchangeId' };
export type RegionId = string & { readonly __brand: 'RegionId' };
export const exchangeId = (s: string): ExchangeId => s as ExchangeId;
export const regionId = (s: string): RegionId => s as RegionId;
/** A point on the globe. Degrees, WGS84. Never store radians in domain data. */
export interface GeoPoint { lat: number; lng: number }
export interface Exchange {
  id: ExchangeId;
  name: string;
  /** Short label for dense 3D/DOM labels, e.g. "BIN". */
  code: string;
  location: GeoPoint;
  city: string;
  continent: Continent;
  /** Where this exchange is believed to be hosted. Drives topology overlays. */
  provider: CloudProvider;
  hostedInRegionId?: RegionId;
}
export interface CloudRegion {
  id: RegionId;
  provider: CloudProvider;
  /** Provider-native code, e.g. "ap-northeast-1", "europe-west4". */
  code: string;
  name: string;
  location: GeoPoint;
  city: string;
  continent: Continent;
}
/**
 * A single measurement. Flat on purpose: one array of these feeds arcs,
 * tables, and charts alike.
 */
export interface LatencySample {
  fromId: ExchangeId;
  toId: RegionId;
  rttMs: number;
  /** Epoch milliseconds at measurement time. */
  t: number;
}
/**
 * Canonical key for an (exchange, region) pair.
 * PAINFUL TO CHANGE: stores, charts, and instance indices all key on this.
 */
export type PairKey = string & { readonly __brand: 'PairKey' };
/** A pair plus current + previous value, used for interpolated rendering. */
export interface PairState {
  key: PairKey;
  fromId: ExchangeId;
  toId: RegionId;
  current: LatencySample;
  /** Previous sample, if any. Enables easing instead of value snapping. */
  previous?: LatencySample;
  /** Epoch ms when `current` was committed; drives the lerp clock. */
  committedAt: number;
}
export type LatencyBand = 'good' | 'fair' | 'poor' | 'critical';
/** Surfaced in the UI, never read in useFrame. */
export type StreamStatus = 'idle' | 'connecting' | 'live' | 'stale' | 'error';
/**
 * The swappable ingestion boundary. Polling today, SSE/WebSocket later —
 * the scene never knows which.
 */
export interface LatencySource {
  readonly id: string;
  /** Fetch one batch. Should throw on failure; caller handles backoff. */
  fetchBatch(signal?: AbortSignal): Promise<LatencySample[]>;
}

/**
 * What two endpoints a link connects.
 *
 * MINIMAL FORWARD-COMPATIBILITY CHANGE: only 'exchange-region' is produced
 * today. The field exists so table modes, filters and future P2P ingestion key
 * off data rather than off which component is rendering. Generalising the
 * endpoint *types* (NodeId union, id namespacing, directionality) is the larger
 * refactor flagged in review and is deliberately NOT done here.
 */
export type LinkKind = 'exchange-region' | 'exchange-exchange';

/** Which dataset the bottom dock is showing. */
export type TableMode = 'exchange-region' | 'exchange-exchange' | 'history';

/** Column ids the route table can sort on. */
export type RouteSortKey = 'route' | 'provider' | 'rtt' | 'band' | 'distance' | 'jitter';

export type SortDirection = 'asc' | 'desc';