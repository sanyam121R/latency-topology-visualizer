'use client';

import { JSX, useMemo } from 'react';
import { createSyntheticLatencySource } from '@/lib/data/latencySource';
import { useLatencyStream } from '@/lib/hooks/useLatencyStream';
import { Scene } from './Scene';
import { TooltipPortal } from '@/components/ui/TooltipPortal';
import { StatusBar } from '@/components/ui/StatusBar';
import { LatencyLegend } from '@/components/ui/LatencyLegend';

/**
 * The single place the real-time stream is started, and the only component that
 * bridges the canvas and the DOM overlays.
 *
 * Swap `createSyntheticLatencySource()` for `createHttpLatencySource()` to poll
 * the /api/latency route instead. That is the whole migration.
 */
export function SceneRoot(): JSX.Element {
  const source = useMemo(() => createSyntheticLatencySource(), []);
  useLatencyStream(source, { intervalMs: 7000 });

  return (
    <div className="app">
      <Scene />
      <header className="app__header">
        <h1 className="app__title">Latency Topology Visualizer</h1>
        <StatusBar />
      </header>
      <LatencyLegend />
      <TooltipPortal />
    </div>
  );
}