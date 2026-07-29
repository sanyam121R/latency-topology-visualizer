'use client';

import { JSX, useCallback } from 'react';
import { EXCHANGES } from '@/lib/data/exchanges';
import type { Exchange } from '@/types/domain';
import { MarkerLayer } from './MarkerLayer';
import type { HoverTarget } from '@/lib/store/useWorldStore';
import { isExchangeVisible, type LinkFilters } from '@/lib/scene/visibility';

/** Exchanges are the primary entity: bright white, slightly larger. */
export function ExchangeMarkers(): JSX.Element {
  const toHoverTarget = useCallback(
    (item: Exchange): HoverTarget => ({ kind: 'exchange', id: item.id }),
    [],
  );
  const isEmphasised = useCallback(
    (item: Exchange, hovered: HoverTarget | null, selected: HoverTarget | null) =>
      (hovered?.kind === 'exchange' && hovered.id === item.id) ||
      (selected?.kind === 'exchange' && selected.id === item.id),
    [],
  );

  const isVisible = useCallback(
    (item: Exchange, filters: LinkFilters) => isExchangeVisible(item.id, filters),
    [],
  );

  return (
    <MarkerLayer
      items={EXCHANGES}
      isVisible={isVisible}
      radius={0.012}
      altitude={0.006}
      color="#ffffff"
      toHoverTarget={toHoverTarget}
      isEmphasised={isEmphasised}
    />
  );
}