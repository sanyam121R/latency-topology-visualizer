import type { ExchangeId, PairKey, RegionId } from '@/types/domain';
/** Separator chosen to be illegal in provider region codes and exchange ids. */
const SEP = '__';
/** Canonical pair key. Single source of truth — never inline this format. */
export function pairKey(fromId: ExchangeId, toId: RegionId): PairKey {
  return `${fromId}${SEP}${toId}` as PairKey;
}
export function parsePairKey(key: PairKey): { fromId: ExchangeId; toId: RegionId } {
  const idx = key.indexOf(SEP);
  if (idx === -1) throw new Error(`Malformed PairKey: ${key}`);
  return {
    fromId: key.slice(0, idx) as ExchangeId,
    toId: key.slice(idx + SEP.length) as RegionId,
  };
}
