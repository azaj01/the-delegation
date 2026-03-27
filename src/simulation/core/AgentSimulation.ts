import { AgentNode, AgenticSystem, getAllAgents } from '../../data/agents';
import { useCoreStore } from '../../integration/store/coreStore';
import { AgentHost } from './AgentHost';

export class AgentSimulation {
  private agents: Map<number, AgentHost> = new Map();
  private system: AgenticSystem;
  private meetingRegistry: Map<string, { requesterIndex: number, targetIndex?: number, arrived: Set<number> }> = new Map();

  constructor(system: AgenticSystem) {
    this.system = system;
    this.initializeAgents();
    this.startStateMonitoring();
  }

  private startStateMonitoring() {
    // Monitor project phase transitions
    useCoreStore.subscribe((state, prevState) => {
      // Idle -> Working transition
      if (state.phase === 'working' && prevState.phase === 'idle') {
        console.log('[AgentSimulation] Project entered WORKING phase. Triggering autonomous strategy...');
        this.triggerAutonomousStrategy();
      }

      // Working -> Done transition check
      if (state.phase === 'working' && state.tasks.length > 0 && state.tasks.every(t => t.status === 'done')) {
        // Potentially auto-switch or wait for Lead Agent to use deliver_project tool
        console.log('[AgentSimulation] All tasks complete. Project ready for delivery.');
      }
    });
  }

  private async triggerAutonomousStrategy() {
    // Usually the Lead Agent (index 1) handles the initial task decomposition
    const lead = this.getAgent(1);
    if (lead) {
      await lead.think('The project has officially started. Please review the client brief and propose the initial set of tasks using propose_task.');
    }
  }

  private initializeAgents() {
    const allAgents = getAllAgents(this.system);
    for (const agentData of allAgents) {
      this.agents.set(agentData.index, new AgentHost(agentData, this));
    }
    console.log(`[AgentSimulation] Initialized with ${this.agents.size} agents.`);
  }

  public getAgent(index: number): AgentHost | undefined {
    return this.agents.get(index);
  }

  public getAllAgents(): AgentHost[] {
    return Array.from(this.agents.values());
  }

  /** Called by ToolRegistry when an agent needs a meeting or user feedback. */
  public onAgentRequestMeeting(agentIndex: number, taskId: string, targetIndex?: number) {
    console.log(`[AgentSimulation] Agent ${agentIndex} requesting meeting for ${taskId} with ${targetIndex ?? 'User'}`);
    
    this.meetingRegistry.set(taskId, {
      requesterIndex: agentIndex,
      targetIndex,
      arrived: new Set()
    });

    // Notify SceneManager to move agents to boardroom
    // SceneManager should have a 'moveNpcToBoardroom' method or similar
    const scene = (window as any).sceneManager; // Global access for simplicity in this prototype
    if (scene) {
      scene.moveNpcToBoardroom(agentIndex, taskId);
      if (targetIndex !== undefined) {
        scene.moveNpcToBoardroom(targetIndex, taskId);
      }
    }
  }

  // --- Handshake System ---
  // This will be called by SceneManager when an NPC has arrived at its destination.
  public async onAgentReady(agentIndex: number, taskId: string) {
    const agent = this.getAgent(agentIndex);
    if (!agent) return;

    // Check if this arrival is for a meeting
    const meeting = this.meetingRegistry.get(taskId);
    if (meeting) {
      meeting.arrived.add(agentIndex);
      
      const isTargetDefined = meeting.targetIndex !== undefined;
      const bothArrived = !isTargetDefined || (meeting.arrived.has(meeting.requesterIndex) && meeting.arrived.has(meeting.targetIndex!));

      if (bothArrived) {
        console.log(`[AgentSimulation] Meeting conditions met for ${taskId}. Starting collaboration...`);
        this.startMeetingCognition(taskId, meeting);
      } else {
        console.log(`[AgentSimulation] Agent ${agentIndex} arrived at boardroom for ${taskId}. Waiting for ${meeting.targetIndex}...`);
        agent.setState('on_hold');
      }
      return;
    }

    // Normal task execution
    if (agent.state !== 'working') {
      console.log(`[AgentSimulation] Agent ${agentIndex} is ready for task ${taskId}. Starting cognition...`);
      agent.setState('working');
      agent.setTask(taskId);
      
      try {
        const response = await agent.think(`Please proceed with objective: ${taskId}`);
        console.log(`[AgentSimulation] Agent ${agentIndex} completed cognition for ${taskId}.`);
      } catch (err) {
        console.error(`[AgentSimulation] Agent ${agentIndex} failed thinking:`, err);
      } finally {
        agent.setTask(null);
      }
    }
  }

  private async startMeetingCognition(taskId: string, meeting: { requesterIndex: number, targetIndex?: number }) {
    const requester = this.getAgent(meeting.requesterIndex);
    if (!requester) return;

    if (meeting.targetIndex !== undefined) {
      const target = this.getAgent(meeting.targetIndex);
      if (target) {
        requester.setState('talking');
        target.setState('talking');
        
        // Multi-agent debate logic
        await requester.think(`You are now in the boardroom with ${target.data.name} to discuss ${taskId}.`);
        // Target might respond automatically or after requester
      }
    } else {
      // Waiting for User feedback
      requester.setState('on_hold');
      console.log(`[AgentSimulation] Agent ${meeting.requesterIndex} is waiting for User feedback in the boardroom.`);
    }
  }

  // --- External API ---
  public async handleUserMessage(agentIndex: number, text: string) {
    const agent = this.getAgent(agentIndex);
    if (!agent) return null;

    if (!agent.canChat()) {
      return `${agent.data.name} is busy and cannot talk right now.`;
    }

    const response = await agent.think(text, { isChat: true });
    return response.text;
  }
}
