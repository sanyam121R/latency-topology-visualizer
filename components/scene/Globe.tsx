'use client';

import { JSX, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferAttribute, BufferGeometry, LineSegments, Vector3 } from 'three';
import * as topojson from 'topojson-client';
import landTopology from 'world-atlas/land-110m.json';
import { buildGraticule, buildLandSegments } from '@/lib/geo/landmass';
import { LAND_DOTS } from '@/lib/geo/landDots.generated';
import { GLOBE_RADIUS, latLngToVector3 } from '@/lib/geo/projection';
import { worldStore } from '@/lib/store/useWorldStore';

/**
 * STATIC scene geometry. Renders once; never re-renders.
 *
 * Four layers, back to front:
 *   1. Opaque black sphere — occludes the far hemisphere. Without it the globe
 *      reads as a flat tangle of lines.
 *   2. Graticule — dim lat/lng grid, depth cue while orbiting.
 *   3. Land dot-matrix — the dominant landmass treatment. Precomputed offline
 *      (scripts/generateLandDots.ts), so there is no point-in-polygon cost at
 *      runtime. This replaced bare coastlines because outlines alone read far
 *      too faint against black at dashboard scale.
 *   4. Coastline outlines — kept, but dimmed, to keep continents legible where
 *      the dot grid is sparse (islands, narrow peninsulas).
 *
 * Layer visibility is driven by the filter store via useFrame, not props, so
 * toggling a layer never re-renders this component.
 */
export function Globe(): JSX.Element {
  const graticuleRef = useRef<LineSegments>(null);

  const landGeometry = useMemo(() => {
    const topo = landTopology as unknown as Parameters<typeof topojson.feature>[0];
    const land = topojson.feature(
      topo,
      (topo as never as { objects: { land: never } }).objects.land,
    );
    const geometry = new BufferGeometry();
    geometry.setAttribute(
      'position',
      new BufferAttribute(buildLandSegments(land, { altitude: 0.002, maxSegmentRad: 0.02 }), 3),
    );
    return geometry;
  }, []);

  const graticuleGeometry = useMemo(() => {
    const geometry = new BufferGeometry();
    geometry.setAttribute(
      'position',
      new BufferAttribute(buildGraticule(15, { altitude: 0.0012 }), 3),
    );
    return geometry;
  }, []);

  /** Dot matrix: lat/lng pairs -> sphere positions, once. */
  const dotGeometry = useMemo(() => {
    const count = LAND_DOTS.length / 2;
    const positions = new Float32Array(count * 3);
    const v = new Vector3();
    for (let i = 0; i < count; i++) {
      latLngToVector3({ lat: LAND_DOTS[i * 2]!, lng: LAND_DOTS[i * 2 + 1]! }, 0.004, v);
      positions[i * 3] = v.x;
      positions[i * 3 + 1] = v.y;
      positions[i * 3 + 2] = v.z;
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    return geometry;
  }, []);

  // Explicit disposal — required now that the stage can be torn down.
  useEffect(
    () => () => {
      landGeometry.dispose();
      graticuleGeometry.dispose();
      dotGeometry.dispose();
    },
    [landGeometry, graticuleGeometry, dotGeometry],
  );

  useFrame(() => {
    const grat = graticuleRef.current;
    if (grat) grat.visible = worldStore.getState().showGraticule;
  });

  return (
    <group>
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS * 0.998, 64, 48]} />
        <meshBasicMaterial color="#000000" />
      </mesh>

      <lineSegments ref={graticuleRef} geometry={graticuleGeometry}>
        <lineBasicMaterial color="#2BD4E8" transparent opacity={0.1} depthWrite={false} />
      </lineSegments>

      <points geometry={dotGeometry}>
        <pointsMaterial
          color="#ffffff"
          size={0.0072}
          sizeAttenuation
          transparent
          opacity={0.62}
          depthWrite={false}
        />
      </points>

      <lineSegments geometry={landGeometry}>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.16} depthWrite={false} />
      </lineSegments>
    </group>
  );
}