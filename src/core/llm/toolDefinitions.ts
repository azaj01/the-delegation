import { LLMToolDefinition } from './types';

export const CORE_TOOLS: LLMToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'propose_task',
      description: 'Create a new task for one or more agents.',
      parameters: {
        type: 'object',
        properties: {
          agentIds: {
            type: 'array',
            items: { type: 'integer' },
            description: 'List of agent IDs to assign the task to.',
          },
          title: {
            type: 'string',
            description: 'A very brief 2-4 word summary of the task.',
          },
          description: {
            type: 'string',
            description: 'A short 10-20 word instruction for the task.',
          },
          requiresApproval: {
            type: 'boolean',
            description: 'Whether the task requires client approval before starting.',
          },
        },
        required: ['agentIds', 'title', 'description', 'requiresApproval'],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'request_client_approval',
      description: 'When you need client input to continue. Task goes on_hold.',
      parameters: {
        type: 'object',
        properties: {
          taskId: {
            type: 'string',
            description: 'The ID of the task that needs approval.',
          },
          question: {
            type: 'string',
            description: 'The question to ask the client.',
          },
        },
        required: ['taskId', 'question'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'receive_client_approval',
      description: 'Call this when the client provides the approval or information needed to resume a task that was ON_HOLD.',
      parameters: {
        type: 'object',
        properties: {
          taskId: {
            type: 'string',
            description: 'The ID of the task that has been approved.',
          },
        },
        required: ['taskId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'complete_task',
      description: 'When your work is done OR the task is no longer necessary. If cancelled, use output to explain why.',
      parameters: {
        type: 'object',
        properties: {
          taskId: {
            type: 'string',
            description: 'The ID of the task you are closing.',
          },
          output: {
            type: 'string',
            description: 'The final prompt (max 300 words) OR an explanation of why the task was finished/cancelled.',
          },
        },
        required: ['taskId', 'output'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'notify_client_project_ready',
      description: 'When all tasks are completed, assemble the final prompt for the client.',
      parameters: {
        type: 'object',
        properties: {
          finalPrompt: {
            type: 'string',
            description: 'The final assembled prompt for the client.',
          },
        },
        required: ['finalPrompt'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_client_brief',
      description: 'Call this to update or refine the official client brief based on the conversation. This does NOT start the working phase; use propose_task for that.',
      parameters: {
        type: 'object',
        properties: {
          brief: {
            type: 'string',
            description: 'The updated, refined, and summarized client brief.',
          },
        },
        required: ['brief'],
      },
    },
  },
];
