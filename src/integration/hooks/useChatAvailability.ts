import { getAllAgents } from '../../data/agents'
import { useCoreStore } from '../store/coreStore'
import { useActiveTeam } from '../store/teamStore'
import { useUiStore } from '../store/uiStore'

export interface ChatAvailability {
  canChat: boolean
  reason: string
}

/**
 * Derives whether the player can chat with a given agent based on
 * the current project phase and the agent's task state.
 */
export function useChatAvailability(agentIndex: number | null): ChatAvailability {
  const { phase, tasks } = useCoreStore()
  const agentStatus = useUiStore((s) => (agentIndex !== null ? s.agentStatuses[agentIndex] : 'idle'))
  const system = useActiveTeam()
  const agents = getAllAgents(system)

  const ORCHESTRATOR_INDEX = system.leadAgent.index

  if (agentIndex === null) return { canChat: false, reason: '' }

  const agent = agents.find((a) => a.index === agentIndex)
  if (!agent) return { canChat: false, reason: '' }

  // 1. Idle Phase: Only Lead Agent can chat (to set the brief)
  if (phase === 'idle') {
    if (agentIndex === ORCHESTRATOR_INDEX) return { canChat: true, reason: '' }
    return { canChat: false, reason: 'Waiting for project brief' }
  }

  // 2. Working Phase: Lead Agent can always talk (manager). Others only when idle.
  if (phase === 'working') {
    const isLeadAgent = agentIndex === ORCHESTRATOR_INDEX
    const activeTask = tasks.find((t) => t.assignedAgentId === agentIndex && t.status === 'in_progress')

    if (isLeadAgent && !activeTask) {
      return { canChat: true, reason: '' }
    }

    if (agentStatus === 'idle') return { canChat: true, reason: '' }

    // Provide specific reason for busy agents
    if (agentStatus === 'on_hold') return { canChat: false, reason: 'Review requested...' }

    if (activeTask) return { canChat: false, reason: `Working on: "${activeTask.title}"` }

    return { canChat: false, reason: 'Agent is busy' }
  }

  // 3. Completed Phase: No chat
  return { canChat: false, reason: 'Project completed' }
}
