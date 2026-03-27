import { AgentNode, MAX_AGENTS_PER_TASK } from '../../data/agents';
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
          const scene = (window as any).sceneManager;
          if (scene && useUiStore.getState().isChatting) {
            scene.endChat();
          }
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
    const team = this.simulation.getAllAgents()
      .map((a: any) => `[${a.data.index}] ${a.data.name}: ${a.data.description || 'Specialist'}`)
      .join('\n');

    const objectives = {
      idle: 'Lead: Chat with the user (index 0) about the brief, then use set_user_brief. Others: Wait.',
      working: 'Collaborate on tasks. If ALL board tasks are Done, Lead Agent MUST use deliver_project to finish the project.',
      done: 'Lead: Results delivered. Chat with the user or celebrate the project completion.'
    };

    const tasks = useCoreStore.getState().tasks;
    const board = tasks.length > 0
      ? `Kanban Board:\n${tasks.map(t => `- [${t.status.toUpperCase()}] ${t.title}${t.output ? ` (Result: ${t.output})` : ''}`).join('\n')}`
      : 'Kanban Board: Empty';

    return `Identity: ${this.data.name}. Role: ${this.data.instruction}
Team: [0] User (Client/Art Director)
${team}

${board}

Project Phase: ${phase}
${brief ? `Project Brief: ${brief}` : ''}
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
  }

  public dispose() {
    // No-op for now, but ready for future cleanup
  }
}
