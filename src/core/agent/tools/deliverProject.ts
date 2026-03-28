import { AgentActionContext } from '../ToolRegistry';
import { useCoreStore } from '../../../integration/store/coreStore';

export function deliverProject(agent: AgentActionContext, args: { output: string }): boolean {
  const store = useCoreStore.getState();
  const { output } = args;

  // VALIDATION: Only Lead Agent (index 1) can deliver
  if (agent.data.index !== 1) {
    console.warn(`[ToolRegistry] Agent ${agent.data.name} attempted deliver_project, but is not the Lead Agent.`);
    return false;
  }
  
  if (store.phase !== 'working') return false;

  store.setFinalOutput(output);
  store.setPhase('done');
  
  // Mark remaining active tasks for this agent as done
  store.tasks.filter(t => t.assignedAgentId === agent.data.index && t.status === 'in_progress')
    .forEach(t => store.updateTaskStatus(t.id, 'done'));
    
  store.addLogEntry({ agentIndex: agent.data.index, action: 'delivered final project results', taskId: undefined });
  
  return true;
}
