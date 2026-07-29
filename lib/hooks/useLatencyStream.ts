'use client';
import { useEffect, useRef } from 'react';
import type { LatencySource } from '@/types/domain';
import { latencyStore } from '@/lib/store/useLatencyStore';
export interface LatencyStreamOptions {
  intervalMs?: number;        // spec target is 5-10s
  pauseWhenHidden?: boolean;
  maxBackoffMs?: number;
  staleAfterMs?: number;
}
/**
 * Mount this ONCE, high in the tree. It owns the polling lifecycle and writes
 * into the latency store. No component should ever fetch latency directly.
 *
 * Swapping to SSE/WebSocket later means replacing the body of this hook; the
 * store contract and every consumer stay identical.
 */
export function useLatencyStream(
  source: LatencySource,
  options: LatencyStreamOptions = {},
): void {
  const {
    intervalMs = 7000,
    pauseWhenHidden = true,
    maxBackoffMs = 60_000,
    staleAfterMs = 30_000,
  } = options;
  const sourceRef = useRef(source);
  sourceRef.current = source;
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    let failures = 0;
    const { ingest, setStatus } = latencyStore.getState();
    const delay = () =>
      failures === 0 ? intervalMs
        : Math.min(maxBackoffMs, intervalMs * 2 ** failures);
    const schedule = () => {
      if (cancelled) return;
      timer = setTimeout(run, delay());
    };
    const run = async () => {
      if (cancelled) return;
      if (pauseWhenHidden && typeof document !== 'undefined' && document.hidden) {
        schedule();
        return;
      }
      controller = new AbortController();
      try {
        const samples = await sourceRef.current.fetchBatch(controller.signal);
        if (cancelled) return;
        failures = 0;
        ingest(samples);
      } catch (err) {
        if (cancelled || (err as Error)?.name === 'AbortError') return;
        failures++;
        setStatus('error', (err as Error)?.message ?? 'Unknown error');
      } finally {
        schedule();
      }
    };
    // Staleness watchdog — independent of poll success.
    const staleTimer = setInterval(() => {
      const { lastUpdatedAt, status } = latencyStore.getState();
      if (status === 'live' && lastUpdatedAt !== null
          && Date.now() - lastUpdatedAt > staleAfterMs) {
        latencyStore.getState().setStatus('stale');
      }
    }, 5000);
    const onVisible = () => {
      if (!document.hidden && !cancelled) { clearTimeout(timer); run(); }
    };
    document.addEventListener('visibilitychange', onVisible);
    setStatus('connecting');
    void run();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      clearInterval(staleTimer);
      controller?.abort();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intervalMs, pauseWhenHidden, maxBackoffMs, staleAfterMs]);
}