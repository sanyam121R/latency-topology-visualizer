'use client';

import type { JSX, ReactNode } from 'react';

/**
 * Fixed five-region frame: top strip, two narrow rails, centre stage, bottom dock.
 *
 * CSS grid rather than flex so the centre stage is the only region that flexes —
 * rails and strips have fixed track sizes, which keeps the globe the largest
 * element at every viewport and means a rail's content can never push the stage
 * around. The dock row collapses to a thin handle when closed.
 */
export interface DashboardShellProps {
  top: ReactNode;
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
  dock: ReactNode;
  dockOpen: boolean;
}

export function DashboardShell({
  top, left, center, right, dock, dockOpen,
}: DashboardShellProps): JSX.Element {
  return (
    <div className={`shell${dockOpen ? '' : ' shell--dock-closed'}`}>
      <div className="shell__top">{top}</div>
      <aside className="shell__left">{left}</aside>
      <main className="shell__center">{center}</main>
      <aside className="shell__right">{right}</aside>
      <div className="shell__dock">{dock}</div>
    </div>
  );
}