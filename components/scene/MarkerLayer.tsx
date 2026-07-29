'use client';

import { JSX, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { useFrame } from '@react-three/fiber';
import { Color, InstancedMesh, Matrix4, Vector3 } from 'three';
import type { CloudProvider, GeoPoint } from '@/types/domain';
import { latLngToVector3 } from '@/lib/geo/projection';
import { getFilters, worldStore, type HoverTarget } from '@/lib/store/useWorldStore';
import type { LinkFilters } from '@/lib/scene/visibility';

/**
 * Generic instanced marker layer, shared by exchanges and cloud regions.
 *
 * WHY INSTANCED: one draw call regardless of marker count, and — more
 * importantly — one raycast target. R3F gives us `instanceId` on pointer
 * events, so hover resolution is an array index rather than per-object
 * event handlers.
 *
 * WHY POINTER EVENTS RATHER THAN PER-FRAME RAYCASTING: R3F raycasts on pointer
 * movement only. A manual raycast in useFrame would run 60x/second for no
 * benefit. This is the main reason hover here doesn't fight the render loop.
 */

export interface MarkerDatum {
  location: GeoPoint;
  provider: CloudProvider;
}

export interface MarkerLayerProps<T extends MarkerDatum> {
  items: readonly T[];
  /** Base marker radius in world units. */
  radius: number;
  /** Height above the globe surface. */
  altitude: number;
  color: string;
  /** Builds the hover payload for a given item index. */
  toHoverTarget: (item: T, index: number) => HoverTarget;
  /** Returns true when this item is the currently hovered/selected one. */
  isEmphasised: (item: T, hovered: HoverTarget | null, selected: HoverTarget | null) => boolean;
  /** Per-item visibility, evaluated every frame against the shared filters. */
  isVisible?: (item: T, filters: LinkFilters) => boolean;
  opacity?: number;
}

const _matrix = new Matrix4();
const _scale = new Vector3();
const _position = new Vector3();

export function MarkerLayer<T extends MarkerDatum>({
  items,
  radius,
  altitude,
  color,
  toHoverTarget,
  isEmphasised,
  isVisible,
  opacity = 1,
}: MarkerLayerProps<T>): JSX.Element {
  const meshRef = useRef<InstancedMesh>(null);

  /** Static world positions, computed once through the shared projection. */
  const positions = useMemo(() => {
    const out = new Float32Array(items.length * 3);
    items.forEach((item, i) => {
      latLngToVector3(item.location, altitude, _position);
      out[i * 3] = _position.x;
      out[i * 3 + 1] = _position.y;
      out[i * 3 + 2] = _position.z;
    });
    return out;
  }, [items, altitude]);

  const baseColor = useMemo(() => new Color(color), [color]);

  // Seed matrices and colours once, before first paint.
  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    for (let i = 0; i < items.length; i++) {
      _position.set(positions[i * 3]!, positions[i * 3 + 1]!, positions[i * 3 + 2]!);
      _matrix.makeScale(1, 1, 1).setPosition(_position);
      mesh.setMatrixAt(i, _matrix);
      mesh.setColorAt(i, baseColor);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [items, positions, baseColor]);

  /**
   * Per-frame: emphasis scaling only. Reads hover/filter state via getState()
   * so this component never re-renders when hover changes — the GPU buffers are
   * updated in place instead.
   */
  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const { hovered, selected } = worldStore.getState();
    const filters = getFilters();
    const pulse = 1 + Math.sin(clock.elapsedTime * 4) * 0.12;

    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      const visible = isVisible ? isVisible(item, filters) : true;
      const emphasised = visible && isEmphasised(item, hovered, selected);
      // Scale 0 is how we hide a filtered-out instance: no geometry swap, no
      // re-render, and it keeps instanceId stable for hover resolution.
      const s = !visible ? 0 : emphasised ? 1.9 * pulse : 1;
      _position.set(positions[i * 3]!, positions[i * 3 + 1]!, positions[i * 3 + 2]!);
      _scale.setScalar(s);
      _matrix.identity().scale(_scale).setPosition(_position);
      mesh.setMatrixAt(i, _matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  const handleMove = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (event.instanceId === undefined) return;
      const item = items[event.instanceId];
      if (!item) return;
      event.stopPropagation();
      worldStore.getState().setPointer(event.nativeEvent.clientX, event.nativeEvent.clientY);
      worldStore.getState().setHovered(toHoverTarget(item, event.instanceId));
    },
    [items, toHoverTarget],
  );

  const handleOut = useCallback(() => {
    worldStore.getState().setHovered(null);
  }, []);

  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      if (event.instanceId === undefined) return;
      const item = items[event.instanceId];
      if (!item) return;
      event.stopPropagation();
      worldStore.getState().setSelected(toHoverTarget(item, event.instanceId));
    },
    [items, toHoverTarget],
  );

  // Dispose on unmount. Harmless today (markers mount once) but required the
  // moment the dashboard can swap strategies or tear the stage down.
  useEffect(() => {
    const mesh = meshRef.current;
    return () => {
      mesh?.geometry.dispose();
      const material = mesh?.material;
      if (Array.isArray(material)) material.forEach((m) => m.dispose());
      else material?.dispose();
    };
  }, []);

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, items.length]}
      frustumCulled={false}
      onPointerMove={handleMove}
      onPointerOut={handleOut}
      onClick={handleClick}
    >
      <sphereGeometry args={[radius, 12, 10]} />
      <meshBasicMaterial
        toneMapped={false}
        transparent={opacity < 1}
        opacity={opacity}
      />
    </instancedMesh>
  );
}