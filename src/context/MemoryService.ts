import { LLMFactory } from '../core/llm/LLMFactory';
import { handleLLMError } from '../integration/coreService';
import { useCoreStore } from '../integration/store/coreStore';
import { getAllAgents } from '../data/agents';
import { getActiveAgentSet } from '../integration/store/teamStore';
import { useUiStore } from '../integration/store/uiStore';

/**
 * MemoryService - Handles long-term memory, summaries, and history management.
 * Part of the 'Context' pillar.
 */
export class MemoryService {
  static async updateAgentSummary(agentIndex: number) {
    const store = useCoreStore.getState();
    const llmConfig = useUiStore.getState().llmConfig;

    try {
      const provider = LLMFactory.getProvider(llmConfig);
      const history = store.agentHistories[agentIndex] || [];
      const previousSummary = store.agentSummaries[agentIndex] || 'No previous summary.';

      // We only take the last 10 messages for incremental refinement to keep context clean
      const recentHistory = history.slice(-10);
      const transcript = recentHistory
        .map(m => `${m.role.toUpperCase()}: ${m.content}`)
        .join('\n\n');

      const prompt = `Your task is to update and refine the conversation summary for an agent.
PREVIOUS SUMMARY:
${previousSummary}

NEW MESSAGES:
${transcript}

Update the summary to include any new topics, decisions, or information from the NEW MESSAGES.
Keep the summary concise but informative. If the new messages contain no new information, simply return the PREVIOUS SUMMARY exactly as it is.`;

      const agentData = getAllAgents(getActiveAgentSet()).find(a => a.index === agentIndex);
      const agentName = agentData?.name || `Agent ${agentIndex}`;


      const messages = [{ role: 'user' as const, content: 'Please update the conversation summary.' }];

      const response = await provider.generateCompletion(
        messages,
        [],
        prompt,
        llmConfig.model
      );

      // LOG REQUEST (using mapped data from provider)
      if (response.request) {
        store.addRequestLog({
          agentIndex: -1,
          agentName: 'System',
          systemInstruction: response.request.systemInstruction,
          contents: response.request.contents,
          systemTools: response.request.tools,
        });
      }

      // LOG RESPONSE
      store.addResponseLog({
        agentIndex: -1,
        agentName: 'System',
        content: response.content,
        tool_calls: response.tool_calls,
        usage: response.usage,
        raw: response.raw,
      });

      if (response.content && response.content !== previousSummary) {
        store.setAgentSummary(agentIndex, response.content);
        // Sync to global brief
        // await this.updateProjectBrief(response.content);
      }
    } catch (e) {
      handleLLMError(e);
      console.error('[MemoryService] Failed to update agent summary', e);
    }
  }

  static async updateProjectBrief(newInfo: string) {
    const store = useCoreStore.getState();
    const llmConfig = useUiStore.getState().llmConfig;
    const currentBrief = store.clientBrief || 'No project brief defined yet.';

    try {
      const provider = LLMFactory.getProvider(llmConfig);
      const prompt = `You are the Lead Architect. Your job is to maintain the OFFICIAL PROJECT BRIEF.
You have received new information from a team member's conversation with the client.

CURRENT PROJECT BRIEF:
${currentBrief}

NEW INFORMATION:
${newInfo}

Refine the PROJECT BRIEF by incorporating the NEW INFORMATION.
- VERY IMPORTANT: Keep the brief CONCISE and BRIEF (max 150 words).
- Use a clear structure (Goals, Scope, Constraints).
- If the new info adds requirements, add them.
- If it contradicts the previous brief, update the brief to reflect the latest user feedback.
- If the new info contains nothing relevant to the project brief, return the CURRENT PROJECT BRIEF exactly.`;

      const leadAgent = getActiveAgentSet().leadAgent;
      const messages = [{ role: 'user' as const, content: 'Refine the project brief.' }];

      const response = await provider.generateCompletion(
        messages,
        [],
        prompt,
        llmConfig.model
      );

      // LOG REQUEST (using mapped data from provider)
      if (response.request) {
        store.addRequestLog({
          agentIndex: -1,
          agentName: 'System',
          systemInstruction: response.request.systemInstruction,
          contents: response.request.contents,
          systemTools: response.request.tools,
        });
      }

      // LOG RESPONSE
      store.addResponseLog({
        agentIndex: -1,
        agentName: 'System',
        content: response.content,
        tool_calls: response.tool_calls,
        usage: response.usage,
        raw: response.raw,
      });

      if (response.content && response.content !== currentBrief) {
        store.setClientBrief(response.content);
      }
    } catch (e) {
      handleLLMError(e);
      console.error('[MemoryService] Failed to update project brief', e);
    }
  }
}
