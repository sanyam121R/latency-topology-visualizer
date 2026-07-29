'use client';

import { JSX, useCallback, useEffect, useMemo } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { AdditiveBlending } from 'three';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import type { PairKey } from '@/types/domain';

import { BANDS, BAND_OPACITY, BAND_WIDTHS } from '@/lib/data/latencyScale';
import { buildVisualPairs, type PairStrategy } from '@/lib/data/pairs';
import { ArcBatch } from '@/lib/scene/arcBatch';
import { interpolatedRtt, latencyStore } from '@/lib/store/useLatencyStore';
import { getFilters, worldStore } from '@/lib/store/useWorldStore';

/**
 * LATENCY ARCS — the only component that updates every frame.
 *
 * RENDERING CHOICE: core WebGL ignores `linewidth` on LineBasicMaterial, so
 * variable-width lines require the Line2 family (instanced quads expanded in a
 * vertex shader). Width is a material uniform, not a vertex attribute, so pairs
 * are grouped into one LineSegments2 per latency band — 4 draw calls total.
 *
 * ZERO-ALLOCATION UPDATE PATH: LineSegmentsGeometry.setPositions/setColors
 * retain the Float32Array we hand them (stride 6 = xyz,xyz / rgb,rgb), which is
 * exactly ArcBatch's layout. So we bind each band's full-size buffers ONCE and
 * thereafter only:
 *    - mutate the arrays in place (ArcBatch.sync)
 *    - flip needsUpdate
 *    - set geometry.instanceCount to the occupied segment count
 * No buffer is ever reallocated, not even when a pair changes band.
 *
 * This component renders once. Everything after that is buffer writes.
 */
/** Pointer hit radius for arcs, in world units (globe radius = 1). */
const PICK_TOLERANCE = 0.012;

export interface LatencyArcsProps {
  strategy?: PairStrategy;
}

export function LatencyArcs({
  strategy = 'nearest-per-provider',
}: LatencyArcsProps): JSX.Element {
  const size = useThree((state) => state.size);

  const pairs = useMemo(() => buildVisualPairs(strategy), [strategy]);
  const batch = useMemo(() => new ArcBatch(pairs), [pairs]);

  /** One line object per band. Built once; buffers bound once. */
  const bands = useMemo(() => {
    return BANDS.map((band) => {
      const buffers = batch.getBuffers(band);
      const geometry = new LineSegmentsGeometry();
      // Bind the full-size arrays. instanceCount controls what actually draws.
      geometry.setPositions(buffers.positions);
      geometry.setColors(buffers.colors);
      geometry.instanceCount = 0;

      const material = new LineMaterial({
        vertexColors: true,
        worldUnits: true,
        linewidth: BAND_WIDTHS[band],
        transparent: true,
        opacity: BAND_OPACITY[band],
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      });

      const object = new LineSegments2(geometry, material);
      // Bounding sphere is computed from the full (partly zeroed) buffer, so
      // culling would be wrong. Arcs always hug the globe, so just disable it.
      object.frustumCulled = false;
      // Visible bands are far too thin to raycast; picking is handled by the
      // dedicated pick layer below. Opting out also keeps pointer moves cheap.
      object.raycast = () => {};
      return { band, geometry, material, object };
    });
  }, [batch]);

  /**
   * Invisible pick layer: all arcs, one fat line, generous hit radius.
   * `linewidth` here is a hit tolerance, not a visual.
   */
  const pick = useMemo(() => {
    const geometry = new LineSegmentsGeometry();
    geometry.setPositions(batch.pickPositions);
    geometry.instanceCount = batch.pickSegmentToPair.length;

    const material = new LineMaterial({
      worldUnits: true,
      linewidth: PICK_TOLERANCE * 2, // raycast hit radius = linewidth * 0.5
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: false,
    });

    const object = new LineSegments2(geometry, material);
    object.frustumCulled = false;
    // Draw nothing, but stay `visible` so the raycaster still considers it.
    object.renderOrder = -1;
    return { geometry, material, object };
  }, [batch]);

  // Dispose GPU resources when the pair set changes or we unmount.
  useEffect(() => {
    return () => {
      for (const b of bands) {
        b.geometry.dispose();
        b.material.dispose();
      }
      pick.geometry.dispose();
      pick.material.dispose();
    };
  }, [bands, pick]);

  // LineMaterial needs viewport resolution for its screen-space expansion.
  useEffect(() => {
    for (const b of bands) b.material.resolution.set(size.width, size.height);
    pick.material.resolution.set(size.width, size.height);
  }, [bands, pick, size]);

  /** Closure handed to ArcBatch: reads the store by reference, no subscription. */
  const readRtt = useCallback((key: PairKey): number | undefined => {
    const pair = latencyStore.getState().pairs.get(key);
    return pair ? interpolatedRtt(pair, Date.now()) : undefined;
  }, []);

  useFrame(() => {
    // Filters are read by reference every frame — never via a subscription, so
    // toggling a provider updates the globe without re-rendering this tree.
    const { membershipChanged, visible } = batch.sync(readRtt, getFilters());

    // Counts are published only when they change, so the topbar and rails
    // re-render at human speed rather than 60Hz.
    worldStore.getState().publishStats({
      ingested: latencyStore.getState().pairs.size,
      drawable: pairs.length,
      visible,
    });

    for (const { band, geometry } of bands) {
      const buffers = batch.getBuffers(band);
      geometry.instanceCount = buffers.segmentCount;
      if (buffers.segmentCount === 0) continue;

      if (membershipChanged) {
        const start = geometry.getAttribute('instanceStart');
        if ('data' in start) start.data.needsUpdate = true;
      }
      const colorStart = geometry.getAttribute('instanceColorStart');
      if ('data' in colorStart) colorStart.data.needsUpdate = true;
    }
  });

  const handleMove = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (event.faceIndex === undefined || event.faceIndex === null) return;
      const pairIndex = batch.resolvePickHit(event.faceIndex);
      if (pairIndex === undefined) return;
      const band = batch.getBand(pairIndex);
      if (!band) return;
      event.stopPropagation();
      const world = worldStore.getState();
      world.setPointer(event.nativeEvent.clientX, event.nativeEvent.clientY);
      world.setHovered({ kind: 'arc', key: pairs[pairIndex]!.key, pairIndex, band });
    },
    [batch, pairs],
  );

  const handleOut = useCallback(() => {
    worldStore.getState().setHovered(null);
  }, []);

  return (
    <group>
      {bands.map((b) => (
        <primitive key={b.band} object={b.object} />
      ))}
      <primitive object={pick.object} onPointerMove={handleMove} onPointerOut={handleOut} />
    </group>
  );
}