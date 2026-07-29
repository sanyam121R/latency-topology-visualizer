import { Vector3 } from 'three';
import type { GeoPoint } from '@/types/domain';
/**
 * PROJECTION CONVENTIONS — painful to change later, fixed here once.
 *
 *  - The globe is a UNIT SPHERE (radius 1). Scale the camera, never the world.
 *  - Y is up (Three.js default). lat +90 => (0, 1, 0).
 *  - lng 0 (Greenwich) maps to +Z so the default camera at +Z sees Europe/Africa.
 *  - Longitude increases eastward.
 *
 * Every marker, arc, label anchor and raycast target must go through
 * latLngToVector3 so they stay mutually consistent.
 */
export const GLOBE_RADIUS = 1;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
export function latLngToVector3(
  point: GeoPoint,
  altitude = 0,
  target: Vector3 = new Vector3(),
): Vector3 {
  const phi = point.lat * DEG2RAD;
  const theta = point.lng * DEG2RAD;
  const r = GLOBE_RADIUS * (1 + altitude);
  const cosPhi = Math.cos(phi);
  return target.set(
    r * cosPhi * Math.sin(theta),
    r * Math.sin(phi),
    r * cosPhi * Math.cos(theta),
  );
}
/** Inverse (altitude discarded). Used for raycast hit -> geo. */
export function vector3ToLatLng(v: Vector3): GeoPoint {
  const r = v.length();
  if (r === 0) return { lat: 0, lng: 0 };
  return {
    lat: Math.asin(v.y / r) * RAD2DEG,
    lng: Math.atan2(v.x, v.z) * RAD2DEG,
  };
}
export function centralAngle(a: GeoPoint, b: GeoPoint): number {
  const lat1 = a.lat * DEG2RAD;
  const lat2 = b.lat * DEG2RAD;
  const dLat = lat2 - lat1;
  const dLng = (b.lng - a.lng) * DEG2RAD;
  // Haversine — numerically stable for small distances, unlike the acos form.
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}
export function greatCircleDistanceKm(a: GeoPoint, b: GeoPoint): number {
  return centralAngle(a, b) * 6371;
}
/**
 * Slerp between two surface positions, lifted by an arc height peaking at
 * t = 0.5. `maxAltitude` scales with distance so short hops stay flat and
 * long hops bow outward — this is what makes the topology readable.
 */
export function greatCirclePoint(
  from: GeoPoint, to: GeoPoint, t: number,
  maxAltitude: number, target: Vector3 = new Vector3(),
): Vector3 {
  const a = latLngToVector3(from, 0, _a);
  const b = latLngToVector3(to, 0, _b);
  const omega = centralAngle(from, to);
  if (omega < 1e-6) {
    target.copy(a); // Degenerate: identical points. Avoid divide-by-zero.
  } else {
    const sinOmega = Math.sin(omega);
    const w1 = Math.sin((1 - t) * omega) / sinOmega;
    const w2 = Math.sin(t * omega) / sinOmega;
    target.set(a.x*w1 + b.x*w2, a.y*w1 + b.y*w2, a.z*w1 + b.z*w2);
  }
  const lift = Math.sin(Math.PI * t) * maxAltitude; // 0 at ends, 1 at midpoint
  return target.normalize().multiplyScalar(GLOBE_RADIUS + lift);
}
// Reusable scratch vectors — greatCirclePoint is called in hot loops.
const _a = new Vector3();
const _b = new Vector3();
export function arcAltitudeFor(from: GeoPoint, to: GeoPoint): number {
  return centralAngle(from, to) * 0.18;
}
/**
 * Sample an arc into a flat Float32Array of xyz triples. Writes into `out`
 * when provided so callers can reuse buffer attributes.
 */
export function buildGreatCircleArc(
  from: GeoPoint, to: GeoPoint, segments = 48,
  maxAltitude = arcAltitudeFor(from, to),
  out?: Float32Array, offset = 0,
): Float32Array {
  const count = segments + 1;
  const arr = out ?? new Float32Array(count * 3);
  const p = _scratch;
  for (let i = 0; i < count; i++) {
    greatCirclePoint(from, to, i / segments, maxAltitude, p);
    const o = offset + i * 3;
    arr[o] = p.x; arr[o + 1] = p.y; arr[o + 2] = p.z;
  }
  return arr;
}
const _scratch = new Vector3();