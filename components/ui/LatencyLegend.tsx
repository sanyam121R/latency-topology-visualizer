'use client';

import { BANDS, BAND_COLORS, BAND_WIDTHS, LATENCY_THRESHOLDS } from '@/lib/data/latencyScale';
import type { LatencyBand } from '@/types/domain';
import { JSX } from 'react';

const LABELS: Record<LatencyBand, string> = {
  good: `≤ ${LATENCY_THRESHOLDS.good}`,
  fair: `≤ ${LATENCY_THRESHOLDS.fair}`,
  poor: `≤ ${LATENCY_THRESHOLDS.poor}`,
  critical: `> ${LATENCY_THRESHOLDS.poor}`,
};

/**
 * Stage legend. Swatch thickness mirrors the actual arc width per band, so the
 * legend explains both colour and weight encodings.
 */
export function LatencyLegend(): JSX.Element {
  return (
    <div className="legend">
      <div className="legend__title">RTT · MS</div>
      {BANDS.map((band) => (
        <div key={band} className="legend__row">
          <span className="legend__swatch-wrap">
            <span
              className="legend__swatch"
              style={{
                background: `#${BAND_COLORS[band].toString(16).padStart(6, '0')}`,
                height: Math.max(1, Math.round(BAND_WIDTHS[band] * 560)),
              }}
            />
          </span>
          <span className="legend__band">{band}</span>
          <span className="legend__value num">{LABELS[band]}</span>
        </div>
      ))}
    </div>
  );
}