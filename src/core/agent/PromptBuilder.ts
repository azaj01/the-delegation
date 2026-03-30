import { AgentNode, AGENTIC_SETS } from '../../data/agents';
import { useCoreStore } from '../../integration/store/coreStore';
import { useTeamStore } from '../../integration/store/teamStore';

export class PromptBuilder {
  /**
   * Builds the system prompt for an agent based on their role and current project context.
   */
  public static buildSystemPrompt(agent: AgentNode, phase: string, brief: string, allAgents: any[]): string {
    const isLead = agent.index === 1;
    const team = allAgents
      .map((a: any) => `[${a.data.index}] ${a.data.name}`)
      .join(', ');

    const objectives = {
      idle: isLead ? 'Chat with [0] to define brief, then set_user_brief.' : 'Wait for Lead to start.',
      working: isLead ? 'Manage board. deliver_project when all Done.' : 'Complete tasks.',
      done: 'Project finished.'
    };

    const tasks = useCoreStore.getState().tasks;
    const board = tasks.length > 0
      ? tasks.map(t => {
          const agentName = allAgents.find((a: any) => a.data.index === t.assignedAgentId)?.data?.name || `Agent ${t.assignedAgentId}`;
          const outputStr = t.output ? `\n   Result: ${t.output}` : '';
          return `- [${t.status.toUpperCase()}] ${t.title} (${agentName})${outputStr}`;
        }).join('\n')
      : 'Empty';

    const selectedTeamId = useTeamStore.getState().selectedAgentSetId;
    const activeTeam = useTeamStore.getState().customSystems.find(s => s.id === selectedTeamId) 
      || AGENTIC_SETS.find(s => s.id === selectedTeamId);
      
    const outputInstruction = activeTeam?.outputType !== 'text' 
      ? `\n4. TEAM OUTPUT: ${activeTeam?.outputType?.toUpperCase()}. Your 'deliver_project' output MUST be a highly detailed PROMPT for a ${activeTeam?.outputType} generator model (${activeTeam?.outputModel}).`
      : '';

    const pendingReviews = tasks.filter(t => t.assignedAgentId === agent.index && t.reviewComments);
    const reviewContext = pendingReviews.length > 0
      ? `\nREVISION REQUESTED:\n${pendingReviews.map(t => `- [${t.title}] Feedback: ${t.reviewComments}`).join('\n')}`
      : '';

    return `ID: ${agent.name}. Role: ${agent.description}. Phase: ${phase}.
${brief ? `Brief: ${brief}` : ''}${reviewContext}
Team: User (0), ${team}
KANBAN:
${board}
RULES:
1. MAX 30 WORDS for chat. Task results ('complete_task', 'deliver_project') MUST be direct Markdown. NO intros, outros, or self-attribution ("Done by X"). Focus on data.
2. Tools only in WORKING (except set_user_brief in IDLE).
3. QUALITY: If your node has 'Human-in-the-loop' enabled, your 'complete_task' result will be reviewed by the user before completion. 
4. NO META-TALK: Avoid "I have finished X", "Here is the result". Use the tool payload for content and Chat for conversation only.${outputInstruction}
Goal: ${objectives[phase as keyof typeof objectives] || ''}`;
  }
}
