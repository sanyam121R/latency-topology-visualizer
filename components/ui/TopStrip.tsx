'use client';

import { JSX, useEffect, useRef } from 'react';
import { useLatencyMeta } from '@/lib/store/useLatencyStore';
import { useSelected, worldStore } from '@/lib/store/useWorldStore';
import { EXCHANGES_BY_ID } from '@/lib/data/exchanges';
import { REGIONS_BY_ID } from '@/lib/data/regions';
import { parsePairKey } from '@/lib/data/keys';
import type { RouteSnapshot } from '@/lib/scene/routeSnapshot';

/**
 * Compact top telemetry strip.
 *
 * COUNT SEMANTICS (this was wrong before — it showed ingested and called it
 * what you were looking at):
 *   INGEST  — pairs the store has received from the source
 *   LINKS   — pairs the current view strategy can draw
 *   VISIBLE — pairs passing the filters right now
 *
 * These read from the SNAPSHOT, not from the scene. The arc layer also
 * publishes its own counts (worldStore.stats) and a test asserts the two agree,
 * but the DOM must not depend on WebGL having initialised — otherwise a failed
 * canvas shows "0 visible" next to a table full of rows.
 */
export function TopStrip({ snapshot }: { snapshot: RouteSnapshot }): JSX.Element {
  const { status, lastError, lastUpdatedAt, pairCount: ingested } = useLatencyMeta();
  const selected = useSelected();
  const ageRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const tick = () => {
      const el = ageRef.current;
      if (!el) return;
      el.textContent =
        lastUpdatedAt === null
          ? '--'
          : `${Math.max(0, Math.round((Date.now() - lastUpdatedAt) / 1000))}s`;
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [lastUpdatedAt]);

  let selectedLabel: string | null = null;
  if (selected?.kind === 'arc') {
    const { fromId, toId } = parsePairKey(selected.key);
    const ex = EXCHANGES_BY_ID.get(fromId);
    const rg = REGIONS_BY_ID.get(toId);
    if (ex && rg) selectedLabel = `${ex.code} → ${rg.code}`;
  } else if (selected?.kind === 'exchange') {
    selectedLabel = EXCHANGES_BY_ID.get(selected.id)?.name ?? null;
  } else if (selected?.kind === 'region') {
    const rg = REGIONS_BY_ID.get(selected.id);
    selectedLabel = rg ? `${rg.provider.toUpperCase()} ${rg.code}` : null;
  }

  return (
    <div className="topstrip">
      <div className="topstrip__brand">
        <span className="topstrip__mark">LTV</span>
        <span className="topstrip__name">Latency Topology Visualizer</span>
      </div>

      <div className="topstrip__divider" />

      <div className="topstrip__group">
        <span className={`dot dot--${status}`} />
        <span className="topstrip__status">{status}</span>
        <span className="topstrip__age num" ref={ageRef}>--</span>
      </div>

      <div className="topstrip__divider" />

      <div className="topstrip__metrics">
        <Metric label="INGEST" value={ingested} />
        <Metric label="LINKS" value={snapshot.counts.drawable} />
        <Metric label="VISIBLE" value={snapshot.counts.visible} accent />
        <Metric label="P50" value={snapshot.stats ? `${snapshot.stats.p50.toFixed(0)}ms` : '--'} />
        <Metric label="P99" value={snapshot.stats ? `${snapshot.stats.p99.toFixed(0)}ms` : '--'} />
      </div>

      <div className="topstrip__spacer" />

      {selectedLabel ? (
        <div className="topstrip__selected">
          <span className="topstrip__selected-label">SELECTED</span>
          <span className="topstrip__selected-value num">{selectedLabel}</span>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => worldStore.getState().setSelected(null)}
            aria-label="Clear selection"
          >
            ✕
          </button>
        </div>
      ) : null}

      {lastError ? <span className="topstrip__error">{lastError}</span> : null}
    </div>
  );
}

function Metric({
  label, value, accent,
}: { label: string; value: string | number; accent?: boolean }): JSX.Element {
  return (
    <div className="metric">
      <span className="metric__label">{label}</span>
      <span className={`metric__value num${accent ? ' metric__value--accent' : ''}`}>{value}</span>
    </div>
  );
}