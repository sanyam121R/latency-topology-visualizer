import type { LatencyBand, PairKey } from '@/types/domain';
import type { VisualPair } from '@/lib/data/pairs';
import { arcAltitudeFor, buildGreatCircleArc } from '@/lib/geo/projection';
import { BANDS, latencyBand, writeColorForRtt } from '@/lib/data/latencyScale';

/**
 * ArcBatch — the bridge between latency values and GPU buffers.
 *
 * WHY THIS SHAPE:
 *
 *  1. Arc POSITIONS never change. An arc depends only on two fixed geographic
 *     points, so every sample is computed exactly once at construction. Per
 *     tick we only touch colors and (rarely) band membership. This is the
 *     single biggest perf decision in the scene.
 *
 *  2. WIDTH is band-driven, and GPU line width requires a material uniform,
 *     not a vertex attribute. So pairs are grouped into one draw call per band
 *     (4 total). Membership changes only when a pair crosses a threshold, which
 *     is rare — so repacking is rare.
 *
 *  3. COLOR is continuous (not band-quantized) and rewritten every frame from
 *     interpolated RTT, into a preallocated buffer. No allocation in the loop.
 *
 *  4. No three.js imports beyond Vector3 math in projection: this class is
 *     pure buffer arithmetic and is unit-testable without a WebGL context.
 */

export const ARC_SEGMENTS = 48;

/** Points per arc. Segments + 1. */
export const ARC_POINTS = ARC_SEGMENTS + 1;

/** Reads the current (already interpolated) RTT for a pair, or undefined. */
export type RttReader = (key: PairKey) => number | undefined;

export interface BandBuffers {
  /** Flat [x1,y1,z1, x2,y2,z2, ...]; consecutive triples form one segment. */
  positions: Float32Array;
  /** Matching per-vertex colors, 3 floats per vertex. */
  colors: Float32Array;
  /** Number of segments currently occupied. */
  segmentCount: number;
  /** segmentIndex -> index into `pairs`. Used to resolve raycast faceIndex. */
  segmentToPair: Int32Array;
}

export interface SyncResult {
  /** True when any pair changed band; the component must re-upload positions. */
  membershipChanged: boolean;
  /** Pairs that currently have no sample yet. */
  missing: number;
}

export class ArcBatch {
  readonly pairs: readonly VisualPair[];
  /** Static sampled arc points: pairIndex * ARC_POINTS * 3. */
  readonly points: Float32Array;

   /**
   * All arcs packed as segments, in pair order. Static, built once.
   *
   * Used by the hover pick layer: the visible band lines have world-unit widths
   * of ~0.004, and LineSegments2's world-units raycast uses `linewidth * 0.5` as
   * its hit radius — about 0.002 world units, which is effectively impossible to
   * hit with a pointer. So picking gets its own invisible, deliberately fat line
   * object over this buffer, and the visible bands opt out of raycasting.
   */
   readonly pickPositions: Float32Array;
   /** segmentIndex -> pair index for `pickPositions`. */
   readonly pickSegmentToPair: Int32Array;
 
   private readonly buffers: Record<LatencyBand, BandBuffers>;
  /** Current band per pair; -1 = no data yet (not rendered). */
  private readonly bandOfPair: Int8Array;
  /** Latest RTT per pair, for tooltips and for color writes. */
  private readonly rttOfPair: Float32Array;

  constructor(pairs: readonly VisualPair[], segments = ARC_SEGMENTS) {
    this.pairs = pairs;
    const points = segments + 1;
    this.points = new Float32Array(pairs.length * points * 3);

    // Precompute every arc exactly once.
    pairs.forEach((p, i) => {
      buildGreatCircleArc(
        p.exchange.location,
        p.region.location,
        segments,
        arcAltitudeFor(p.exchange.location, p.region.location),
        this.points,
        i * points * 3,
      );
    });

    // Worst case: every pair lands in the same band, so each band buffer is
    // sized for all pairs. Cheap (tens of KB) and removes all reallocation.
    const maxSegments = pairs.length * segments;
    const mk = (): BandBuffers => ({
      positions: new Float32Array(maxSegments * 6),
      colors: new Float32Array(maxSegments * 6),
      segmentCount: 0,
      segmentToPair: new Int32Array(maxSegments).fill(-1),
    });
    this.buffers = { good: mk(), fair: mk(), poor: mk(), critical: mk() };
// Pick buffer: every arc, every segment, in pair order. Never changes.
this.pickPositions = new Float32Array(maxSegments * 6);
this.pickSegmentToPair = new Int32Array(maxSegments);
{
  let seg = 0;
  for (let i = 0; i < pairs.length; i++) {
    const base = i * points * 3;
    for (let s = 0; s < segments; s++) {
      const o = seg * 6;
      const a = base + s * 3;
      const b = a + 3;
      this.pickPositions[o] = this.points[a]!;
      this.pickPositions[o + 1] = this.points[a + 1]!;
      this.pickPositions[o + 2] = this.points[a + 2]!;
      this.pickPositions[o + 3] = this.points[b]!;
      this.pickPositions[o + 4] = this.points[b + 1]!;
      this.pickPositions[o + 5] = this.points[b + 2]!;
      this.pickSegmentToPair[seg] = i;
      seg++;
    }
  }
}
    this.bandOfPair = new Int8Array(pairs.length).fill(-1);
    this.rttOfPair = new Float32Array(pairs.length).fill(NaN);
    this.segments = segments;
  }

  readonly segments: number;

  getBuffers(band: LatencyBand): BandBuffers {
    return this.buffers[band];
  }

  /** Latest known RTT for a pair index, or undefined. */
  getRtt(pairIndex: number): number | undefined {
    const v = this.rttOfPair[pairIndex];
    return v === undefined || Number.isNaN(v) ? undefined : v;
  }

  getBand(pairIndex: number): LatencyBand | undefined {
    const b = this.bandOfPair[pairIndex];
    return b === undefined || b < 0 ? undefined : BANDS[b];
  }

 /**
   * Resolve a raycast hit on a band's line object back to a pair index.
   * `faceIndex` from LineSegments2 is the segment index.
   */
 resolveHit(band: LatencyBand, faceIndex: number): number | undefined {
  const buf = this.buffers[band];
  if (faceIndex < 0 || faceIndex >= buf.segmentCount) return undefined;
  const pairIndex = buf.segmentToPair[faceIndex];
  return pairIndex === undefined || pairIndex < 0 ? undefined : pairIndex;
}

/**
 * Resolve a raycast hit on the pick layer back to a pair index.
 * Returns undefined for arcs that currently have no data (not visible).
 */
resolvePickHit(faceIndex: number): number | undefined {
  if (faceIndex < 0 || faceIndex >= this.pickSegmentToPair.length) return undefined;
  const pairIndex = this.pickSegmentToPair[faceIndex];
  if (pairIndex === undefined) return undefined;
  // Don't report hits on arcs that aren't being drawn.
  return this.bandOfPair[pairIndex]! < 0 ? undefined : pairIndex;
}

  /**
   * Recompute colors (always) and band membership (when thresholds are crossed).
   * Call once per frame. Allocation-free.
   */
  sync(read: RttReader): SyncResult {
    const { pairs, points: pts, segments } = this;
    const pointsPerArc = segments + 1;

    // Pass 1: read values, detect band changes.
    let membershipChanged = false;
    let missing = 0;
    for (let i = 0; i < pairs.length; i++) {
      const rtt = read(pairs[i]!.key);
      if (rtt === undefined) {
        missing++;
        if (this.bandOfPair[i] !== -1) {
          this.bandOfPair[i] = -1;
          membershipChanged = true;
        }
        this.rttOfPair[i] = NaN;
        continue;
      }
      this.rttOfPair[i] = rtt;
      const bandIndex = BANDS.indexOf(latencyBand(rtt));
      if (this.bandOfPair[i] !== bandIndex) {
        this.bandOfPair[i] = bandIndex;
        membershipChanged = true;
      }
    }

    // Pass 2: repack positions only when membership actually moved.
    if (membershipChanged) {
      for (const band of BANDS) {
        this.buffers[band].segmentCount = 0;
        this.buffers[band].segmentToPair.fill(-1);
      }
      for (let i = 0; i < pairs.length; i++) {
        const bandIndex = this.bandOfPair[i]!;
        if (bandIndex < 0) continue;
        const buf = this.buffers[BANDS[bandIndex]!];
        const base = i * pointsPerArc * 3;
        for (let s = 0; s < segments; s++) {
          const o = buf.segmentCount * 6;
          const a = base + s * 3;
          const b = a + 3;
          buf.positions[o] = pts[a]!;
          buf.positions[o + 1] = pts[a + 1]!;
          buf.positions[o + 2] = pts[a + 2]!;
          buf.positions[o + 3] = pts[b]!;
          buf.positions[o + 4] = pts[b + 1]!;
          buf.positions[o + 5] = pts[b + 2]!;
          buf.segmentToPair[buf.segmentCount] = i;
          buf.segmentCount++;
        }
      }
    }

    // Pass 3: colors, every frame, straight into the existing buffers.
    for (const band of BANDS) {
      const buf = this.buffers[band];
      for (let s = 0; s < buf.segmentCount; s++) {
        const pairIndex = buf.segmentToPair[s]!;
        const rtt = this.rttOfPair[pairIndex]!;
        const o = s * 6;
        writeColorForRtt(rtt, buf.colors, o);
        // Both ends of the segment share the pair's colour.
        buf.colors[o + 3] = buf.colors[o]!;
        buf.colors[o + 4] = buf.colors[o + 1]!;
        buf.colors[o + 5] = buf.colors[o + 2]!;
      }
    }

    return { membershipChanged, missing };
  }
}