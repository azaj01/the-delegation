import * as THREE from 'three/webgpu';
import { Pathfinding } from 'three-pathfinding';
import { NAVMESH_SUBDIVISIONS, NAVMESH_ZONE } from '../constants';

/**
 * Manages the navigation mesh used for path queries.
 *
 * Initially built procedurally from a flat plane (same dimensions as the
 * visible ground). In the future, call loadFromGeometry() with a navmesh
 * extracted from a GLB to replace it.
 */
export class NavMeshManager {
  private pf = new Pathfinding();
  private ready = false;

  // ── Setup ────────────────────────────────────────────────────

  /**
   * Build a flat navmesh from a plane of the given radius.
   * Subdividing yields enough triangles for the pathfinder to generate
   * meaningful paths across the surface.
   */
  public buildFromPlane(radius: number): void {
    const size = radius * 2;
    const geo = new THREE.PlaneGeometry(size, size, NAVMESH_SUBDIVISIONS, NAVMESH_SUBDIVISIONS);
    geo.rotateX(-Math.PI / 2);
    this.loadFromGeometry(geo);
  }

  /**
   * Load a navmesh from any BufferGeometry (e.g. extracted from a GLB).
   * Replaces any previously loaded zone.
   */
  public loadFromGeometry(geometry: THREE.BufferGeometry): void {
    const zone = Pathfinding.createZone(geometry as any);
    this.pf.setZoneData(NAVMESH_ZONE, zone);
    this.ready = true;
  }

  // ── Queries ──────────────────────────────────────────────────

  /**
   * Find a path from `from` to `to`.
   * Returns an array of waypoints (excluding the start position).
   * Falls back to [to] if the navmesh is not ready or no path is found.
   */
  public findPath(from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3[] {
    if (!this.ready) return [to.clone()];

    const groupID = this.pf.getGroup(NAVMESH_ZONE, from as any);
    const path = this.pf.findPath(from as any, to as any, NAVMESH_ZONE, groupID) as THREE.Vector3[];

    if (!path || path.length === 0) return [to.clone()];
    return path;
  }

  public isReady(): boolean {
    return this.ready;
  }
}
