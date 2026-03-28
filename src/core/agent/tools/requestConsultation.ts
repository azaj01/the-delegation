import { AgentActionContext } from '../ToolRegistry';
import { useCoreStore } from '../../../integration/store/coreStore';

export function requestConsultation(agent: AgentActionContext, args: { targetId: number, taskId: string, message: string }): boolean {
  const store = useCoreStore.getState();
  const { targetId, taskId, message } = args;

  store.holdTaskForConsultation(taskId, targetId);
  agent.setState('on_hold');
  
  // Pause other active tasks for this agent
  store.tasks.filter(t => t.id !== taskId && t.assignedAgentId === agent.data.index && t.status === 'in_progress')
    .forEach(t => store.updateTaskStatus(t.id, 'scheduled'));
    
  store.addLogEntry({ agentIndex: agent.data.index, action: `requested consultation with ${targetId === 0 ? 'User' : 'agent ' + targetId}`, taskId });
  
  const isUserTarget = targetId === 0;
  agent.appendHistory({
    role: 'assistant',
    content: isUserTarget 
      ? `I need to consult with you about this task: "${message}"`
      : `I've paused my work to consult with another agent about this task: "${message}"`
  });
  
  agent.triggerMeeting?.(agent.data.index, taskId, targetId, message);
  
  return true;
}
