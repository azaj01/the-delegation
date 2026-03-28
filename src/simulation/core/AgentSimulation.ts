import { AgentNode, AgenticSystem, getAllAgents } from '../../data/agents';
import { useCoreStore } from '../../integration/store/coreStore';
import { AgentHost } from './AgentHost';
import { useUiStore } from '../../integration/store/uiStore';

/**
 * AgentSimulation — Autonomous Service Layer.
 * 
 * DESIGN PRINCIPLE: State-Driven Orchestration.
 * 1. Monitors the Store to trigger autonomous loops.
 * 2. Visuals are reflections of this state.
 * 3. Event-based Resilience: Re-checks for tasks when agents become idle.
 */
export class AgentSimulation {
  private agents: Map<number, AgentHost> = new Map();
  private system: AgenticSystem;
  private meetingRegistry: Map<string, { 
    requesterIndex: number, 
    targetIndex?: number, 
    arrived: Set<number>, 
    message?: string,
    started: boolean 
  }> = new Map();
  private unsubs: (() => void)[] = [];
  private heartbeatInterval: any = null;
  private lastSparkTriggerTime: number = 0;

  constructor(system: AgenticSystem) {
    this.system = system;
    this.initializeAgents();
    this.startStateMonitoring();
  }

  private startStateMonitoring() {
    // 1. Heartbeat safety net (Periodically check for scheduled tasks)
    this.heartbeatInterval = setInterval(() => {
      this.processScheduledTasks();
    }, 10000);

    // 2. Core Store Monitoring
    this.unsubs.push(
      useCoreStore.subscribe((state, prevState) => {
        // A. Initial Strategy (Spark)
        if (state.phase === 'working' && prevState.phase === 'idle' && state.tasks.length === 0) {
          this.triggerAutonomousStrategy();
        }

        // B. Task Lifecycle: Process SCHEDULED tasks
        if (state.phase === 'working') {
          this.processScheduledTasks();
        }

        // C. Project Completion
        this.checkProjectCompletion();
      })
    );

    // 3. UI Store Monitoring (Cleanup)
    this.unsubs.push(
      useUiStore.subscribe((state, prevState) => {
        if (!state.isChatting && prevState.isChatting) {
          const core = useCoreStore.getState();
          if (core.phase === 'working' && core.tasks.length === 0) this.triggerAutonomousStrategy();
        }
      })
    );
  }

  /** Central method to check for and start available tasks. */
  public processScheduledTasks() {
    const state = useCoreStore.getState();
    if (state.phase !== 'working') return;

    state.tasks.filter(t => t.status === 'scheduled').forEach(task => {
      const agent = this.getAgent(task.assignedAgentId);
      // Resilience check: only start if agent is truly idle and not currently thinking.
      if (agent && agent.state === 'idle' && !agent.isThinking) {
         this.startTaskExecution(task.assignedAgentId, task.id);
      }
    });
  }

  private async triggerAutonomousStrategy() {
    const lead = this.getAgent(1);
    const ui = useUiStore.getState();
    const core = useCoreStore.getState();

    // GUARD: Prevent duplication
    if (!lead || lead.isThinking || core.tasks.length > 0) return;
    if (ui.isChatting && ui.selectedNpcIndex === lead.data.index) return;
    
    // THROTTLE: Only trigger once per second to avoid race conditions from multiple store subscriptions
    if (Date.now() - this.lastSparkTriggerTime < 1000) return;
    this.lastSparkTriggerTime = Date.now();

    await lead.think('Start the project by proposing initial tasks.', { silent: true });
  }

  private async startTaskExecution(agentIndex: number, taskId: string) {
    const agent = this.getAgent(agentIndex);
    if (!agent) return;

    agent.setTask(taskId); 
    useCoreStore.getState().updateTaskStatus(taskId, 'in_progress');
    
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));

    try {
      if (!agent.isThinking) {
        await agent.think(`Proceed with task: ${taskId}`, { silent: true });
      }
    } catch (err) {
      console.error(`[AgentSimulation] Agent ${agentIndex} failed:`, err);
    } finally {
      // Resilience check: only clear task if not waiting for consultation/meeting
      if (agent.state !== 'on_hold' && agent.state !== 'talking') {
        agent.setTask(null);
        agent.setState('idle');
      }
      
      // KEY: When finished, check if there are other scheduled tasks waiting
      this.processScheduledTasks();
      
      // AND check if the project is now ready for delivery 
      // (Resilience for 1-agent teams where lead is thinking when the last task finishes)
      this.checkProjectCompletion();
    }
  }

  private async checkProjectCompletion() {
    const state = useCoreStore.getState();
    const allTasksFinished = state.tasks.length > 0 && state.tasks.every(t => t.status === 'done');
    
    if (state.phase === 'working' && allTasksFinished) {
      const lead = this.getAgent(this.system.leadAgent.index);
      if (lead && !lead.isThinking) {
        await lead.think('All tasks are complete! Use the deliver_project tool to fulfill the final delivery with a summary of the accomplishments.', { silent: true });
      }
    }
  }

  private initializeAgents() {
    const allAgents = getAllAgents(this.system);
    for (const agentData of allAgents) {
      this.agents.set(agentData.index, new AgentHost(agentData, this));
    }
  }

  public getAgent(index: number): AgentHost | undefined {
    return this.agents.get(index);
  }

  public getAllAgents(): AgentHost[] {
    return Array.from(this.agents.values());
  }

  public onAgentRequestMeeting(agentIndex: number, taskId: string, targetIndex?: number, message?: string) {
    this.meetingRegistry.set(taskId, { requesterIndex: agentIndex, targetIndex, arrived: new Set(), message, started: false });
    
    setTimeout(() => {
      const meeting = this.meetingRegistry.get(taskId);
      if (meeting && !meeting.started) this.startMeetingCognition(taskId, meeting);
    }, 15000);
  }

  public async onAgentReady(agentIndex: number, taskId: string) {
    const meeting = this.meetingRegistry.get(taskId);
    if (!meeting || meeting.started) return;
    meeting.arrived.add(agentIndex);
    const both = meeting.targetIndex === undefined || (meeting.arrived.has(meeting.requesterIndex) && meeting.arrived.has(meeting.targetIndex!));
    if (both) this.startMeetingCognition(taskId, meeting);
    else this.getAgent(agentIndex)?.setState('on_hold');
  }

  private async startMeetingCognition(taskId: string, meeting: any) {
    if (meeting.started) return;
    meeting.started = true;
    const requester = this.getAgent(meeting.requesterIndex);
    const target = meeting.targetIndex !== undefined ? this.getAgent(meeting.targetIndex) : null;
    if (!requester || requester.isThinking) return;

    if (target) {
      if (target.isThinking) { meeting.started = false; return; }
      requester.setState('talking'); target.setState('talking');
      try {
        await requester.think(meeting.message || `Meeting for ${taskId}.`, { silent: true });
        await target.think(`Review meeting for ${taskId}.`, { silent: true });
      } finally {
        requester.setState('idle'); 
        if (target) target.setState('idle');
        
        // Return task to scheduled so it can be picked up by the loop
        useCoreStore.getState().updateTaskStatus(taskId, 'scheduled');
        this.processScheduledTasks();
      }
    } else {
      // Just waiting for User (0) - no action needed, AgentHost already set to on_hold
    }
  }

  public async handleUserMessage(agentIndex: number, text: string) {
    const agent = this.getAgent(agentIndex);
    if (!agent || !agent.canChat()) return null;
    const response = await agent.think(text, { isChat: true });
    return response.text;
  }

  public dispose() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.unsubs.forEach(unsub => unsub());
    this.unsubs = [];
    this.agents.forEach(a => a.dispose());
  }
}
