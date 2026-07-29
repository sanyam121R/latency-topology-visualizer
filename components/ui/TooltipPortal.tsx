'use client';

import { JSX, useEffect, useMemo, useRef } from 'react';
import { EXCHANGES_BY_ID } from '@/lib/data/exchanges';
import { REGIONS_BY_ID } from '@/lib/data/regions';
import { parsePairKey } from '@/lib/data/keys';
import { latencyBand } from '@/lib/data/latencyScale';
import { interpolatedRtt, latencyStore } from '@/lib/store/useLatencyStore';
import { useHovered, worldStore } from '@/lib/store/useWorldStore';
import { greatCircleDistanceKm } from '@/lib/geo/projection';

/**
 * HOVER TOOLTIP — the React/imperative split that keeps this cheap.
 *
 * Re-renders ONLY when the hover target changes (a few times per second at
 * most), because that's when the labels change. The two things that change
 * continuously are handled without React:
 *
 *   - POSITION: a passive window pointermove listener writes `style.transform`
 *     directly. Putting pointer coords in state would re-render on every mouse
 *     move, which is the classic way this component becomes the bottleneck.
 *   - RTT VALUE: a requestAnimationFrame loop writes `textContent` directly,
 *     reading the latency store by reference exactly like the 3D layers do.
 *
 * Net effect: smooth, live numbers with zero render churn.
 */
export function TooltipPortal(): JSX.Element | null {
  const hovered = useHovered();
  const rootRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef<HTMLSpanElement>(null);

  /** Labels derived once per hover change. */
  const content = useMemo(() => {
    if (!hovered) return null;

    if (hovered.kind === 'exchange') {
      const exchange = EXCHANGES_BY_ID.get(hovered.id);
      if (!exchange) return null;
      return {
        title: exchange.name,
        subtitle: `${exchange.city} · ${exchange.provider.toUpperCase()}`,
        metricLabel: 'best RTT',
        rttKeySource: { kind: 'exchange' as const, id: hovered.id },
      };
    }

    if (hovered.kind === 'region') {
      const region = REGIONS_BY_ID.get(hovered.id);
      if (!region) return null;
      return {
        title: `${region.provider.toUpperCase()} · ${region.code}`,
        subtitle: `${region.name} — ${region.city}`,
        metricLabel: 'best RTT',
        rttKeySource: { kind: 'region' as const, id: hovered.id },
      };
    }

    const { fromId, toId } = parsePairKey(hovered.key);
    const exchange = EXCHANGES_BY_ID.get(fromId);
    const region = REGIONS_BY_ID.get(toId);
    if (!exchange || !region) return null;
    const km = greatCircleDistanceKm(exchange.location, region.location);
    return {
      title: `${exchange.name} → ${region.provider.toUpperCase()} ${region.code}`,
      subtitle: `${exchange.city} → ${region.city} · ${Math.round(km).toLocaleString()} km`,
      metricLabel: 'RTT',
      rttKeySource: { kind: 'pair' as const, key: hovered.key },
    };
  }, [hovered]);

  // Position: imperative, no state.
  useEffect(() => {
    if (!content) return;
    const node = rootRef.current;
    if (node) {
      const { x, y } = worldStore.getState().pointer;
      node.style.transform = `translate3d(${x + 16}px, ${y + 16}px, 0)`;
    }
    const onMove = (event: PointerEvent) => {
      const el = rootRef.current;
      if (!el) return;
      el.style.transform = `translate3d(${event.clientX + 16}px, ${event.clientY + 16}px, 0)`;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [content]);

  // Live value: imperative rAF, reading the store by reference.
  useEffect(() => {
    if (!content) return;
    let raf = 0;
    const source = content.rttKeySource;

    const tick = () => {
      const el = valueRef.current;
      if (el) {
        const now = Date.now();
        const pairs = latencyStore.getState().pairs;
        let rtt: number | undefined;

        if (source.kind === 'pair') {
          const pair = pairs.get(source.key);
          if (pair) rtt = interpolatedRtt(pair, now);
        } else {
          // Aggregate: best (lowest) RTT touching this entity.
          for (const pair of pairs.values()) {
            const matches =
              source.kind === 'exchange' ? pair.fromId === source.id : pair.toId === source.id;
            if (!matches) continue;
            const value = interpolatedRtt(pair, now);
            if (rtt === undefined || value < rtt) rtt = value;
          }
        }

        if (rtt === undefined) {
          el.textContent = '—';
          el.dataset.band = 'none';
        } else {
          el.textContent = `${rtt.toFixed(1)} ms`;
          el.dataset.band = latencyBand(rtt);
        }
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [content]);

  if (!content) return null;

  return (
    <div ref={rootRef} className="tooltip" role="status" aria-live="polite">
      <div className="tooltip__title">{content.title}</div>
      <div className="tooltip__subtitle">{content.subtitle}</div>
      <div className="tooltip__metric">
        <span className="tooltip__metric-label">{content.metricLabel}</span>
        <span ref={valueRef} className="tooltip__metric-value" data-band="none">
          —
        </span>
      </div>
    </div>
  );
}