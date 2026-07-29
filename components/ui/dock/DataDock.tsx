'use client';

import { useDockOpen, useTableMode, worldStore } from '@/lib/store/useWorldStore';
import type { RouteSnapshot } from '@/lib/scene/routeSnapshot';
import type { TableMode } from '@/types/domain';
import { RouteTable } from './RouteTable';
import { JSX } from 'react';

const TABS: Array<{ mode: TableMode; label: string; enabled: boolean }> = [
  { mode: 'exchange-region', label: 'EXCHANGE ↔ REGION', enabled: true },
  { mode: 'exchange-exchange', label: 'EXCHANGE ↔ EXCHANGE', enabled: false },
  { mode: 'history', label: 'HISTORY', enabled: false },
];

/**
 * Bottom dock. The mode switch is real plumbing — rows come from a mode-keyed
 * branch rather than from which component happens to be mounted — but only
 * exchange↔region has data today. The other two render an explicit
 * "unavailable" state rather than a fake table.
 */
export function DataDock({ snapshot }: { snapshot: RouteSnapshot }): JSX.Element {
  const open = useDockOpen();
  const mode = useTableMode();

  return (
    <div className="dock">
      <div className="dock__bar">
        <div className="dock__tabs">
          {TABS.map((tab) => (
            <button
              key={tab.mode}
              type="button"
              className={`dock__tab${mode === tab.mode ? ' is-active' : ''}`}
              disabled={!tab.enabled}
              title={tab.enabled ? undefined : 'Requires the generalised node model'}
              onClick={() => worldStore.getState().setTableMode(tab.mode)}
            >
              {tab.label}
              {!tab.enabled ? <span className="dock__tab-lock">◦</span> : null}
            </button>
          ))}
        </div>

        <div className="dock__meta">
          <span className="num">{snapshot.visibleRows.length}</span>
          <span className="dock__meta-label">ROWS</span>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => worldStore.getState().setDockOpen(!open)}
            aria-label={open ? 'Collapse dock' : 'Expand dock'}
          >
            {open ? '▾' : '▴'}
          </button>
        </div>
      </div>

      {open ? (
        <div className="dock__body">
          {mode === 'exchange-region' ? (
            <RouteTable snapshot={snapshot} />
          ) : (
            <div className="empty">
              {mode === 'exchange-exchange' ? 'PEER-TO-PEER MODE UNAVAILABLE' : 'HISTORY MODE UNAVAILABLE'}
              <span className="empty__sub">
                {mode === 'exchange-exchange'
                  ? 'requires the generalised node model (LatencySample is typed exchange→region)'
                  : 'requires a time-range selector over the retained history buffer'}
              </span>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}