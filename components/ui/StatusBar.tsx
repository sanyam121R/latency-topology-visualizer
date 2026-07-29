'use client';

import { JSX, useEffect, useRef } from 'react';
import { useLatencyMeta } from '@/lib/store/useLatencyStore';

/**
 * Stream status. Re-renders only when status/pairCount change (~0.14Hz), and
 * the "Xs ago" counter ticks imperatively so it doesn't drag React along.
 */
export function StatusBar(): JSX.Element {
  const { status, pairCount, lastUpdatedAt, lastError } = useLatencyMeta();
  const agoRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const tick = () => {
      const el = agoRef.current;
      if (!el) return;
      el.textContent =
        lastUpdatedAt === null
          ? '—'
          : `${Math.max(0, Math.round((Date.now() - lastUpdatedAt) / 1000))}s ago`;
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [lastUpdatedAt]);

  return (
    <div className="status">
      <span className="status__dot" data-status={status} />
      <span className="status__label">{status}</span>
      <span className="status__sep">·</span>
      <span>{pairCount} pairs</span>
      <span className="status__sep">·</span>
      <span ref={agoRef}>—</span>
      {lastError ? <span className="status__error">{lastError}</span> : null}
    </div>
  );
}