import { AgentNode, AgenticSystem, getAllAgents } from '../../data/agents';
import { useCoreStore } from '../../integration/store/coreStore';
import { AgentHost } from './AgentHost';
import { useUiStore } from '../../integration/store/uiStore';

export class AgentSimulation {
  private agents: Map<number, AgentHost> = new Map();
  private system: AgenticSystem;
  private meetingRegistry: Map<string, { requesterIndex: number, targetIndex?: number, arrived: Set<number>, message?: string }> = new Map();
  private unsub: (() => void) | null = null;

  constructor(system: AgenticSystem) {
    this.system = system;
    this.initializeAgents();
    this.startStateMonitoring();
  }

  private startStateMonitoring() {
    // Monitor project phase transitions
    this.unsub = useCoreStore.subscribe((state, prevState) => {
      // Idle -> Working transition
      if (state.phase === 'working' && prevState.phase === 'idle') {
        console.log('[AgentSimulation] Project entered WORKING phase. Triggering autonomous strategy...');
        this.triggerAutonomousStrategy();
      }

      // Working -> Done check (All tasks finished)
      const allTasksFinished = state.tasks.length > 0 && state.tasks.every(t => t.status === 'done');
      const previouslyUnfinished = prevState.tasks.some(t => t.status !== 'done');

      if (state.phase === 'working' && allTasksFinished && previouslyUnfinished) {
        console.log('[AgentSimulation] ALL TASKS FINISHED. Notifying Lead Agent to deliver results.');
        const lead = this.getAgent(this.system.leadAgent.index);
        if (lead) {
          lead.think('All tasks are complete! Review the final results and deliver the project to the user using the deliver_project tool.', { silent: true });
        }
      }
    });

    // Monitor chat transitions to resume deferred work
    useUiStore.subscribe((state, prevState) => {
      if (!state.isChatting && prevState.isChatting) {
        // Chat ended. 
        const core = useCoreStore.getState();
        
        // 1. Check if we should trigger initial strategy
        if (core.phase === 'working' && core.tasks.length === 0) {
          console.log('[AgentSimulation] Chat ended. Resuming autonomous strategy...');
          this.triggerAutonomousStrategy();
        }

        // 2. Check if any agents were deferred from their arriving task
        core.tasks.filter(t => t.status === 'scheduled').forEach(task => {
          task.assignedAgentIds.forEach(agentIndex => {
             // We "ping" the simulation that they are ready again
             this.onAgentReady(agentIndex, task.id);
          });
        });
      }
    });
  }

  private async triggerAutonomousStrategy() {
    // Usually the Lead Agent (index 1) handles the initial task decomposition
    const lead = this.getAgent(1);
    if (!lead) return;

    // DEFER if lead agent is currently chatting with the user
    const ui = useUiStore.getState();
    if (ui.isChatting && ui.selectedNpcIndex === lead.data.index) {
        console.log('[AgentSimulation] Lead agent is chatting. Deferring autonomous strategy...');
        return;
    }

    await lead.think('The project has officially started. Please review the user brief and propose the initial set of tasks using propose_task.', { silent: true });
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
  public onAgentRequestMeeting(agentIndex: number, taskId: string, targetIndex?: number, message?: string) {
    console.log(`[AgentSimulation] Agent ${agentIndex} requesting meeting for ${taskId} with ${targetIndex ?? 'User'}`);
    
    this.meetingRegistry.set(taskId, {
      requesterIndex: agentIndex,
      targetIndex,
      arrived: new Set(),
      message
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
      // DEFER if agent is currently chatting with the user
      const ui = useUiStore.getState();
      if (ui.isChatting && ui.selectedNpcIndex === agentIndex) {
          console.log(`[AgentSimulation] Agent ${agentIndex} is chatting. Deferring task ${taskId}...`);
          return;
      }

      console.log(`[AgentSimulation] Agent ${agentIndex} is ready for task ${taskId}. Starting cognition...`);
      agent.setState('working');
      agent.setTask(taskId);
      
      // Update task status in store
      useCoreStore.getState().updateTaskStatus(taskId, 'in_progress');
      
      // Add a realistic thinking/work-setup delay (5-15s)
      const delay = Math.floor(Math.random() * 10000) + 5000;
      await new Promise(resolve => setTimeout(resolve, delay));

      try {
        await agent.think(`Please proceed with objective: ${taskId}`, { silent: true });
        console.log(`[AgentSimulation] Agent ${agentIndex} completed cognition for ${taskId}.`);
      } catch (err) {
        console.error(`[AgentSimulation] Agent ${agentIndex} failed thinking:`, err);
      } finally {
        agent.setTask(null);
      }
    }
  }

  private async startMeetingCognition(taskId: string, meeting: { requesterIndex: number, targetIndex?: number, message?: string }) {
    const requester = this.getAgent(meeting.requesterIndex);
    if (!requester) return;

    if (meeting.targetIndex !== undefined) {
      const target = this.getAgent(meeting.targetIndex);
      if (target) {
        requester.setState('talking');
        target.setState('talking');
        
        // Multi-agent debate logic
        const startMessage = meeting.message || `You are now in the boardroom with ${target.data.name} to discuss ${taskId}.`;
        await requester.think(startMessage, { silent: true });
        
        // Target should also acknowledge
        await target.think(`Understood. ${requester.data.name} is consulting me about ${taskId}.`, { silent: true });
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

  public dispose() {
    if (this.unsub) this.unsub();
    this.agents.forEach(a => a.dispose());
    this.agents.clear();
  }
}
