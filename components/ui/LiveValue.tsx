'use client';

import { JSX, useEffect, useRef } from 'react';

/**
 * A number that updates every frame without re-rendering React.
 *
 * Same pattern the tooltip uses: React owns the element, a rAF loop owns its
 * textContent. Every continuously-changing readout in the dashboard goes
 * through this so no panel ever becomes a 60Hz render source.
 */
export interface LiveValueProps {
  /** Returns the current value, or undefined for "no data". */
  read: () => number | undefined;
  format?: (v: number) => string;
  /** Optional data-attribute for CSS (e.g. latency band colouring). */
  bandOf?: (v: number) => string;
  className?: string;
  placeholder?: string;
}

export function LiveValue({
  read,
  format = (v) => v.toFixed(1),
  bandOf,
  className,
  placeholder = '—',
}: LiveValueProps): JSX.Element {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let raf = 0;
    let lastText = '';
    const tick = () => {
      const el = ref.current;
      if (el) {
        const v = read();
        const text = v === undefined ? placeholder : format(v);
        // Only touch the DOM when the rendered string actually changes.
        if (text !== lastText) {
          el.textContent = text;
          lastText = text;
          if (bandOf) el.dataset.band = v === undefined ? 'none' : bandOf(v);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [read, format, bandOf, placeholder]);

  return <span ref={ref} className={className} data-band="none">{placeholder}</span>;
}