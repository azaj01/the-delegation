import * as THREE from 'three/webgpu';
import { IAgentDriver } from '../../types';
import { CharacterController } from '../CharacterController';
import { PLAYER_INDEX } from '../../data/agents';

/**
 * PlayerInputDriver — translates user input into CharacterController actions.
 *
 * This is the only driver that listens to human input. It does NOT contain
 * any animation or expression logic; it just calls controller.moveTo(),
 * controller.play(), etc. in response to user gestures.
 *
 * Wired up by SceneManager after InputManager is created.
 */
export class PlayerInputDriver implements IAgentDriver {
  public readonly agentIndex = PLAYER_INDEX;

  constructor(private readonly controller: CharacterController) {}

  // ── Input handlers (called by InputManager callbacks) ────────

  /** User clicked on the floor: walk the player to that position. */
  public onFloorClick(x: number, z: number): void {
    // Cancel any pending chat walk
    const target = new THREE.Vector3(x, 0, z);
    this.controller.moveTo(PLAYER_INDEX, target, 'idle');
  }

  /**
   * Walk the player toward a specific world position with a custom arrival state.
   * Used by SceneManager when the player initiates a chat with an NPC.
   */
  public walkTo(
    target: THREE.Vector3,
    arrivalState: import('../../types').CharacterStateKey = 'idle',
    onArrival?: (index: number) => void,
  ): void {
    this.controller.moveTo(PLAYER_INDEX, target, arrivalState, onArrival);
  }

  /** Cancel current movement (e.g. chat was aborted before arrival). */
  public cancelMovement(): void {
    this.controller.cancelMovement(PLAYER_INDEX);
  }

  // ── IAgentDriver ─────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public update(_positions: Float32Array, _delta: number): void {
    // Player is driven by input events, not by per-frame autonomous logic.
    // Reserved for future: keyboard/gamepad polling, etc.
  }

  public dispose(): void {}
}
