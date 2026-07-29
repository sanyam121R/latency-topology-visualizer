'use client';

import { JSX, useMemo } from 'react';
import { BufferAttribute, BufferGeometry } from 'three';
import * as topojson from 'topojson-client';
import landTopology from 'world-atlas/land-110m.json';
import { buildGraticule, buildLandSegments } from '@/lib/geo/landmass';
import { GLOBE_RADIUS } from '@/lib/geo/projection';

/**
 * STATIC scene geometry. Renders exactly once and never re-renders: it holds no
 * state and takes no props that change. Keeping the globe inert is what lets
 * the real-time layers update without touching the rest of the tree.
 *
 * Three pieces:
 *   1. An opaque black sphere, slightly inside the line shells. Its only job is
 *      to occlude geometry on the far side of the globe — without it, back-face
 *      coastlines and arcs show through and the shape reads as flat.
 *   2. Coastlines as white LineSegments.
 *   3. A dim graticule for depth cues while orbiting.
 */

function useLineGeometry(build: () => Float32Array): BufferGeometry {
  return useMemo(() => {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(build(), 3));
    return geometry;
  }, [build]);
}

export function Globe(): JSX.Element {
  const landGeometry = useMemo(() => {
    const topo = landTopology as unknown as Parameters<typeof topojson.feature>[0];
    const land = topojson.feature(topo, (topo as never as { objects: { land: never } }).objects.land);
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

  return (
    <group>
      {/* Occluder. Radius just under the line shells so lines never z-fight. */}
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS * 0.999, 64, 48]} />
        <meshBasicMaterial color="#000000" />
      </mesh>

      {/* Graticule: dim, behind the coastlines in visual weight. */}
      <lineSegments geometry={graticuleGeometry}>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.08} depthWrite={false} />
      </lineSegments>

      {/* Coastlines: the focal element of the theme. */}
      <lineSegments geometry={landGeometry}>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.55} depthWrite={false} />
      </lineSegments>
    </group>
  );
}