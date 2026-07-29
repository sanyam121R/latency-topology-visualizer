'use client';

import { JSX, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { GLOBE_RADIUS } from '@/lib/geo/projection';
import { worldStore } from '@/lib/store/useWorldStore';
import { Globe } from './Globe';
import { ExchangeMarkers } from './ExchangeMarkers';
import { CloudRegionMarkers } from './CloudRegionMarkers';
import { LatencyArcs } from './LatencyArcs';

/**
 * Canvas root. Holds no state, so it never re-renders and the 3D tree below it
 * mounts exactly once.
 *
 * The Canvas now sizes to its parent (the stage) rather than the viewport.
 * R3F's ResizeObserver keeps the camera aspect, the raycaster projection and
 * LineMaterial.resolution correct across layout changes.
 */
export function Scene(): JSX.Element {
  return (
    <Canvas
      className="scene"
      camera={{ position: [0.35, 0.5, GLOBE_RADIUS * 2.65], fov: 40, near: 0.01, far: 100 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      // Clicking empty space clears the pin. This was the missing deselect path:
      // selection could previously be set but never cleared.
      onPointerMissed={() => worldStore.getState().setSelected(null)}
      onCreated={({ gl, raycaster }) => {
        gl.setClearColor('#000000', 0);
        // Added to LineSegments2's world-unit hit radius (linewidth + threshold).
        raycaster.params.Line2 = { threshold: 0.01 };
      }}
    >
      {/* Unlit materials throughout: no lights needed, which keeps the flat
          graphic look and removes per-light shader cost. */}
      <Suspense fallback={null}>
        <Globe />
        <CloudRegionMarkers />
        <ExchangeMarkers />
        <LatencyArcs strategy="nearest-per-provider" />
      </Suspense>

      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.42}
        zoomSpeed={0.55}
        minDistance={GLOBE_RADIUS * 1.25}
        maxDistance={GLOBE_RADIUS * 5}
        autoRotate
        autoRotateSpeed={0.18}
      />
    </Canvas>
  );
}