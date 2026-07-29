'use client';

import { useMemo } from 'react';
import { useStore } from 'zustand';
import { buildVisualPairs } from '@/lib/data/pairs';
import { latencyStore } from '@/lib/store/useLatencyStore';
import { selectFilters, worldStore } from '@/lib/store/useWorldStore';
import { buildRouteSnapshot, type RouteSnapshot } from '@/lib/scene/routeSnapshot';

/**
 * Rebuilds the DOM-facing snapshot ONLY at real boundaries:
 *   - a new latency batch committed (lastUpdatedAt changes, ~0.14Hz)
 *   - a filter or sort change (user speed)
 *
 * Deliberately does NOT subscribe to `pairs`, which mutates in place every
 * tick, nor to anything that changes per frame. This is the single throttling
 * point between the 60Hz scene and the DOM.
 */
export function useRouteSnapshot(): RouteSnapshot {
  const lastUpdatedAt = useStore(latencyStore, (s) => s.lastUpdatedAt);

  const providers = useStore(worldStore, (s) => s.providers);
  const bands = useStore(worldStore, (s) => s.bands);
  const exchangeIds = useStore(worldStore, (s) => s.exchangeIds);
  const showArcs = useStore(worldStore, (s) => s.showArcs);
  const sortKey = useStore(worldStore, (s) => s.sortKey);
  const sortDir = useStore(worldStore, (s) => s.sortDir);

  const pairs = useMemo(() => buildVisualPairs('nearest-per-provider'), []);

  return useMemo(
    () => buildRouteSnapshot(pairs, selectFilters(worldStore.getState()), sortKey, sortDir),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pairs, lastUpdatedAt, providers, bands, exchangeIds, showArcs, sortKey, sortDir],
  );
}