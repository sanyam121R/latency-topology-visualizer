'use client';

import type { JSX, ReactNode } from 'react';

/**
 * The single framing primitive for every module in the rails and dock.
 *
 * Deliberately NOT a "card": square corners, 1px border, a hairline header rule
 * and corner ticks. Everything in the dashboard uses this so the composition
 * reads as one instrument panel rather than a grid of floating surfaces.
 */
export interface PanelProps {
  label: string;
  /** Small right-aligned value in the header (count, unit, status). */
  meta?: ReactNode;
  children: ReactNode;
  /** Panel grows to fill remaining rail height and scrolls internally. */
  grow?: boolean;
  className?: string;
}

export function Panel({ label, meta, children, grow, className }: PanelProps): JSX.Element {
  return (
    <section className={`panel${grow ? ' panel--grow' : ''}${className ? ` ${className}` : ''}`}>
      <header className="panel__head">
        <span className="panel__label">{label}</span>
        {meta !== undefined ? <span className="panel__meta">{meta}</span> : null}
      </header>
      <div className="panel__body">{children}</div>
    </section>
  );
}

/** Label/value row used throughout the rails. */
export function Readout({
  label,
  value,
  mono = true,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}): JSX.Element {
  return (
    <div className="readout">
      <span className="readout__label">{label}</span>
      <span className={`readout__value${mono ? ' num' : ''}`}>{value}</span>
    </div>
  );
}