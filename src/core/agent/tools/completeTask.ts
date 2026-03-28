import { AgentActionContext } from '../ToolRegistry';
import { useCoreStore } from '../../../integration/store/coreStore';

export function completeTask(agent: AgentActionContext, args: { taskId: string, output: string }): boolean {
  const store = useCoreStore.getState();
  const { taskId, output } = args;

  store.updateTaskStatus(taskId, 'done');
  store.setTaskOutput(taskId, output);
  store.addLogEntry({ agentIndex: agent.data.index, action: `completed task`, taskId });
  
  return true;
}
