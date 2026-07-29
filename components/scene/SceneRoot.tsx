'use client';

import { JSX, useMemo } from 'react';
import { createSyntheticLatencySource } from '@/lib/data/latencySource';
import { useLatencyStream } from '@/lib/hooks/useLatencyStream';
import { useRouteSnapshot } from '@/lib/hooks/useRouteSnapshot';
import { useDockOpen } from '@/lib/store/useWorldStore';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { GlobeStage } from '@/components/layout/GlobeStage';
import { Scene } from './Scene';
import { TopStrip } from '@/components/ui/TopStrip';
import { LeftRail, SummaryModule } from '@/components/ui/rails/LeftRail';
import { RightRail } from '@/components/ui/rails/RightRail';
import { DataDock } from '@/components/ui/dock/DataDock';
import { TooltipPortal } from '@/components/ui/TooltipPortal';
import { LatencyLegend } from '@/components/ui/LatencyLegend';

/**
 * Dashboard root.
 *
 * CRITICAL STRUCTURAL RULE: this component re-renders whenever a snapshot is
 * rebuilt (~0.14Hz, plus filter changes). <Scene /> is therefore memoised so
 * the Canvas subtree is never re-rendered by dashboard churn. All filter and
 * selection state lives in worldStore — never in React state above the Canvas.
 */
export function SceneRoot(): JSX.Element {
  const source = useMemo(() => createSyntheticLatencySource(), []);
  useLatencyStream(source, { intervalMs: 7000 });

  const snapshot = useRouteSnapshot();
  const dockOpen = useDockOpen();

  // Mounted once, referentially stable forever.
  const scene = useMemo(() => <Scene />, []);

  return (
    <DashboardShell
      dockOpen={dockOpen}
      top={<TopStrip snapshot={snapshot} />}
      left={
        <>
          <LeftRail snapshot={snapshot} />
          <SummaryModule snapshot={snapshot} />
        </>
      }
      center={
        <GlobeStage overlays={<><LatencyLegend /><StageReadout /><TooltipPortal /></>}>
          {scene}
        </GlobeStage>
      }
      right={<RightRail snapshot={snapshot} />}
      dock={<DataDock snapshot={snapshot} />}
    />
  );
}

/** Small corner annotation inside the stage — orientation + projection note. */
function StageReadout(): JSX.Element {
  return (
    <div className="stage__readout">
      <span>ORTHO · WGS84</span>
      <span className="stage__readout-dim">GREAT-CIRCLE LINKS</span>
    </div>
  );
}

export { SceneRoot as DashboardRoot };