'use client';

import { JSX, useMemo } from 'react';
import { Panel, Readout } from '@/components/layout/Panel';
import { EXCHANGES } from '@/lib/data/exchanges';
import { BANDS, BAND_COLORS, LATENCY_THRESHOLDS } from '@/lib/data/latencyScale';
import { PROVIDERS } from '@/lib/data/regions';
import {
  useBandFilter, useExchangeIds, useExchangeQuery, useLayers,
  useProviders, useTableMode, worldStore,
} from '@/lib/store/useWorldStore';
import type { RouteSnapshot } from '@/lib/scene/routeSnapshot';
import type { LatencyBand } from '@/types/domain';

const PROVIDER_LABELS: Record<string, string> = { aws: 'AWS', gcp: 'GCP', azure: 'AZURE' };
const BAND_RANGE: Record<LatencyBand, string> = {
  good: `≤${LATENCY_THRESHOLDS.good}`,
  fair: `≤${LATENCY_THRESHOLDS.fair}`,
  poor: `≤${LATENCY_THRESHOLDS.poor}`,
  critical: `>${LATENCY_THRESHOLDS.poor}`,
};

export function LeftRail({ snapshot }: { snapshot: RouteSnapshot }): JSX.Element {
  return (
    <>
      <ViewModeModule />
      <ProviderModule snapshot={snapshot} />
      <BandModule snapshot={snapshot} />
      <LayerModule />
      <ExchangeModule />
    </>
  );
}

/* ------------------------------------------------------------------ */

function ViewModeModule(): JSX.Element {
  const mode = useTableMode();
  return (
    <Panel label="View Mode">
      <div className="seg">
        {([
          ['exchange-region', 'EX↔REGION', true],
          ['exchange-exchange', 'EX↔EX', false],
          ['history', 'HISTORY', false],
        ] as const).map(([value, label, enabled]) => (
          <button
            key={value}
            type="button"
            className={`seg__btn${mode === value ? ' is-active' : ''}`}
            disabled={!enabled}
            title={enabled ? undefined : 'Requires the generalised node model'}
            onClick={() => worldStore.getState().setTableMode(value)}
          >
            {label}
          </button>
        ))}
      </div>
    </Panel>
  );
}

function ProviderModule({ snapshot }: { snapshot: RouteSnapshot }): JSX.Element {
  const providers = useProviders();
  const max = Math.max(1, ...PROVIDERS.map((p) => snapshot.byProvider[p]));
  return (
    <Panel label="Providers" meta={`${PROVIDERS.filter((p) => providers[p]).length}/${PROVIDERS.length}`}>
      {PROVIDERS.map((provider) => {
        const count = snapshot.byProvider[provider];
        const on = providers[provider];
        return (
          <button
            key={provider}
            type="button"
            className={`filter-row${on ? ' is-on' : ''}`}
            onClick={() => worldStore.getState().toggleProvider(provider)}
            aria-pressed={on}
          >
            <span className="filter-row__box" />
            <span className="filter-row__name">{PROVIDER_LABELS[provider]}</span>
            <span className="filter-row__bar">
              <span
                className="filter-row__fill"
                style={{ width: `${(count / max) * 100}%` }}
              />
            </span>
            <span className="filter-row__count num">{count}</span>
          </button>
        );
      })}
    </Panel>
  );
}

function BandModule({ snapshot }: { snapshot: RouteSnapshot }): JSX.Element {
  const bands = useBandFilter();
  const max = Math.max(1, ...BANDS.map((b) => snapshot.byBand[b]));
  return (
    <Panel label="Latency Band" meta="RTT">
      {BANDS.map((band) => {
        const count = snapshot.byBand[band];
        const on = bands[band];
        const colour = `#${BAND_COLORS[band].toString(16).padStart(6, '0')}`;
        return (
          <button
            key={band}
            type="button"
            className={`filter-row${on ? ' is-on' : ''}`}
            onClick={() => worldStore.getState().toggleBand(band)}
            aria-pressed={on}
          >
            <span className="filter-row__box" />
            {/* Band swatch is the one place latency colour appears in chrome —
                it IS the legend, so the mapping stays trustworthy. */}
            <span className="filter-row__swatch" style={{ background: colour }} />
            <span className="filter-row__name">{band}</span>
            <span className="filter-row__range num">{BAND_RANGE[band]}</span>
            <span className="filter-row__bar">
              <span className="filter-row__fill" style={{ width: `${(count / max) * 100}%`, background: colour, opacity: 0.55 }} />
            </span>
            <span className="filter-row__count num">{count}</span>
          </button>
        );
      })}
    </Panel>
  );
}

function LayerModule(): JSX.Element {
  const layers = useLayers();
  const items: Array<[keyof typeof layers, string]> = [
    ['showArcs', 'Latency arcs'],
    ['showExchanges', 'Exchanges'],
    ['showRegions', 'Cloud regions'],
    ['showGraticule', 'Graticule'],
  ];
  return (
    <Panel label="Layers">
      {items.map(([key, label]) => (
        <button
          key={key}
          type="button"
          className={`filter-row${layers[key] ? ' is-on' : ''}`}
          onClick={() => worldStore.getState().setLayer(key, !layers[key])}
          aria-pressed={layers[key]}
        >
          <span className="filter-row__box" />
          <span className="filter-row__name">{label}</span>
        </button>
      ))}
    </Panel>
  );
}

function ExchangeModule(): JSX.Element {
  const query = useExchangeQuery();
  const selectedIds = useExchangeIds();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return EXCHANGES;
    return EXCHANGES.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.code.toLowerCase().includes(q) ||
        e.city.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <Panel
      label="Exchanges"
      grow
      meta={
        selectedIds ? (
          <button
            type="button"
            className="btn btn--ghost btn--xs"
            onClick={() => worldStore.getState().clearExchangeFilter()}
          >
            CLEAR {selectedIds.size}
          </button>
        ) : (
          `${EXCHANGES.length}`
        )
      }
    >
      <input
        className="input"
        placeholder="SEARCH…"
        value={query}
        onChange={(e) => worldStore.getState().setExchangeQuery(e.target.value)}
        spellCheck={false}
      />
      <div className="list">
        {filtered.map((exchange) => {
          const on = selectedIds === null || selectedIds.has(exchange.id);
          return (
            <button
              key={exchange.id}
              type="button"
              className={`list__row${on ? ' is-on' : ''}`}
              onClick={() => worldStore.getState().toggleExchange(exchange.id)}
              aria-pressed={on}
            >
              <span className="list__code num">{exchange.code}</span>
              <span className="list__name">{exchange.name}</span>
              <span className="list__sub">{exchange.city.split(',')[0]}</span>
            </button>
          );
        })}
        {filtered.length === 0 ? <div className="empty empty--sm">NO MATCH</div> : null}
      </div>
    </Panel>
  );
}

export function SummaryModule({ snapshot }: { snapshot: RouteSnapshot }): JSX.Element {
  const s = snapshot.stats;
  return (
    <Panel label="Visible Summary">
      <Readout label="ROUTES" value={snapshot.counts.visible} />
      <Readout label="BEST" value={s ? `${s.best.toFixed(1)} ms` : '--'} />
      <Readout label="MEDIAN" value={s ? `${s.p50.toFixed(1)} ms` : '--'} />
      <Readout label="WORST" value={s ? `${s.worst.toFixed(1)} ms` : '--'} />
    </Panel>
  );
}

export type { CloudProvider };