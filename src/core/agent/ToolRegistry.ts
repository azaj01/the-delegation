import { LLMMessage } from '../llm/types';
import { setUserBrief } from './tools/setUserBrief';
import { proposeTask } from './tools/proposeTask';
import { completeTask } from './tools/completeTask';
import { requestConsultation } from './tools/requestConsultation';
import { deliverProject } from './tools/deliverProject';

export interface ToolCall {
  name: string;
  args: any;
}

/**
 * Interface that decuples the ToolRegistry from the 3D Simulation (AgentHost).
 * This allows the tool logic to be tested and used independently of the simulation.
 */
export interface AgentActionContext {
  data: { index: number; name: string, subagents?: any[] };
  setState: (state: 'idle' | 'moving' | 'working' | 'on_hold' | 'talking') => void;
  appendHistory: (message: LLMMessage) => void;
  triggerMeeting?: (agentIndex: number, taskId: string, targetId?: number, message?: string) => void;
  getParticipantIds: () => number[];
}

export class ToolRegistry {
  /**
   * Processes a tool call by dispatching it to the appropriate tool handler.
   */
  public static process(agent: AgentActionContext, toolCall: ToolCall): boolean {
    const { name, args } = toolCall;

    switch (name) {
      case 'set_user_brief':
        return setUserBrief(agent, args);
      case 'propose_task':
        return proposeTask(agent, args);
      case 'complete_task':
        return completeTask(agent, args);
      case 'request_consultation':
        return requestConsultation(agent, args);
      case 'deliver_project':
        return deliverProject(agent, args);
      default:
        console.warn(`[ToolRegistry] Unknown tool: ${name}`);
        return false;
    }
  }

  public static getDefinitions(agentIndex: number, phase: string, subagentsCount: number = 0): any[] {
    const isLead = agentIndex === 1;
    const isManager = subagentsCount > 0;
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
      // Propose Task is only for Managers
      if (isManager) {
        tools.push({
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
        });
      }

      tools.push(
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
            name: 'request_consultation',
            description: 'Request a meeting with another agent or the user in the boardroom.',
            parameters: {
              type: 'object',
              properties: {
                targetId: { type: 'number', description: 'Index of the agent to consult. User index is 0.' },
                taskId: { type: 'string', description: 'The task context' },
                message: { type: 'string', description: 'Opening message for the debate or feedback request' }
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
