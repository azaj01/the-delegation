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
  data: { index: number; name: string, subagents?: any[], humanInTheLoop?: boolean };
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
            description: 'Start project with brief.',
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
      if (isLead || isManager) {
        tools.push({
          type: 'function',
          function: {
            name: 'propose_task',
            description: 'Assign task to agent.',
            parameters: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                agentId: { type: 'number', description: 'Agent index' },
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
            description: 'Finish task with a professional and detailed output of the work and reasoning.',
            parameters: {
              type: 'object',
              properties: {
                taskId: { type: 'string' },
                output: { type: 'string', description: 'Comprehensive result of the task in Markdown.' }
              },
              required: ['taskId', 'output']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'request_consultation',
            description: 'Pauses current task to seek clarification, feedback, or to resolve a blocker. Use targetId 0 to talk with the User. Mandatory if the brief is ambiguous or you need validation before proceeding with tokens.',
            parameters: {
              type: 'object',
              properties: {
                targetId: { type: 'number', description: '0 for User, or the index of another agent.' },
                taskId: { type: 'string', description: 'The ID of the task you are stuck on.' },
                message: { type: 'string', description: 'Clear explanation of why you need consultation.' }
              },
              required: ['targetId', 'taskId', 'message']
            }
          }
        }
      );

      if (isLead) {
        tools.push({
          type: 'function',
          function: {
            name: 'deliver_project',
            description: 'Final delivery. MUST include a "## Team Contributions" header attributing work to each agent based on KANBAN results.',
            parameters: {
              type: 'object',
              properties: { 
                output: { 
                  type: 'string', 
                  description: 'Rich Markdown document with project results and agent attribution.' 
                } 
              },
              required: ['output']
            }
          }
        });
      }
    }

    return tools;
  }
}
