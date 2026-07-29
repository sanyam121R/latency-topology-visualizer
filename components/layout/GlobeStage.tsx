'use client';

import type { JSX, ReactNode } from 'react';

/**
 * The globe's container. The Canvas sizes to THIS element, not the viewport —
 * that's the change that makes the layout possible. R3F's ResizeObserver picks
 * up stage resizes and updates the camera, the raycaster's projection and
 * LineMaterial.resolution, so picking and line widths stay correct after layout
 * changes.
 *
 * Overlays (legend, hover tooltip, corner ticks, axis labels) are positioned
 * against the stage so they travel with it rather than with the window.
 */
export function GlobeStage({
  children,
  overlays,
}: {
  children: ReactNode;
  overlays?: ReactNode;
}): JSX.Element {
  return (
    <div className="stage">
      <div className="stage__grid" aria-hidden />
      <div className="stage__canvas">{children}</div>
      <div className="stage__frame" aria-hidden>
        <span className="tick tick--tl" /><span className="tick tick--tr" />
        <span className="tick tick--bl" /><span className="tick tick--br" />
      </div>
      {overlays}
    </div>
  );
}