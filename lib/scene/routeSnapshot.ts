import type {
    CloudProvider,
    LatencyBand,
    PairKey,
    RouteSortKey,
    SortDirection,
  } from '@/types/domain';
  import type { VisualPair } from '@/lib/data/pairs';
  import { latencyBand } from '@/lib/data/latencyScale';
  import { getHistory, latencyStore } from '@/lib/store/useLatencyStore';
  import { isLinkVisible, type LinkFilters } from './visibility';
  
  /**
   * SNAPSHOT LAYER — the DOM's view of the data.
   *
   * The scene reads latency by reference at 60Hz. The DOM must not: a 170-row
   * table re-rendering every frame is a dead tab. So every table/panel surface
   * builds an immutable snapshot at a boundary (a new batch arriving, or a filter
   * change) and renders from that.
   *
   * Everything here is plain data — no React, no three.js — so the table, the
   * worst-routes panel and the breakdown widgets all share one computation.
   */
  
  export interface RouteRow {
    key: PairKey;
    pairIndex: number;
    exchangeId: string;
    exchangeName: string;
    exchangeCode: string;
    regionId: string;
    regionCode: string;
    provider: CloudProvider;
    routeLabel: string;
    rttMs: number;
    band: LatencyBand;
    distanceKm: number;
    /** Mean over the retained history window. */
    meanMs: number;
    /** Max - min over the retained window: a cheap jitter proxy. */
    jitterMs: number;
    /** Epoch ms of the sample backing `rttMs`. */
    sampledAt: number;
    visible: boolean;
  }
  
  export interface RouteSnapshot {
    rows: RouteRow[];
    /** Rows surviving filters, already sorted. */
    visibleRows: RouteRow[];
    counts: { drawable: number; visible: number };
    byProvider: Record<CloudProvider, number>;
    byBand: Record<LatencyBand, number>;
    /** Aggregates over visible rows only. */
    stats: { p50: number; p99: number; worst: number; best: number } | null;
    builtAt: number;
  }
  
  const EMPTY_BANDS: Record<LatencyBand, number> = { good: 0, fair: 0, poor: 0, critical: 0 };
  const EMPTY_PROVIDERS: Record<CloudProvider, number> = { aws: 0, gcp: 0, azure: 0, unknown: 0 };
  
  function percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const i = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
    return sorted[i]!;
  }
  
  /**
   * Build the full snapshot. Called on new-batch / filter-change boundaries.
   * O(pairs + history) — a few hundred microseconds for the current dataset.
   */
  export function buildRouteSnapshot(
    pairs: readonly VisualPair[],
    filters: LinkFilters,
    sortKey: RouteSortKey,
    sortDir: SortDirection,
  ): RouteSnapshot {
    const state = latencyStore.getState();
    const rows: RouteRow[] = [];
    const byProvider = { ...EMPTY_PROVIDERS };
    const byBand = { ...EMPTY_BANDS };
  
    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i]!;
      const live = state.pairs.get(pair.key);
      if (!live) continue;
  
      const rttMs = live.current.rttMs;
      const band = latencyBand(rttMs);
  
      // History-derived stats. getHistory allocates, so this must stay out of
      // any per-frame path — it is snapshot-time only.
      const history = getHistory(pair.key);
      let sum = 0;
      let min = Infinity;
      let max = -Infinity;
      for (const sample of history) {
        sum += sample.rttMs;
        if (sample.rttMs < min) min = sample.rttMs;
        if (sample.rttMs > max) max = sample.rttMs;
      }
      const meanMs = history.length ? sum / history.length : rttMs;
      const jitterMs = history.length > 1 ? max - min : 0;
  
      const visible = isLinkVisible(pair, band, filters);
      if (visible) {
        byProvider[pair.region.provider]++;
        byBand[band]++;
      }
  
      rows.push({
        key: pair.key,
        pairIndex: i,
        exchangeId: pair.exchange.id,
        exchangeName: pair.exchange.name,
        exchangeCode: pair.exchange.code,
        regionId: pair.region.id,
        regionCode: pair.region.code,
        provider: pair.region.provider,
        routeLabel: `${pair.exchange.name} → ${pair.region.code}`,
        rttMs,
        band,
        distanceKm: pair.distanceKm,
        meanMs,
        jitterMs,
        sampledAt: live.current.t,
        visible,
      });
    }
  
    const visibleRows = rows.filter((r) => r.visible);
    sortRows(visibleRows, sortKey, sortDir);
  
    const sortedRtt = visibleRows.map((r) => r.rttMs).sort((a, b) => a - b);
    const stats = sortedRtt.length
      ? {
          p50: percentile(sortedRtt, 50),
          p99: percentile(sortedRtt, 99),
          best: sortedRtt[0]!,
          worst: sortedRtt[sortedRtt.length - 1]!,
        }
      : null;
  
    return {
      rows,
      visibleRows,
      counts: { drawable: pairs.length, visible: visibleRows.length },
      byProvider,
      byBand,
      stats,
      builtAt: Date.now(),
    };
  }
  
  const BAND_ORDER: Record<LatencyBand, number> = { good: 0, fair: 1, poor: 2, critical: 3 };
  
  export function sortRows(rows: RouteRow[], key: RouteSortKey, dir: SortDirection): void {
    const sign = dir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      let d = 0;
      switch (key) {
        case 'route': d = a.routeLabel.localeCompare(b.routeLabel); break;
        case 'provider': d = a.provider.localeCompare(b.provider) || a.regionCode.localeCompare(b.regionCode); break;
        case 'rtt': d = a.rttMs - b.rttMs; break;
        case 'band': d = BAND_ORDER[a.band] - BAND_ORDER[b.band] || a.rttMs - b.rttMs; break;
        case 'distance': d = a.distanceKm - b.distanceKm; break;
        case 'jitter': d = a.jitterMs - b.jitterMs; break;
      }
      // Stable tiebreak so rows don't shuffle between snapshots.
      return d !== 0 ? d * sign : a.key.localeCompare(b.key);
    });
  }
  
  export const EMPTY_SNAPSHOT: RouteSnapshot = {
    rows: [],
    visibleRows: [],
    counts: { drawable: 0, visible: 0 },
    byProvider: { ...EMPTY_PROVIDERS },
    byBand: { ...EMPTY_BANDS },
    stats: null,
    builtAt: 0,
  };