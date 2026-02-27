import * as THREE from 'three/webgpu';
import { AgentStateBuffer } from '../behavior/AgentStateBuffer';
import { PATH_NODE_ARRIVAL } from '../constants';

/**
 * Manages path-following for a single agent on the CPU side.
 *
 * The GPU shader handles smooth interpolation toward the current waypoint;
 * PathAgent decides *which* waypoint to set next as the agent progresses
 * along its path.
 */
export class PathAgent {
  private path: THREE.Vector3[] = [];
  private nodeIndex = 0;
  public isMoving = false;

  constructor(
    private readonly agentIndex: number,
    private readonly stateBuffer: AgentStateBuffer,
  ) {}

  /** Start following a new path. Immediately writes the first waypoint to the GPU buffer. */
  public setPath(path: THREE.Vector3[]): void {
    this.path = path;
    this.nodeIndex = 0;
    this.isMoving = path.length > 0;
    if (this.isMoving) {
      this._writeWaypoint(this.path[0]);
    }
  }

  /** Cancel the current path. The agent will keep its last waypoint but stop following. */
  public cancel(): void {
    this.path = [];
    this.nodeIndex = 0;
    this.isMoving = false;
  }

  /**
   * Called every frame. Advances to the next path node when the agent is
   * close enough to the current one.
   *
   * @returns true when the agent has reached the final destination.
   */
  public update(currentPos: THREE.Vector3): boolean {
    if (!this.isMoving || this.path.length === 0) return false;

    const target = this.path[this.nodeIndex];
    const dx = target.x - currentPos.x;
    const dz = target.z - currentPos.z;
    const dist2 = dx * dx + dz * dz;

    if (dist2 < PATH_NODE_ARRIVAL * PATH_NODE_ARRIVAL) {
      this.nodeIndex++;
      if (this.nodeIndex >= this.path.length) {
        // Reached final destination
        this.isMoving = false;
        return true;
      }
      // Advance to next node
      this._writeWaypoint(this.path[this.nodeIndex]);
    }

    return false;
  }

  private _writeWaypoint(node: THREE.Vector3): void {
    this.stateBuffer.setWaypoint(this.agentIndex, node.x, node.z);
  }
}
