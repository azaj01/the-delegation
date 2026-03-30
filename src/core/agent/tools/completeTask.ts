import { AgentActionContext } from '../ToolRegistry';
import { useCoreStore } from '../../../integration/store/coreStore';
import { requestConsultation } from './requestConsultation';

export function completeTask(agent: AgentActionContext, args: { taskId: string, output: string }): boolean {
  const store = useCoreStore.getState();
  const { taskId, output } = args;

  // HUMAN-IN-THE-LOOP: If agent requires validation, redirect to consultation instead of completing
  if (agent.data.humanInTheLoop) {
    return requestConsultation(agent, {
      targetId: 0, // User
      taskId,
      message: `I've finished the task. Please review the output below before I finalize it:\n\n${output}`
    });
  }

  store.updateTaskStatus(taskId, 'done');
  store.setTaskOutput(taskId, output);
  store.addLogEntry({ agentIndex: agent.data.index, action: `completed task`, taskId });
  
  return true;
}
