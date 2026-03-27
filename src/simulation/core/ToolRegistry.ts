import { useCoreStore } from '../../integration/store/coreStore';
import { AgentHost } from './AgentHost';

export interface ToolCall {
  name: string;
  args: any;
}

export class ToolRegistry {
  public static process(agent: AgentHost, toolCall: ToolCall): boolean {
    const store = useCoreStore.getState();
    const { name, args } = toolCall;

    switch (name) {
      case 'set_client_brief': {
        const { brief } = args;
        store.setClientBrief(brief);
        store.setPhase('working');
        store.addLogEntry({
          agentIndex: agent.data.index,
          action: 'defined project brief',
          taskId: undefined
        });
        return true;
      }

      case 'propose_task': {
        const { title, description, agentIds, requiresApproval } = args;
        store.addTask({
          title,
          description,
          assignedAgentIds: agentIds,
          status: 'scheduled',
          requiresClientApproval: requiresApproval || false
        });
        return true;
      }

      case 'complete_task': {
        const { taskId, output } = args;
        store.updateTaskStatus(taskId, 'done');
        store.setTaskOutput(taskId, output);
        return true;
      }

      case 'request_approval': {
        const { taskId, question } = args;
        store.updateTaskStatus(taskId, 'on_hold');
        agent.setState('on_hold');
        store.setPendingApproval(taskId);
        // Move to boardroom for feedback
        (agent as any).simulation?.onAgentRequestMeeting?.(agent.data.index, taskId);
        return true;
      }

      case 'consult_agent': {
        const { targetId, taskId, message } = args;
        store.updateTaskStatus(taskId, 'on_hold');
        agent.setState('on_hold');
        
        // Trigger multi-agent meeting in boardroom
        (agent as any).simulation?.onAgentRequestMeeting?.(agent.data.index, taskId, targetId);
        
        console.log(`[ToolRegistry] Agent ${agent.data.name} requested meeting with ${targetId} for task ${taskId}: ${message}`);
        return true;
      }

      case 'deliver_project': {
        const { output } = args;
        store.setFinalOutput(output);
        store.setPhase('done');
        store.setFinalOutputOpen(true);
        return true;
      }

      default:
        console.warn(`[ToolRegistry] Unknown tool: ${name}`);
        return false;
    }
  }

  public static getDefinitions(): any[] {
    return [
      {
        type: 'function',
        function: {
          name: 'set_client_brief',
          description: 'Set the final project brief and transition to the working phase. Lead Agent only.',
          parameters: {
            type: 'object',
            properties: {
              brief: { type: 'string', description: 'The project brief (max 300 words)' }
            },
            required: ['brief']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'propose_task',
          description: 'Propose a new task for the Kanban board.',
          parameters: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              agentIds: { type: 'array', items: { type: 'number' }, description: 'Indices of agents assigned to this task' },
              requiresApproval: { type: 'boolean' }
            },
            required: ['title', 'description', 'agentIds']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'complete_task',
          description: 'Mark a task as completed and provide the output.',
          parameters: {
            type: 'object',
            properties: {
              taskId: { type: 'string' },
              output: { type: 'string', description: 'The result of the task' }
            },
            required: ['taskId', 'output']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'request_approval',
          description: 'Pause a task and request user feedback in the boardroom.',
          parameters: {
            type: 'object',
            properties: {
              taskId: { type: 'string' },
              question: { type: 'string', description: 'What you need to ask the user' }
            },
            required: ['taskId', 'question']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'consult_agent',
          description: 'Request a meeting with another agent in the boardroom.',
          parameters: {
            type: 'object',
            properties: {
              targetId: { type: 'number', description: 'Index of the agent to consult' },
              taskId: { type: 'string', description: 'The task context' },
              message: { type: 'string', description: 'Opening message for the debate' }
            },
            required: ['targetId', 'taskId', 'message']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'deliver_project',
          description: 'Provide the final project deliverable and finish the project. Lead Agent only.',
          parameters: {
            type: 'object',
            properties: {
              output: { type: 'string', description: 'The final .md content or result' }
            },
            required: ['output']
          }
        }
      }
    ];
  }
}
