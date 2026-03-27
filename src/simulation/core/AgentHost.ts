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
    private readonly simulation: any // We'll type this properly later
  ) {}

  /** Determines if the agent is currently available to respond to user messages. */
  public canChat(): boolean {
    // Only available if idle or explicitly waiting for user input (on_hold)
    return this.state === 'idle' || this.state === 'on_hold';
  }

  public async think(prompt: string, options: { 
    isChat?: boolean, 
    tools?: any[] 
  } = {}): Promise<{ text: string, toolCalls?: any[] }> {
    const core = useCoreStore.getState();
    const llmConfig = useUiStore.getState().llmConfig;
    const provider = LLMFactory.getProvider(llmConfig);
    const model = this.data.model || llmConfig.model;

    const messages: LLMMessage[] = [
      ...this.history,
      { role: 'user', content: prompt }
    ];

    const systemPrompt = this.buildSystemPrompt(core.phase, core.clientBrief);
    const toolDefs = options.tools || ToolRegistry.getDefinitions();

    try {
      const response = await provider.generateCompletion(
        messages, 
        toolDefs, 
        systemPrompt, 
        model
      );

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
      this.history.push({ role: 'assistant', content: text, tool_calls: response.tool_calls });
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
    let context = `You are ${this.data.name}. ${this.data.instruction}\n\n`;
    context += `Current Project Phase: ${phase}\n`;
    if (brief) context += `Project Brief: ${brief}\n`;
    
    if (phase === 'idle') {
      context += `Objective: You are currently waiting for the project to start. If you are the Lead Agent, your goal is to chat with the user to define a clear 'clientBrief' (max 300 words). Once defined, use the set_client_brief tool. If you are a subagent, you are just relaxing until the work begins.`;
    } else if (phase === 'working') {
      context += `Objective: The project is underway. Collaborate with your team to complete the tasks on the Kanban board. If you need feedback or consensus, move to the ballroom and use consult_agent.`;
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
}
