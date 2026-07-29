import { exchangeId, regionId, type Exchange } from '@/types/domain';
/**
 * Hosting providers are best-effort/public knowledge — treat `provider` as a
 * display hint, not truth. Swap this module for an API-backed loader later
 * without touching consumers.
 */
export const EXCHANGES: readonly Exchange[] = [
  { id: exchangeId('binance'), name: 'Binance', code: 'BIN', location: { lat: 35.69, lng: 139.69 }, city: 'Tokyo, JP', continent: 'asia', provider: 'aws', hostedInRegionId: regionId('aws:ap-northeast-1') },
  { id: exchangeId('okx'), name: 'OKX', code: 'OKX', location: { lat: 22.32, lng: 114.17 }, city: 'Hong Kong, HK', continent: 'asia', provider: 'aws' },
  { id: exchangeId('bybit'), name: 'Bybit', code: 'BYB', location: { lat: 1.35, lng: 103.82 }, city: 'Singapore, SG', continent: 'asia', provider: 'aws', hostedInRegionId: regionId('aws:ap-southeast-1') },
  { id: exchangeId('deribit'), name: 'Deribit', code: 'DER', location: { lat: 50.11, lng: 8.68 }, city: 'Frankfurt, DE', continent: 'europe', provider: 'aws', hostedInRegionId: regionId('aws:eu-central-1') },
  { id: exchangeId('kraken'), name: 'Kraken', code: 'KRK', location: { lat: 37.77, lng: -122.42 }, city: 'San Francisco, US', continent: 'north-america', provider: 'gcp' },
  { id: exchangeId('coinbase'), name: 'Coinbase', code: 'CBS', location: { lat: 38.9, lng: -77.45 }, city: 'Ashburn, US', continent: 'north-america', provider: 'aws', hostedInRegionId: regionId('aws:us-east-1') },
  { id: exchangeId('bitfinex'), name: 'Bitfinex', code: 'BFX', location: { lat: 47.37, lng: 8.54 }, city: 'Zurich, CH', continent: 'europe', provider: 'unknown' },
  { id: exchangeId('upbit'), name: 'Upbit', code: 'UPB', location: { lat: 37.57, lng: 126.98 }, city: 'Seoul, KR', continent: 'asia', provider: 'azure' },
  { id: exchangeId('mercado'), name: 'Mercado Bitcoin', code: 'MBT', location: { lat: -23.55, lng: -46.63 }, city: 'São Paulo, BR', continent: 'south-america', provider: 'aws', hostedInRegionId: regionId('aws:sa-east-1') },
  { id: exchangeId('btcmarkets'), name: 'BTC Markets', code: 'BTM', location: { lat: -33.87, lng: 151.21 }, city: 'Sydney, AU', continent: 'oceania', provider: 'gcp' },
];
export const EXCHANGES_BY_ID: ReadonlyMap<string, Exchange> = new Map(
  EXCHANGES.map((e) => [e.id, e]),
);