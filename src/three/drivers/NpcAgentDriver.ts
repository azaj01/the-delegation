import { IAgentDriver } from '../../types';
import { CharacterController } from '../CharacterController';
import { AgentData } from '../../data/agents';

/**
 * NpcAgentDriver — drives a single NPC autonomously.
 *
 * Each NPC in the scene has its own instance of this class.
 * The update() method is the entry point for all NPC autonomous behavior.
 *
 * Currently: NPCs remain in idle state (base skeleton to build on).
 *
 * Extend here to add:
 *  - Wandering between waypoints
 *  - Sitting at POIs
 *  - Reacting to player proximity
 *  - Scheduled routines (work → break → work)
 */
export class NpcAgentDriver implements IAgentDriver {
  public readonly agentIndex: number;

  constructor(
    agentIndex: number,
    protected readonly controller: CharacterController,
    protected readonly data: AgentData,
  ) {
    this.agentIndex = agentIndex;
  }

  // ── IAgentDriver ─────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public update(_positions: Float32Array, _delta: number): void {
    // Autonomous NPC behavior goes here.
    // Access controller via this.controller, agent data via this.data.
    // Example (future):
    //   if (this.idleTimer <= 0) this.controller.play(this.agentIndex, 'look_around');
  }

  public dispose(): void {}
}
