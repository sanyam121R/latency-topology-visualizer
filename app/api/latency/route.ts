import { NextResponse } from 'next/server';
import { createSyntheticLatencySource } from '@/lib/data/latencySource';
import type { LatencySample } from '@/types/domain';
/**
 * THE API BOUNDARY.
 *
 * The client only ever knows `{ samples: LatencySample[] }`. Whatever upstream
 * we use (cloudping, a self-hosted prober, synthetic) is an implementation
 * detail of this file. Swapping sources = editing this handler only.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;
const source = createSyntheticLatencySource();
export interface LatencyResponse {
  samples: LatencySample[];
  sourceId: string;
  generatedAt: number;
}
export async function GET(): Promise<NextResponse<LatencyResponse | { error: string }>> {
  try {
    const samples = await source.fetchBatch();
    return NextResponse.json({ samples, sourceId: source.id, generatedAt: Date.now() });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error)?.message ?? 'Failed to collect latency samples' },
      { status: 502 },
    );
  }
}