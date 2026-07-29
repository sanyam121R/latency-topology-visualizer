'use client';

import { JSX, useCallback, useMemo } from 'react';
import { Panel, Readout } from '@/components/layout/Panel';
import { Sparkline } from '@/components/ui/Sparkline';
import { LiveValue } from '@/components/ui/LiveValue';
import { EXCHANGES_BY_ID } from '@/lib/data/exchanges';
import { REGIONS_BY_ID } from '@/lib/data/regions';
import { parsePairKey } from '@/lib/data/keys';
import { BAND_COLORS, BANDS, latencyBand } from '@/lib/data/latencyScale';
import { getHistory, interpolatedRtt, latencyStore, useLatencyMeta } from '@/lib/store/useLatencyStore';
import { useHovered, useSelected, worldStore } from '@/lib/store/useWorldStore';
import type { RouteSnapshot, RouteRow } from '@/lib/scene/routeSnapshot';
import type { PairKey } from '@/types/domain';

export function RightRail({ snapshot }: { snapshot: RouteSnapshot }): JSX.Element {
  return (
    <>
      <SelectedRouteModule snapshot={snapshot} />
      <WorstRoutesModule snapshot={snapshot} />
      <BandBreakdownModule snapshot={snapshot} />
    </>
  );
}

/* ------------------------------------------------------------------ */

/**
 * Resolves the "focused" route: an explicit selection wins, otherwise whatever
 * is hovered. That means the panel previews on hover and pins on click, which
 * is the interaction you want when scrubbing across a dense globe.
 */
function useFocusedPairKey(): PairKey | null {
  const selected = useSelected();
  const hovered = useHovered();
  const target = selected ?? hovered;
  if (target?.kind === 'arc') return target.key;
  return null;
}

function SelectedRouteModule({ snapshot }: { snapshot: RouteSnapshot }): JSX.Element {
  const key = useFocusedPairKey();
  const { lastUpdatedAt } = useLatencyMeta();
  const selected = useSelected();

  const row = useMemo<RouteRow | undefined>(
    () => (key ? snapshot.rows.find((r) => r.key === key) : undefined),
    [key, snapshot],
  );

  // History snapshot is taken at batch boundaries, never per frame.
  const history = useMemo(
    () => (key ? getHistory(key) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, lastUpdatedAt],
  );

  // Live RTT is read by reference in a rAF loop, so the number ticks smoothly
  // between batches without re-rendering this panel.
  const readRtt = useCallback(() => {
    if (!key) return undefined;
    const pair = latencyStore.getState().pairs.get(key);
    return pair ? interpolatedRtt(pair, Date.now()) : undefined;
  }, [key]);

  if (!key || !row) {
    return (
      <Panel label="Selected Route">
        <div className="empty">
          HOVER OR CLICK AN ARC
          <span className="empty__sub">route telemetry appears here</span>
        </div>
      </Panel>
    );
  }

  const { fromId, toId } = parsePairKey(key);
  const exchange = EXCHANGES_BY_ID.get(fromId);
  const region = REGIONS_BY_ID.get(toId);

  return (
    <Panel
      label="Selected Route"
      meta={
        selected ? (
          <button
            type="button"
            className="btn btn--ghost btn--xs"
            onClick={() => worldStore.getState().setSelected(null)}
          >
            UNPIN
          </button>
        ) : (
          'PREVIEW'
        )
      }
    >
      <div className="route">
        <div className="route__endpoint">
          <span className="route__code num">{exchange?.code}</span>
          <span className="route__name">{exchange?.name}</span>
          <span className="route__sub">{exchange?.city}</span>
        </div>
        <div className="route__arrow" aria-hidden>→</div>
        <div className="route__endpoint route__endpoint--right">
          <span className="route__code num">{region?.code}</span>
          <span className="route__name">{region?.provider.toUpperCase()}</span>
          <span className="route__sub">{region?.city}</span>
        </div>
      </div>

      <div className="bigvalue">
        <LiveValue
          className="bigvalue__num num"
          read={readRtt}
          format={(v) => v.toFixed(1)}
          bandOf={(v) => latencyBand(v)}
        />
        <span className="bigvalue__unit">ms RTT</span>
      </div>

      <Sparkline samples={history} />

      <div className="grid2">
        <Readout label="MEAN" value={`${row.meanMs.toFixed(1)} ms`} />
        <Readout label="JITTER" value={`${row.jitterMs.toFixed(1)} ms`} />
        <Readout label="DIST" value={`${Math.round(row.distanceKm).toLocaleString()} km`} />
        <Readout label="SAMPLES" value={history.length} />
      </div>
    </Panel>
  );
}

function WorstRoutesModule({ snapshot }: { snapshot: RouteSnapshot }): JSX.Element {
  const worst = useMemo(
    () => [...snapshot.visibleRows].sort((a, b) => b.rttMs - a.rttMs).slice(0, 6),
    [snapshot],
  );
  const max = worst[0]?.rttMs ?? 1;

  return (
    <Panel label="Worst Visible" meta={`TOP ${worst.length}`}>
      {worst.length === 0 ? (
        <div className="empty empty--sm">NO VISIBLE ROUTES</div>
      ) : (
        worst.map((row) => (
          <button
            key={row.key}
            type="button"
            className="worst"
            onClick={() =>
              worldStore.getState().setSelected({
                kind: 'arc', key: row.key, pairIndex: row.pairIndex, band: row.band,
              })
            }
          >
            <span className="worst__label num">
              {row.exchangeCode}<span className="worst__arrow">→</span>{row.regionCode}
            </span>
            <span className="worst__bar">
              <span
                className="worst__fill"
                style={{
                  width: `${(row.rttMs / max) * 100}%`,
                  background: `#${BAND_COLORS[row.band].toString(16).padStart(6, '0')}`,
                }}
              />
            </span>
            <span className="worst__value num">{row.rttMs.toFixed(0)}</span>
          </button>
        ))
      )}
    </Panel>
  );
}

function BandBreakdownModule({ snapshot }: { snapshot: RouteSnapshot }): JSX.Element {
  const total = Math.max(1, snapshot.counts.visible);
  return (
    <Panel label="Band Distribution" meta={`${snapshot.counts.visible} VIS`}>
      <div className="stackbar">
        {BANDS.map((band) => {
          const n = snapshot.byBand[band];
          if (n === 0) return null;
          return (
            <span
              key={band}
              className="stackbar__seg"
              style={{
                width: `${(n / total) * 100}%`,
                background: `#${BAND_COLORS[band].toString(16).padStart(6, '0')}`,
              }}
              title={`${band}: ${n}`}
            />
          );
        })}
      </div>
      <div className="grid2 grid2--tight">
        {BANDS.map((band) => (
          <Readout
            key={band}
            label={band.toUpperCase()}
            value={`${snapshot.byBand[band]} · ${Math.round((snapshot.byBand[band] / total) * 100)}%`}
          />
        ))}
      </div>
    </Panel>
  );
}