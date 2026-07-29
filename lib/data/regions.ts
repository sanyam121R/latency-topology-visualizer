import { regionId, type CloudRegion } from '@/types/domain';
export const CLOUD_REGIONS: readonly CloudRegion[] = [
  // ---- AWS ----
  { id: regionId('aws:us-east-1'), provider: 'aws', code: 'us-east-1', name: 'US East (N. Virginia)', location: { lat: 38.9, lng: -77.45 }, city: 'Ashburn, US', continent: 'north-america' },
  { id: regionId('aws:us-west-2'), provider: 'aws', code: 'us-west-2', name: 'US West (Oregon)', location: { lat: 45.87, lng: -119.69 }, city: 'Boardman, US', continent: 'north-america' },
  { id: regionId('aws:eu-west-1'), provider: 'aws', code: 'eu-west-1', name: 'Europe (Ireland)', location: { lat: 53.34, lng: -6.27 }, city: 'Dublin, IE', continent: 'europe' },
  { id: regionId('aws:eu-central-1'), provider: 'aws', code: 'eu-central-1', name: 'Europe (Frankfurt)', location: { lat: 50.11, lng: 8.68 }, city: 'Frankfurt, DE', continent: 'europe' },
  { id: regionId('aws:ap-northeast-1'), provider: 'aws', code: 'ap-northeast-1', name: 'Asia Pacific (Tokyo)', location: { lat: 35.69, lng: 139.69 }, city: 'Tokyo, JP', continent: 'asia' },
  { id: regionId('aws:ap-southeast-1'), provider: 'aws', code: 'ap-southeast-1', name: 'Asia Pacific (Singapore)', location: { lat: 1.35, lng: 103.82 }, city: 'Singapore, SG', continent: 'asia' },
  { id: regionId('aws:sa-east-1'), provider: 'aws', code: 'sa-east-1', name: 'South America (São Paulo)', location: { lat: -23.55, lng: -46.63 }, city: 'São Paulo, BR', continent: 'south-america' },
  // ---- GCP ----
  { id: regionId('gcp:us-central1'), provider: 'gcp', code: 'us-central1', name: 'Iowa', location: { lat: 41.26, lng: -95.86 }, city: 'Council Bluffs, US', continent: 'north-america' },
  { id: regionId('gcp:europe-west4'), provider: 'gcp', code: 'europe-west4', name: 'Netherlands', location: { lat: 53.44, lng: 6.84 }, city: 'Eemshaven, NL', continent: 'europe' },
  { id: regionId('gcp:asia-northeast1'), provider: 'gcp', code: 'asia-northeast1', name: 'Tokyo', location: { lat: 35.68, lng: 139.76 }, city: 'Tokyo, JP', continent: 'asia' },
  { id: regionId('gcp:asia-southeast1'), provider: 'gcp', code: 'asia-southeast1', name: 'Singapore', location: { lat: 1.32, lng: 103.7 }, city: 'Jurong West, SG', continent: 'asia' },
  { id: regionId('gcp:australia-southeast1'), provider: 'gcp', code: 'australia-southeast1', name: 'Sydney', location: { lat: -33.87, lng: 151.21 }, city: 'Sydney, AU', continent: 'oceania' },
  // ---- Azure ----
  { id: regionId('azure:eastus'), provider: 'azure', code: 'eastus', name: 'East US', location: { lat: 37.37, lng: -79.38 }, city: 'Boydton, US', continent: 'north-america' },
  { id: regionId('azure:westeurope'), provider: 'azure', code: 'westeurope', name: 'West Europe', location: { lat: 52.37, lng: 4.89 }, city: 'Amsterdam, NL', continent: 'europe' },
  { id: regionId('azure:japaneast'), provider: 'azure', code: 'japaneast', name: 'Japan East', location: { lat: 35.68, lng: 139.77 }, city: 'Tokyo, JP', continent: 'asia' },
  { id: regionId('azure:southeastasia'), provider: 'azure', code: 'southeastasia', name: 'Southeast Asia', location: { lat: 1.28, lng: 103.83 }, city: 'Singapore, SG', continent: 'asia' },
  { id: regionId('azure:uaenorth'), provider: 'azure', code: 'uaenorth', name: 'UAE North', location: { lat: 25.32, lng: 55.3 }, city: 'Dubai, AE', continent: 'asia' },
];
export const REGIONS_BY_ID: ReadonlyMap<string, CloudRegion> = new Map(
  CLOUD_REGIONS.map((r) => [r.id, r]),
);
export const PROVIDERS = ['aws', 'gcp', 'azure'] as const;