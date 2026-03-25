import { getAllAgents } from '../data/agents';
import { AgentFunctionCall } from './coreService';
import { useCoreStore } from './store/coreStore';
import { getActiveAgentSet } from './store/teamStore';

export class ToolHandlerService {
  static process(
    fn: AgentFunctionCall,
    callerIndex: number
  ): boolean {
    const store = useCoreStore.getState();

    switch (fn.name) {
      case 'propose_task': {
        if (store.phase === 'done') {
          console.warn('[ToolHandler] Attempted to propose task while project is DONE');
          return false;
        }

        const { agentIds, title, description, requiresApproval } = fn.args as {
          agentIds: number[];
          title: string;
          description: string;
          requiresApproval: boolean;
        };
        const task = store.addTask({
          title: title || 'New Task',
          description,
          assignedAgentIds: agentIds,
          status: 'scheduled',
          requiresClientApproval: requiresApproval ?? false,
        });

        const assignedRoles = (agentIds || [])
          .map(i => getAllAgents(getActiveAgentSet()).find(a => a.index === i)?.name || `Agent #${i}`)
          .join(', ');

        store.addLogEntry({
          agentIndex: callerIndex,
          action: `proposed task "${title || description}" → assigned to ${assignedRoles}`,
          taskId: task.id,
        });

        if (store.phase === 'idle') {
          store.setPhase('working');
        }
        return true;
      }

      case 'request_client_approval': {
        const { taskId } = fn.args as { taskId: string;};
        store.updateTaskStatus(taskId, 'on_hold');
        store.addLogEntry({
          agentIndex: callerIndex,
          action: 'requested client approval',
          taskId,
        });

        if (store.phase !== 'working' && store.phase !== 'done') {
           store.setPhase('working');
        }
        return true;
      }

      case 'receive_client_approval': {
        const { taskId } = fn.args as { taskId: string };

        const task = store.tasks.find(t => t.id === taskId);
        if (!task) {
          console.warn(`[ToolHandler] Agent tried to approve non-existent task: ${taskId}`);
          return false;
        }

        store.updateTaskStatus(taskId, 'in_progress');
        store.addLogEntry({
          agentIndex: callerIndex,
          action: `received client approval - resuming work`,
          taskId,
        });

        return true;
      }

      case 'complete_task': {
        const { taskId, output } = fn.args as { taskId: string; output: string };
        const task = store.tasks.find(t => t.id === taskId);
        if (!task) {
          console.warn(`[ToolHandler] Agent tried to complete non-existent task: ${taskId}`);
          return false;
        }

        store.updateTaskStatus(taskId, 'done');
        store.setTaskOutput(taskId, output);
        
        // --- AUTOMATIC FLOW TRIGGER ---
        const activeSet = getActiveAgentSet();
        const agents = getAllAgents(activeSet);
        const callerAgent = agents.find(a => a.index === callerIndex);

        if (callerAgent && callerAgent.nextId) {
          const nextAgent = agents.find(a => a.id === callerAgent.nextId);
          if (nextAgent) {
            store.addTask({
              title: `Follow-up: ${task.title}`,
              description: `Previous task output: ${output.slice(0, 100)}...\n\nPlease continue the workflow.`,
              assignedAgentIds: [nextAgent.index],
              status: 'scheduled',
              requiresClientApproval: false,
            });
            
            store.addLogEntry({
              agentIndex: callerIndex,
              action: `completed task → auto-triggering ${nextAgent.name}`,
              taskId,
            });
            return true;
          }
        }

        store.addLogEntry({
          agentIndex: callerIndex,
          action: `completed task`,
          taskId,
        });
        return true;
      }

      case 'request_revision': {
        const { taskId, feedback } = fn.args as { taskId: string; feedback: string };
        const task = store.tasks.find(t => t.id === taskId);
        if (!task) return false;

        const activeSet = getActiveAgentSet();
        const agents = getAllAgents(activeSet);
        const callerAgent = agents.find(a => a.index === callerIndex);

        if (callerAgent && callerAgent.retryId) {
          const retryAgent = agents.find(a => a.id === callerAgent.retryId);
          if (retryAgent) {
            // Move current task to done (it failed but we are creating a new one or looping)
            store.updateTaskStatus(taskId, 'done'); 
            
            store.addTask({
              title: `Revision: ${task.title}`,
              description: `Feedback: ${feedback}\n\nPlease revise the previous work.`,
              assignedAgentIds: [retryAgent.index],
              status: 'scheduled',
              requiresClientApproval: false,
            });

            store.addLogEntry({
              agentIndex: callerIndex,
              action: `requested revision → sending back to ${retryAgent.name}`,
              taskId,
            });
            return true;
          }
        }
        return false;
      }

      case 'notify_client_project_ready': {
        const { finalPrompt } = fn.args as { finalPrompt: string };
        store.setFinalOutput(finalPrompt);
        store.setPhase('done');
        store.addLogEntry({
          agentIndex: callerIndex,
          action: `delivered final prompt to client`,
        });
        return true;
      }
      default:
        console.warn(`[ToolHandler] Unknown function: ${fn.name}`);
        return false;
    }
  }
}
