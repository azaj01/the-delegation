import { AgentNode } from '../../data/agents';
import { LLMMessage } from '../../core/llm/types';
import { AgentState } from '../../types';
import { LLMFactory } from '../../core/llm/LLMFactory';
import { useUiStore } from '../../integration/store/uiStore';
import { useCoreStore } from '../../integration/store/coreStore';
import { ToolRegistry, AgentActionContext } from '../../core/agent/ToolRegistry';



export class AgentHost implements AgentActionContext {
  public state: AgentState = 'idle';
  private history: LLMMessage[] = [];
  private summary: string = '';
  private currentTaskId: string | null = null;
  public isThinking: boolean = false;

  constructor(
    public readonly data: AgentNode,
    public readonly simulation: any // We'll type this properly later
  ) { }

  /** Determines if the agent is currently available to respond to user messages. */
  public canChat(): boolean {
    if (this.state === 'idle') return true;
    if (this.state === 'on_hold') {
      const core = useCoreStore.getState();
      const myHoldTask = core.tasks.find(t => t.status === 'on_hold' && t.assignedAgentId === this.data.index);
      // Only available if specifically waiting for the user (targetId 0)
      return myHoldTask?.consultationTargetId === 0;
    }
    return false;
  }

  public async think(prompt: string, options: {
    isChat?: boolean,
    tools?: any[],
    silent?: boolean
  } = {}): Promise<{ text: string, toolCalls?: any[] }> {
    if (this.isThinking) return { text: '', toolCalls: [] };
    this.isThinking = true;

    try {
      const core = useCoreStore.getState();
      const llmConfig = useUiStore.getState().llmConfig;
      const provider = LLMFactory.getProvider(llmConfig);
      const model = this.data.model || llmConfig.model;

      // Append user prompt to history FIRST so it persists and is visible in UI (unless silent)
      this.history.push({
        role: 'user',
        content: prompt,
        metadata: options.silent ? { internal: true } : undefined
      });
      this.syncToStore();

      const messages: LLMMessage[] = [...this.history];
      const systemPrompt = this.buildSystemPrompt(core.phase, core.userBrief);
      const toolDefs = options.tools || ToolRegistry.getDefinitions(this.data.index, core.phase, this.data.subagents?.length || 0);

      // 1. Log Request
      core.addRequestLog({
        agentIndex: this.data.index,
        agentName: this.data.name,
        systemInstruction: systemPrompt,
        contents: messages,
        systemTools: toolDefs,
        taskId: this.currentTaskId || undefined
      });

      const response = await provider.generateCompletion(
        messages,
        toolDefs,
        systemPrompt,
        model
      );

      // 2. Log Response (this also updates token usage and cost in coreStore)
      core.addResponseLog({
        agentIndex: this.data.index,
        agentName: this.data.name,
        content: response.content,
        tool_calls: response.tool_calls,
        usage: response.usage,
        raw: response.raw,
        taskId: this.currentTaskId || undefined
      });

      const text = response.content || '';
      const toolCalls = response.tool_calls?.map(tc => {
        try {
          return { name: tc.function.name, args: JSON.parse(tc.function.arguments) };
        } catch (e) {
          console.error('[AgentHost] Failed to parse tool arguments', tc.function.arguments);
          return null;
        }
      }).filter(Boolean) || [];

      // Update history
      const isInternalTrigger = options.silent;
      const hasToolCallsOnly = !text && !!response.tool_calls && response.tool_calls.length > 0;
      const isBrief = response.tool_calls?.some(tc => tc.function.name === 'set_user_brief');
      const isResolution = this.state === 'on_hold' && response.tool_calls && response.tool_calls.length > 0;
      let finalContent = text;

      if (hasToolCallsOnly && !isInternalTrigger) {
        finalContent = isBrief
          ? "Perfect! I've set the project brief based on our chat. Let's get to work!"
          : 'Understood. I am going back to work now.';
      }

      // Auto-close chat for system acknowledgments after tool calls
      if (options.isChat && (isBrief || isResolution)) {
        setTimeout(() => {
          if (useUiStore.getState().isChatting) useUiStore.getState().setChatting(false);
        }, 3000);
      }

      const isInternalMessage = isInternalTrigger || (hasToolCallsOnly && isInternalTrigger);
      this.history.push({
        role: 'assistant',
        content: finalContent,
        tool_calls: response.tool_calls,
        metadata: isInternalMessage ? { internal: true } : undefined
      });
      this.syncToStore();

      // Process tools
      for (const tc of toolCalls) {
        ToolRegistry.process(this, tc as any);
      }

      return { text, toolCalls };
    } catch (error) {
      console.error(`[AgentHost:${this.data.name}] Thinking error:`, error);
      throw error;
    } finally {
      this.isThinking = false;
      this.simulation.processScheduledTasks();
    }
  }

  private syncToStore() {
    useCoreStore.getState().setAgentHistory(this.data.index, this.history);
  }

  private buildSystemPrompt(phase: string, brief: string): string {
    const team = this.simulation.getAllAgents()
      .map((a: any) => `[${a.data.index}] ${a.data.name}: ${a.data.description || 'Specialist'}`)
      .join('\n');

    const isLead = this.data.index === 1;
    const objectives = {
      idle: isLead 
        ? 'Objective: Chat with the user (index 0) to define the final brief, then use the set_user_brief tool to start the project.' 
        : 'Objective: Wait for the Lead Agent to define the project brief and assign tasks.',
      working: isLead
        ? 'Objective: Coordinate the team and track progress on the Kanban board. When all tasks are Done, review the results and use the deliver_project tool.'
        : 'Objective: Focus on your assigned tasks. Collaborate with the team if needed, and use complete_task once finished.',
      done: 'Objective: Project complete. Celebrate with the team or chat with the user about the results.'
    };

    const tasks = useCoreStore.getState().tasks;
    const board = tasks.length > 0
      ? `Kanban Board:\n${tasks.map(t => `- [${t.status.toUpperCase()}] ${t.title}${t.output ? ` (Result: ${t.output})` : ''}`).join('\n')}`
      : 'Kanban Board: Empty';

    return `Identity: ${this.data.name}. Role: ${this.data.description}
Team: [0] User (Client/Art Director)
${team}

${board}

Project Phase: ${phase}
${brief ? `Project Brief: ${brief}` : ''}

Operational Guidelines:
- Use set_user_brief to define the project scope and start working. Only use this when you have gathered enough requirements from the user.
- Use propose_task to delegate work if you are the Lead Agent (only in WORKING phase).
- Use complete_task when your assigned task is finished (only in WORKING phase).
- Use request_consultation to resolve specific technical questions about a task. These tools REQUIRE a taskId and should only be used during the WORKING phase.
- In the IDLE phase, simply chat with the user (index 0) to refine the brief. Do NOT use request_consultation in the IDLE phase.
- When on hold, wait in the boardroom for your target to respond.

Current Objective: ${objectives[phase as keyof typeof objectives] || ''}`;
  }

  public appendHistory(message: LLMMessage) {
    this.history.push(message);
    this.syncToStore();
  }

  public getStatus(): string {
    return `${this.data.name} is ${this.state}${this.currentTaskId ? ` working on ${this.currentTaskId}` : ''}`;
  }

  public setTask(taskId: string | null) {
    this.currentTaskId = taskId;
    if (taskId) {
      this.state = 'working';
    } else {
      this.state = 'idle';
    }
  }

  public setState(state: AgentState) {
    this.state = state;
    useUiStore.getState().setAgentStatus(this.data.index, state);
  }

  public getParticipantIds(): number[] {
    return (this.simulation.getAllAgents() as any[]).map(a => a.data.index);
  }

  public triggerMeeting(agentIndex: number, taskId: string, targetId?: number, message?: string) {
    this.simulation?.onAgentRequestMeeting?.(agentIndex, taskId, targetId, message);
  }

  public dispose() {
    // No-op for now
  }
}
