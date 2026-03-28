import { useCoreStore } from '../../integration/store/coreStore';
import { LLMMessage } from '../llm/types';

export interface ToolCall {
  name: string;
  args: any;
}

/**
 * Interface that decuples the ToolRegistry from the 3D Simulation (AgentHost).
 * This allows the tool logic to be tested and used independently of the simulation.
 */
export interface AgentActionContext {
  data: { index: number; name: string };
  setState: (state: 'idle' | 'moving' | 'working' | 'on_hold' | 'talking') => void;
  appendHistory: (message: LLMMessage) => void;
  triggerMeeting?: (agentIndex: number, taskId: string, targetId?: number, message?: string) => void;
  getParticipantIds: () => number[];
}

export class ToolRegistry {
  /**
   * Processes a tool call by updating the global state and triggering necessary agent/simulation side effects.
   */
  public static process(agent: AgentActionContext, toolCall: ToolCall): boolean {
    const store = useCoreStore.getState();
    const { name, args } = toolCall;

    switch (name) {
      case 'set_user_brief': {
        const { brief } = args;
        // VALIDATION: Only Lead Agent (index 1) can set the brief
        if (agent.data.index !== 1) {
          console.warn(`[ToolRegistry] Agent ${agent.data.name} attempted set_user_brief, but is not the Lead Agent.`);
          return false;
        }
        if (store.phase !== 'idle') return false;

        store.startProject(brief);
        store.addLogEntry({ agentIndex: agent.data.index, action: 'defined project brief', taskId: undefined });
        return true;
      }

      case 'propose_task': {
        const { title, description, agentId, requiresApproval } = args;
        const validAgentIds = agent.getParticipantIds();
        const finalAgentId = validAgentIds.includes(agentId) ? agentId : agent.data.index;

        const newTask = store.addTask({
          title, description, assignedAgentId: finalAgentId, status: 'scheduled',
          requiresUserApproval: requiresApproval || false
        });
        store.addLogEntry({ agentIndex: agent.data.index, action: `proposed task: "${title}"`, taskId: newTask.id });
        return true;
      }

      case 'complete_task': {
        const { taskId, output } = args;
        store.updateTaskStatus(taskId, 'done');
        store.setTaskOutput(taskId, output);
        store.addLogEntry({ agentIndex: agent.data.index, action: `completed task`, taskId });
        return true;
      }

      case 'request_approval': {
        const { taskId, question } = args;
        store.holdTaskForConsultation(taskId, 0); // 0 is the User
        agent.setState('on_hold');
        
        // Pause other active tasks for this agent
        store.tasks.filter(t => t.id !== taskId && t.assignedAgentId === agent.data.index && t.status === 'in_progress')
          .forEach(t => store.updateTaskStatus(t.id, 'scheduled'));
        
        store.setPendingApproval(taskId);
        store.addLogEntry({ agentIndex: agent.data.index, action: `requested user approval — "${question}"`, taskId });
        agent.appendHistory({ role: 'assistant', content: `I need your approval to continue with the task: "${question}"` });
        
        agent.triggerMeeting?.(agent.data.index, taskId);
        return true;
      }

      case 'consult_agent': {
        const { targetId, taskId, message } = args;
        store.holdTaskForConsultation(taskId, targetId);
        agent.setState('on_hold');
        
        // Pause other active tasks for this agent
        store.tasks.filter(t => t.id !== taskId && t.assignedAgentId === agent.data.index && t.status === 'in_progress')
          .forEach(t => store.updateTaskStatus(t.id, 'scheduled'));
          
        store.addLogEntry({ agentIndex: agent.data.index, action: `requested consultation with agent ${targetId}`, taskId });
        
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

      case 'deliver_project': {
        const { output } = args;
        // VALIDATION: Only Lead Agent (index 1) can deliver
        if (agent.data.index !== 1) {
          console.warn(`[ToolRegistry] Agent ${agent.data.name} attempted deliver_project, but is not the Lead Agent.`);
          return false;
        }
        if (store.phase !== 'working') return false;

        store.setFinalOutput(output);
        store.setPhase('done');
        
        // Mark remaining active tasks as done (optional, but keep for consistency)
        store.tasks.filter(t => t.assignedAgentId === agent.data.index && t.status === 'in_progress')
          .forEach(t => store.updateTaskStatus(t.id, 'done'));
          
        store.addLogEntry({ agentIndex: agent.data.index, action: 'delivered final project results', taskId: undefined });
        return true;
      }

      default:
        console.warn(`[ToolRegistry] Unknown tool: ${name}`);
        return false;
    }
  }

  public static getDefinitions(agentIndex: number, phase: string): any[] {
    const isLead = agentIndex === 1;
    const tools: any[] = [];

    // 1. Idle Phase: Only Lead can set the brief
    if (phase === 'idle') {
      if (isLead) {
        tools.push({
          type: 'function',
          function: {
            name: 'set_user_brief',
            description: 'Define the final project brief and start the project. Use this after chatting with the user to confirm requirements. Max 300 words.',
            parameters: {
              type: 'object',
              properties: { brief: { type: 'string' } },
              required: ['brief']
            }
          }
        });
      }
      return tools;
    }

    // 2. Working Phase: Common tools for everyone
    if (phase === 'working') {
      tools.push(
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
                agentId: { type: 'number', description: 'Index of the agent assigned to this task' },
                requiresApproval: { type: 'boolean' }
              },
              required: ['title', 'description', 'agentId']
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
        }
      );

      // Only Lead can deliver
      if (isLead) {
        tools.push({
          type: 'function',
          function: {
            name: 'deliver_project',
            description: 'Deliver the final project result once all tasks are Done. Lead Agent only.',
            parameters: {
              type: 'object',
              properties: { output: { type: 'string' } },
              required: ['output']
            }
          }
        });
      }
    }

    return tools;
  }
}
