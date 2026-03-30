import { AgentNode } from '../../data/agents';
import { LLMMessage } from '../../core/llm/types';
import { AgentState } from '../../types';
import { LLMFactory } from '../../core/llm/LLMFactory';
import { useUiStore } from '../../integration/store/uiStore';
import { useCoreStore } from '../../integration/store/coreStore';
import { useTeamStore } from '../../integration/store/teamStore';
import { AGENTIC_SETS } from '../../data/agents';
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
    return this.state === 'idle';
  }

  public async think(prompt: string, options: {
    isChat?: boolean,
    tools?: any[],
    silent?: boolean
  } = {}): Promise<{ text: string, toolCalls?: any[] }> {
    if (this.isThinking) return { text: '', toolCalls: [] };
    this.isThinking = true;

    try {
      this.refreshFromStore();
      const core = useCoreStore.getState();
      const llmConfig = useUiStore.getState().llmConfig;
      const provider = LLMFactory.getProvider(llmConfig);
      const model = this.data.model || llmConfig.model;

      // Append user prompt to history FIRST if it's not already there (autonomous triggers)
      // For chat, SceneManager already added it to the store, and refreshFromStore loaded it.
      if (!options.isChat) {
        this.history.push({
          role: 'user',
          content: prompt,
          metadata: options.silent ? { internal: true } : undefined
        });
        this.syncToStore();
      }

      // Prune history to last 10 messages to save tokens
      const messages: LLMMessage[] = this.history.slice(-10);
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
      const isResolution = false; // No more autonomous resolutions via tools while on_hold
      let finalContent = text;
      const isMalformed = response.finishReason === 'MALFORMED_FUNCTION_CALL';

      if (isMalformed) {
        finalContent = 'ERROR: Your last response was a malformed function call. Please try again with valid arguments for the tools.';
        console.warn(`[AgentHost:${this.data.name}] Malformed function call detected.`);
      } else if (hasToolCallsOnly && !isInternalTrigger) {
        finalContent = isBrief
          ? "Perfect! I've set the project brief based on our chat. Let's get to work!"
          : 'Understood. I am going back to work now.';
      } else if (!text && !response.tool_calls && !isInternalTrigger) {
        // Fallback for empty responses that are NOT malformed but also not tool calls
        finalContent = '... (Thinking)';
      }

      // Auto-close chat for system acknowledgments after tool calls
      if (options.isChat && (isBrief || isResolution)) {
        setTimeout(() => {
          if (useUiStore.getState().isChatting) useUiStore.getState().setChatting(false);
          // Return to Project View (Dashboard) by deselecting the NPC
          useUiStore.getState().setSelectedNpc(null);
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
        const handled = ToolRegistry.process(this, tc as any);
        // SPECIAL: If deliver_project was called, check if we need multimodal generation
        if (tc.name === 'deliver_project' && handled) {
          this.handleFinalAssetGeneration(tc.args.output);
        }
      }

      // If we were on hold and resolved it via tool calls, go back to idle so simulation continues
      if (isResolution) {
        this.setState('idle');
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

  private async handleFinalAssetGeneration(prompt: string) {
    const core = useCoreStore.getState();
    const teamId = useTeamStore.getState().selectedAgentSetId;
    const activeTeam = useTeamStore.getState().customSystems.find(s => s.id === teamId) 
      || AGENTIC_SETS.find(s => s.id === teamId);

    if (!activeTeam || activeTeam.outputType === 'text') return;

    try {
      const llmConfig = useUiStore.getState().llmConfig;
      const provider = LLMFactory.getProvider(llmConfig) as any;
      const model = activeTeam.outputModel || llmConfig.model;

      core.addLogEntry({
        agentIndex: 0, // System
        action: `Generating final ${activeTeam.outputType} using ${model}...`,
        taskId: undefined
      });

      let assetContent: string = '';
      let usage: any = undefined;

      if (activeTeam.outputType === 'image') {
        const result = await provider.generateMultimodal(prompt, model, ["IMAGE", "TEXT"]);
        assetContent = result.data || '';
        usage = result.usage;
      } else if (activeTeam.outputType === 'music') {
        const result = await provider.generateMultimodal(prompt, model, ["AUDIO", "TEXT"]);
        assetContent = result.data || '';
        usage = result.usage;
      } else if (activeTeam.outputType === 'video') {
        const result = await provider.generateVideo(prompt, model, (msg) => {
          console.log(`[System:Video] ${msg}`);
        });
        assetContent = result.videoUrl || '';
        usage = result.usage;
      }

      // 2. Log Response for the Generation (System action)
      core.addResponseLog({
        agentIndex: 0, // System
        agentName: 'System',
        content: `Final ${activeTeam.outputType} generated successfully.`,
        usage: usage,
        raw: { model, ...usage },
        taskId: undefined
      });

      core.setFinalAsset(activeTeam.outputType === 'music' ? 'audio' : activeTeam.outputType as any, assetContent);
      core.setPhase('done');
      core.setFinalOutputOpen(true);
    } catch (error) {
      console.error('[AgentHost] Final asset generation failed:', error);
      core.setIsGeneratingAsset(false);
      core.addLogEntry({
        agentIndex: 0,
        action: `Error generating final ${activeTeam.outputType}: ${error instanceof Error ? error.message : String(error)}`,
        taskId: undefined
      });
    }
  }

  private refreshFromStore() {
    const history = useCoreStore.getState().agentHistories[this.data.index];
    if (history) {
      this.history = [...history];
    }
  }

  private syncToStore() {
    useCoreStore.getState().setAgentHistory(this.data.index, this.history);
  }

  private buildSystemPrompt(phase: string, brief: string): string {
    const isLead = this.data.index === 1;
    const team = this.simulation.getAllAgents()
      .map((a: any) => `[${a.data.index}] ${a.data.name}`)
      .join(', ');

    const objectives = {
      idle: isLead ? 'Chat with [0] to define brief, then set_user_brief.' : 'Wait for Lead to start.',
      working: isLead ? 'Manage board. deliver_project when all Done.' : 'Complete tasks.',
      done: 'Project finished.'
    };

    const allAgents = this.simulation.getAllAgents();
    const tasks = useCoreStore.getState().tasks;
    const board = tasks.length > 0
      ? tasks.map(t => {
          const agentName = allAgents.find((a: any) => a.data.index === t.assignedAgentId)?.data?.name || `Agent ${t.assignedAgentId}`;
          const outputStr = t.output ? `\n   Result: ${t.output}` : '';
          return `- [${t.status.toUpperCase()}] ${t.title} (${agentName})${outputStr}`;
        }).join('\n')
      : 'Empty';

    const activeTeam = useTeamStore.getState().customSystems.find(s => s.id === useTeamStore.getState().selectedAgentSetId) 
      || AGENTIC_SETS.find(s => s.id === useTeamStore.getState().selectedAgentSetId);
    const outputInstruction = activeTeam?.outputType !== 'text' 
      ? `\n4. TEAM OUTPUT: ${activeTeam?.outputType?.toUpperCase()}. Your 'deliver_project' output MUST be a highly detailed PROMPT for a ${activeTeam?.outputType} generator model (${activeTeam?.outputModel}).`
      : '';

    const pendingReviews = tasks.filter(t => t.assignedAgentId === this.data.index && t.reviewComments);
    const reviewContext = pendingReviews.length > 0
      ? `\nREVISION REQUESTED:\n${pendingReviews.map(t => `- [${t.title}] Feedback: ${t.reviewComments}`).join('\n')}`
      : '';

    return `ID: ${this.data.name}. Role: ${this.data.description}. Phase: ${phase}.
${brief ? `Brief: ${brief}` : ''}${reviewContext}
Team: User (0), ${team}
KANBAN:
${board}
RULES:
1. MAX 30 WORDS for chat. Task planning and results ('propose_task', 'complete_task', 'deliver_project') MUST be concise and direct (Markdown). Avoid wordy introductions or conclusions; focus on the data/deliverable.
2. Tools only in WORKING (except set_user_brief in IDLE).
3. QUALITY: If your node has 'Human-in-the-loop' enabled, your 'complete_task' result will be reviewed by the user before completion. 
If your work is rejected, you will see 'REVISION REQUESTED' above. Use this feedback to improve and call 'complete_task' again once ready.${outputInstruction}
Goal: ${objectives[phase as keyof typeof objectives] || ''}`;
  }

  public appendHistory(message: LLMMessage) {
    this.refreshFromStore();
    this.history.push(message);
    this.syncToStore();
  }

  public getStatus(): string {
    return `${this.data.name} is ${this.state}${this.currentTaskId ? ` working on ${this.currentTaskId}` : ''}`;
  }

  public setTask(taskId: string | null) {
    this.currentTaskId = taskId;
    this.setState(taskId ? 'working' : 'idle');
  }

  public setState(state: AgentState) {
    this.state = state;
    useUiStore.getState().setAgentStatus(this.data.index, state);
  }



  public dispose() {
    // No-op for now
  }
}
