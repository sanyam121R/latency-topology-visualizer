import type { GeoPoint } from '@/types/domain';
import { GLOBE_RADIUS, centralAngle, greatCirclePoint, latLngToVector3 } from './projection';
import { Vector3 } from 'three';

/**
 * Converts GeoJSON polygon rings into line segments laid on the sphere.
 *
 * GeoJSON edges are straight lines in lat/lng space. Drawn as straight 3D
 * lines they chord *through* the sphere, dipping below the surface by the
 * segment's sagitta (~chord^2 / 8 for a unit sphere).
 *
 * Measured on Natural Earth land-110m: raw edges reach a 0.056 chord, dipping
 * 0.00039 — comfortably inside the default 0.002 altitude offset, so raw data
 * would actually render fine. Subdivision is kept because it is cheap (+8%
 * segments) and because the margin disappears the moment you swap in sparser
 * geometry (country borders, hand-authored GeoJSON) or reduce `altitude`.
 * The invariant we guarantee: sagitta stays well under `altitude`.
 */

export interface LandmassOptions {
  /** Height above the sphere; prevents z-fighting with the globe surface. */
  altitude?: number;
  /** Max angular length of an emitted segment, radians. Smaller = smoother. */
  maxSegmentRad?: number;
}

type Ring = ReadonlyArray<readonly [number, number]>;

interface PolygonLike {
  type: string;
  coordinates: unknown;
}

/** Pull every ring out of Polygon / MultiPolygon / LineString / MultiLineString. */
export function collectRings(geometry: PolygonLike): Ring[] {
  const rings: Ring[] = [];
  const c = geometry.coordinates;
  switch (geometry.type) {
    case 'Polygon':
      for (const ring of c as Ring[]) rings.push(ring);
      break;
    case 'MultiPolygon':
      for (const poly of c as Ring[][]) for (const ring of poly) rings.push(ring);
      break;
    case 'LineString':
      rings.push(c as Ring);
      break;
    case 'MultiLineString':
      for (const line of c as Ring[]) rings.push(line);
      break;
    default:
      break;
  }
  return rings;
}

/** Extract rings from a Feature / FeatureCollection / bare geometry. */
export function collectRingsFromGeoJson(input: unknown): Ring[] {
  if (!input || typeof input !== 'object') return [];
  const obj = input as Record<string, unknown>;
  if (obj.type === 'FeatureCollection' && Array.isArray(obj.features)) {
    return obj.features.flatMap((f) =>
      collectRingsFromGeoJson((f as Record<string, unknown>)?.geometry),
    );
  }
  if (obj.type === 'Feature') return collectRingsFromGeoJson(obj.geometry);
  if (typeof obj.type === 'string' && 'coordinates' in obj) {
    return collectRings(obj as unknown as PolygonLike);
  }
  return [];
}

const _p = new Vector3();

/**
 * Build a flat Float32Array of line segments (pairs of xyz) for LineSegments.
 */
export function buildLandSegments(
  input: unknown,
  options: LandmassOptions = {},
): Float32Array {
  const { altitude = 0.002, maxSegmentRad = 0.02 } = options;
  const rings = collectRingsFromGeoJson(input);
  const out: number[] = [];

  const push = (point: GeoPoint) => {
    latLngToVector3(point, altitude, _p);
    out.push(_p.x, _p.y, _p.z);
  };

  for (const ring of rings) {
    for (let i = 0; i < ring.length - 1; i++) {
      const from = toGeo(ring[i]!);
      const to = toGeo(ring[i + 1]!);
      const omega = centralAngle(from, to);
      const steps = Math.max(1, Math.ceil(omega / maxSegmentRad));
      let prev = from;
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        // Interpolate on the great circle, then lift to the render altitude.
        greatCirclePoint(from, to, t, 0, _p);
        const next = s === steps ? to : vecToGeo(_p);
        push(prev);
        push(next);
        prev = next;
      }
    }
  }
  return new Float32Array(out);
}

function toGeo(c: readonly [number, number]): GeoPoint {
  return { lng: c[0], lat: c[1] };
}

function vecToGeo(v: Vector3): GeoPoint {
  const r = v.length() || 1;
  return {
    lat: Math.asin(v.y / r) * (180 / Math.PI),
    lng: Math.atan2(v.x, v.z) * (180 / Math.PI),
  };
}

/**
 * Latitude/longitude grid. Rendered dim; it's what sells the "technical
 * readout" look and gives depth cues while orbiting.
 */
export function buildGraticule(
  stepDeg = 15,
  options: LandmassOptions = {},
): Float32Array {
  const { altitude = 0.001 } = options;
  const out: number[] = [];
  const push = (lat: number, lng: number) => {
    latLngToVector3({ lat, lng }, altitude, _p);
    out.push(_p.x, _p.y, _p.z);
  };

  // Parallels (constant latitude).
  for (let lat = -90 + stepDeg; lat < 90; lat += stepDeg) {
    for (let lng = -180; lng < 180; lng += 2) {
      push(lat, lng);
      push(lat, lng + 2);
    }
  }
  // Meridians (constant longitude).
  for (let lng = -180; lng < 180; lng += stepDeg) {
    for (let lat = -90; lat < 90; lat += 2) {
      push(lat, lng);
      push(lat + 2, lng);
    }
  }
  return new Float32Array(out);
}

export { GLOBE_RADIUS };