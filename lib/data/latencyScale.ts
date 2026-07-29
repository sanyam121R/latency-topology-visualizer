import type { LatencyBand } from '@/types/domain';
/** Single source of truth for latency -> band -> color. */
export const LATENCY_THRESHOLDS = { good: 40, fair: 100, poor: 200 } as const;
export function latencyBand(rttMs: number): LatencyBand {
  if (rttMs <= LATENCY_THRESHOLDS.good) return 'good';
  if (rttMs <= LATENCY_THRESHOLDS.fair) return 'fair';
  if (rttMs <= LATENCY_THRESHOLDS.poor) return 'poor';
  return 'critical';
}
/** Hex colors, tuned for a pure-black background. */
export const BAND_COLORS: Record<LatencyBand, number> = {
  good: 0x4ade80, fair: 0xfacc15, poor: 0xfb923c, critical: 0xf87171,
};
export function latencyNorm(rttMs: number, max = 300): number {
  return Math.min(1, Math.max(0, rttMs / max));
}

/** Ordered bands, best -> worst. Drives band grouping and legend order. */
export const BANDS = ['good', 'fair', 'poor', 'critical'] as const;

/**
 * Line width per band, in world units (LineMaterial `worldUnits: true`).
 * Worse latency = thicker, so problems are visible without reading the legend.
 */
export const BAND_WIDTHS: Record<LatencyBand, number> = {
  good: 0.0035,
  fair: 0.005,
  poor: 0.0075,
  critical: 0.011,
};

export const BAND_OPACITY: Record<LatencyBand, number> = {
  good: 0.45,
  fair: 0.6,
  poor: 0.8,
  critical: 0.95,
};

/** Gradient stops as normalized [0..1] position + linear RGB triples. */
const STOPS: ReadonlyArray<{ at: number; rgb: readonly [number, number, number] }> = [
  { at: 0.0, rgb: [0.29, 0.87, 0.50] }, // green
  { at: 0.33, rgb: [0.98, 0.80, 0.08] }, // yellow
  { at: 0.66, rgb: [0.98, 0.57, 0.24] }, // orange
  { at: 1.0, rgb: [0.97, 0.44, 0.44] }, // red
];

/**
 * CONTINUOUS color for an RTT value, written into `out` at `offset`.
 *
 * Deliberately continuous rather than band-quantized: bands drive *width*
 * (discrete, rarely changes, cheap to repack) while color varies smoothly so
 * interpolated values between poll ticks read as motion, not stepping.
 */
export function writeColorForRtt(
  rttMs: number,
  out: Float32Array,
  offset: number,
  max = 300,
): void {
  const x = latencyNorm(rttMs, max);
  let i = 0;
  while (i < STOPS.length - 2 && x > STOPS[i + 1]!.at) i++;
  const a = STOPS[i]!;
  const b = STOPS[i + 1]!;
  const span = b.at - a.at;
  const t = span <= 0 ? 0 : Math.min(1, Math.max(0, (x - a.at) / span));
  out[offset] = a.rgb[0] + (b.rgb[0] - a.rgb[0]) * t;
  out[offset + 1] = a.rgb[1] + (b.rgb[1] - a.rgb[1]) * t;
  out[offset + 2] = a.rgb[2] + (b.rgb[2] - a.rgb[2]) * t;
}