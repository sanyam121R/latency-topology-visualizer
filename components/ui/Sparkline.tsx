'use client';

import { JSX, useEffect, useRef } from 'react';
import { BAND_COLORS, latencyBand } from '@/lib/data/latencyScale';
import type { LatencySample } from '@/types/domain';

/**
 * Canvas sparkline over the retained history window.
 *
 * Canvas rather than SVG: no DOM nodes per point, and redraw is a single
 * imperative call. Redraws only when `samples` identity changes — i.e. at
 * snapshot boundaries, not per frame.
 */
export interface SparklineProps {
  samples: readonly LatencySample[];
  width?: number;
  height?: number;
}

export function Sparkline({ samples, width = 268, height = 44 }: SparklineProps): JSX.Element {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(2, typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    if (samples.length < 2) {
      ctx.fillStyle = 'rgba(232,237,242,0.25)';
      ctx.font = '10px ui-monospace, monospace';
      ctx.fillText('awaiting history…', 4, height / 2 + 3);
      return;
    }

    let min = Infinity;
    let max = -Infinity;
    for (const s of samples) {
      if (s.rttMs < min) min = s.rttMs;
      if (s.rttMs > max) max = s.rttMs;
    }
    // Pad a flat series so it draws as a centred line instead of a div-by-zero.
    if (max - min < 1e-6) { min -= 1; max += 1; }

    const pad = 3;
    const x = (i: number) => (i / (samples.length - 1)) * (width - pad * 2) + pad;
    const y = (v: number) => height - pad - ((v - min) / (max - min)) * (height - pad * 2);

    // Baseline grid
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 2; i++) {
      const gy = pad + (i / 2) * (height - pad * 2);
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(width, gy); ctx.stroke();
    }

    // Area fill
    ctx.beginPath();
    ctx.moveTo(x(0), height - pad);
    samples.forEach((s, i) => ctx.lineTo(x(i), y(s.rttMs)));
    ctx.lineTo(x(samples.length - 1), height - pad);
    ctx.closePath();
    ctx.fillStyle = 'rgba(34,211,238,0.10)';
    ctx.fill();

    // Trace
    ctx.beginPath();
    samples.forEach((s, i) => (i ? ctx.lineTo(x(i), y(s.rttMs)) : ctx.moveTo(x(i), y(s.rttMs))));
    ctx.strokeStyle = 'rgba(34,211,238,0.85)';
    ctx.lineWidth = 1.25;
    ctx.stroke();

    // Latest point, coloured by band — the one place band colour is allowed here.
    const last = samples[samples.length - 1]!;
    const colour = BAND_COLORS[latencyBand(last.rttMs)].toString(16).padStart(6, '0');
    ctx.beginPath();
    ctx.arc(x(samples.length - 1), y(last.rttMs), 2.4, 0, Math.PI * 2);
    ctx.fillStyle = `#${colour}`;
    ctx.fill();
  }, [samples, width, height]);

  return <canvas ref={ref} style={{ width, height, display: 'block' }} />;
}