'use client';

import { JSX, useCallback } from 'react';
import { BAND_COLORS } from '@/lib/data/latencyScale';
import { useSelected, useSort, worldStore } from '@/lib/store/useWorldStore';
import type { RouteSnapshot, RouteRow } from '@/lib/scene/routeSnapshot';
import type { RouteSortKey } from '@/types/domain';

/**
 * Dense route table.
 *
 * Renders from the snapshot only, so it updates at batch/filter boundaries
 * (~0.14Hz) rather than per frame. Selection is shared state with the globe:
 * clicking a row pins the same arc the 3D scene highlights, and vice versa.
 */
const COLUMNS: Array<{
  key: RouteSortKey | null; label: string; className?: string; sortable?: boolean;
}> = [
  { key: 'route', label: 'ROUTE', sortable: true },
  { key: 'provider', label: 'PROVIDER', sortable: true },
  { key: 'rtt', label: 'RTT', className: 'col--num', sortable: true },
  { key: 'band', label: 'BAND', sortable: true },
  { key: null, label: 'MEAN', className: 'col--num' },
  { key: 'jitter', label: 'JITTER', className: 'col--num', sortable: true },
  { key: 'distance', label: 'DISTANCE', className: 'col--num', sortable: true },
  { key: null, label: 'UPDATED', className: 'col--num' },
];

export function RouteTable({ snapshot }: { snapshot: RouteSnapshot }): JSX.Element {
  const { key: sortKey, dir } = useSort();
  const selected = useSelected();
  const selectedKey = selected?.kind === 'arc' ? selected.key : null;

  const onRowClick = useCallback((row: RouteRow) => {
    const store = worldStore.getState();
    const current = store.selected;
    // Click the pinned row again to unpin — the table is also a deselect path.
    if (current?.kind === 'arc' && current.key === row.key) store.setSelected(null);
    else store.setSelected({ kind: 'arc', key: row.key, pairIndex: row.pairIndex, band: row.band });
  }, []);

  if (snapshot.visibleRows.length === 0) {
    return (
      <div className="empty">
        NO ROUTES MATCH CURRENT FILTERS
        <span className="empty__sub">adjust providers, bands or exchange selection</span>
        <button
          type="button"
          className="btn"
          onClick={() => worldStore.getState().resetFilters()}
        >
          RESET FILTERS
        </button>
      </div>
    );
  }

  return (
    <div className="tablewrap">
      <table className="table">
        <thead>
          <tr>
            {COLUMNS.map((col) => (
              <th
                key={col.label}
                className={`${col.className ?? ''}${col.sortable ? ' is-sortable' : ''}${
                  col.key && col.key === sortKey ? ' is-sorted' : ''
                }`}
                onClick={col.sortable && col.key ? () => worldStore.getState().setSort(col.key as RouteSortKey) : undefined}
                aria-sort={col.key === sortKey ? (dir === 'asc' ? 'ascending' : 'descending') : undefined}
              >
                {col.label}
                {col.key === sortKey ? <span className="table__caret">{dir === 'asc' ? '▲' : '▼'}</span> : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {snapshot.visibleRows.map((row) => (
            <tr
              key={row.key}
              className={selectedKey === row.key ? 'is-selected' : undefined}
              onClick={() => onRowClick(row)}
            >
              <td className="col--route">
                <span className="num col--route-code">{row.exchangeCode}</span>
                <span className="col--route-arrow">→</span>
                <span className="num">{row.regionCode}</span>
              </td>
              <td><span className={`tag tag--${row.provider}`}>{row.provider.toUpperCase()}</span></td>
              <td className="col--num col--rtt num">{row.rttMs.toFixed(1)}</td>
              <td>
                <span className="bandcell">
                  <span
                    className="bandcell__dot"
                    style={{ background: `#${BAND_COLORS[row.band].toString(16).padStart(6, '0')}` }}
                  />
                  {row.band}
                </span>
              </td>
              <td className="col--num num dim">{row.meanMs.toFixed(1)}</td>
              <td className="col--num num dim">{row.jitterMs.toFixed(1)}</td>
              <td className="col--num num dim">{Math.round(row.distanceKm).toLocaleString()}</td>
              <td className="col--num num dim">{ageLabel(row.sampledAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ageLabel(t: number): string {
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  return s < 60 ? `${s}s` : `${Math.round(s / 60)}m`;
}