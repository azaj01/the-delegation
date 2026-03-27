import { AgentNode } from '../../data/agents';
import { LLMMessage } from '../../core/llm/types';
import { LLMFactory } from '../../core/llm/LLMFactory';
import { useUiStore } from '../../integration/store/uiStore';
import { useCoreStore } from '../../integration/store/coreStore';
import { ToolRegistry } from './ToolRegistry';

export type AgentState = 'idle' | 'moving' | 'working' | 'on_hold' | 'talking';

export class AgentHost {
  public state: AgentState = 'idle';
  private history: LLMMessage[] = [];
  private summary: string = '';
  private currentTaskId: string | null = null;

  constructor(
    public readonly data: AgentNode,
    public readonly simulation: any // We'll type this properly later
  ) { }

  /** Determines if the agent is currently available to respond to user messages. */
  public canChat(): boolean {
    // Only available if idle or explicitly waiting for user input (on_hold)
    return this.state === 'idle' || this.state === 'on_hold';
  }

  public async think(prompt: string, options: {
    isChat?: boolean,
    tools?: any[],
    silent?: boolean
  } = {}): Promise<{ text: string, toolCalls?: any[] }> {
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
    const toolDefs = options.tools || ToolRegistry.getDefinitions();

    // 1. Log Request
    core.addRequestLog({
      agentIndex: this.data.index,
      agentName: this.data.name,
      systemInstruction: systemPrompt,
      contents: messages,
      systemTools: toolDefs,
      taskId: this.currentTaskId || undefined
    });

    try {
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
          return {
            name: tc.function.name,
            args: JSON.parse(tc.function.arguments)
          };
        } catch (e) {
          console.error('[AgentHost] Failed to parse tool arguments', tc.function.arguments);
          return null;
        }
      }).filter(Boolean) || [];

      // Update history
      // If we have tool calls but no text, and it's NOT a silent prompt, 
      // we can provide a default feedback message.
      const isInternalTrigger = options.silent;
      const hasToolCallsOnly = !text && !!response.tool_calls && response.tool_calls.length > 0;
      
      const finalContent = text || (hasToolCallsOnly && !isInternalTrigger ? 'Understood. Setting to work...' : text);
      const isInternalMessage = isInternalTrigger || (hasToolCallsOnly && isInternalTrigger);

      this.history.push({ 
        role: 'assistant', 
        content: finalContent, 
        tool_calls: response.tool_calls,
        metadata: isInternalMessage ? { internal: true } : undefined
      });
      this.syncToStore();

      // Process tools
      for (const tc of toolCalls as any[]) {
        ToolRegistry.process(this, tc);
      }

      return { text, toolCalls };
    } catch (error) {
      console.error(`[AgentHost:${this.data.name}] Thinking error:`, error);
      throw error;
    }
  }

  private syncToStore() {
    useCoreStore.getState().setAgentHistory(this.data.index, this.history);
  }

  private buildSystemPrompt(phase: string, brief: string): string {
    const allAgents = this.simulation.getAllAgents();
    const teamInfo = allAgents.map((a: any) => `- Agent index ${a.data.index}: ${a.data.name} (${a.data.description || 'Specialist'})`).join('\n');

    let context = `You are ${this.data.name}. ${this.data.instruction}\n\n`;
    context += `AVAILABLE TEAM MEMBERS:\n${teamInfo}\n\n`;
    context += `Current Project Phase: ${phase}\n`;
    if (brief) context += `User Brief: ${brief}\n`;

    if (phase === 'idle') {
      context += `Objective: You are currently waiting for the project to start. If you are the Lead Agent, your goal is to chat with the user to define a clear user brief (max 300 words). Once defined, use the set_user_brief tool. If you are a subagent, you are just relaxing until the work begins.`;
    } else if (phase === 'working') {
      context += `Objective: The project is underway. Collaborate with your team to complete the tasks on the Kanban board. When proposing tasks with propose_task, you MUST assign them only to existing team members using their correct agent index. If you need feedback or consensus, move to the ballroom and use consult_agent.`;
    } else if (phase === 'done') {
      context += `Objective: The project is complete! If you are the Lead Agent, deliver the results to the user with pride.`;
    }

    return context;
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
  }

  public dispose() {
    // No-op for now, but ready for future cleanup
  }
}
