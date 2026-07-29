'use client';

import { JSX, useCallback } from 'react';
import { CLOUD_REGIONS } from '@/lib/data/regions';
import type { CloudProvider, CloudRegion } from '@/types/domain';
import { MarkerLayer } from './MarkerLayer';
import type { HoverTarget } from '@/lib/store/useWorldStore';

/**
 * Cloud regions are secondary context: dimmer and smaller than exchanges, and
 * filterable by provider. One layer per provider keeps the colour a material
 * constant rather than a per-instance attribute, which keeps MarkerLayer simple.
 */
const PROVIDER_COLORS: Record<CloudProvider, string> = {
  aws: '#ff9900',
  gcp: '#4285f4',
  azure: '#00a4ef',
  unknown: '#888888',
};

function ProviderLayer({ provider }: { provider: CloudProvider }): JSX.Element {
  const items = CLOUD_REGIONS.filter((r) => r.provider === provider);

  const toHoverTarget = useCallback(
    (item: CloudRegion): HoverTarget => ({ kind: 'region', id: item.id }),
    [],
  );
  const isEmphasised = useCallback(
    (item: CloudRegion, hovered: HoverTarget | null, selected: HoverTarget | null) =>
      (hovered?.kind === 'region' && hovered.id === item.id) ||
      (selected?.kind === 'region' && selected.id === item.id),
    [],
  );
  const isVisible = useCallback(
    (item: CloudRegion, visibleProviders: Record<CloudProvider, boolean>) =>
      visibleProviders[item.provider] !== false,
    [],
  );

  return (
    <MarkerLayer
      items={items}
      radius={0.008}
      altitude={0.004}
      color={PROVIDER_COLORS[provider]}
      opacity={0.85}
      toHoverTarget={toHoverTarget}
      isEmphasised={isEmphasised}
      isVisible={isVisible}
    />
  );
}

export function CloudRegionMarkers(): JSX.Element {
  return (
    <group>
      <ProviderLayer provider="aws" />
      <ProviderLayer provider="gcp" />
      <ProviderLayer provider="azure" />
    </group>
  );
}