'use client';

import { JSX, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { GLOBE_RADIUS } from '@/lib/geo/projection';
import { Globe } from './Globe';
import { ExchangeMarkers } from './ExchangeMarkers';
import { CloudRegionMarkers } from './CloudRegionMarkers';
import { LatencyArcs } from './LatencyArcs';

/**
 * Canvas root. Deliberately thin: it owns camera, controls and the layer list,
 * and nothing else. It holds no state, so it never re-renders — which means the
 * whole 3D tree below it is mounted exactly once.
 *
 * Camera sits on +Z so the default view faces Greenwich (see projection.ts).
 */
export function Scene(): JSX.Element {
  return (
    <Canvas
      className="scene"
      camera={{ position: [0, 0.6, GLOBE_RADIUS * 2.8], fov: 42, near: 0.01, far: 100 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: false }}
      onCreated={({ gl, raycaster }) => {
        gl.setClearColor('#000000', 1);
        // Generous threshold for line picking; the pick layer also widens itself.
        raycaster.params.Line2 = { threshold: 0.01 };
      }}
    >
      {/* Materials are all MeshBasic/LineBasic, so no lights are needed.
          That's intentional: unlit rendering keeps the flat, graphic look and
          removes per-light shader cost. */}
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
        rotateSpeed={0.45}
        zoomSpeed={0.6}
        autoRotate
        minDistance={GLOBE_RADIUS * 1.25}
        maxDistance={GLOBE_RADIUS * 6}
      />
    </Canvas>
  );
}