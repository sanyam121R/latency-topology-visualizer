'use client';

import { BANDS, BAND_COLORS, LATENCY_THRESHOLDS } from '@/lib/data/latencyScale';
import type { LatencyBand } from '@/types/domain';
import { JSX } from 'react';

const LABELS: Record<LatencyBand, string> = {
  good: `≤ ${LATENCY_THRESHOLDS.good} ms`,
  fair: `≤ ${LATENCY_THRESHOLDS.fair} ms`,
  poor: `≤ ${LATENCY_THRESHOLDS.poor} ms`,
  critical: `> ${LATENCY_THRESHOLDS.poor} ms`,
};

/** Pure static render. Reads the same constants the shader colours come from. */
export function LatencyLegend(): JSX.Element {
  return (
    <div className="legend">
      <div className="legend__title">Round-trip latency</div>
      {BANDS.map((band) => (
        <div key={band} className="legend__row">
          <span
            className="legend__swatch"
            style={{
              background: `#${BAND_COLORS[band].toString(16).padStart(6, '0')}`,
              height: 1 + BANDS.indexOf(band) * 1.5,
            }}
          />
          <span className="legend__band">{band}</span>
          <span className="legend__value">{LABELS[band]}</span>
        </div>
      ))}
    </div>
  );
}