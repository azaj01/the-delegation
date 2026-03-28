import { USER_COLOR } from '../theme/brand';

export const USER_ID = 'user';
export const USER_NAME = 'User';
export const MAX_AGENTS = 5;
export { USER_COLOR };
export const DEFAULT_AGENTIC_SET_ID = 'single-agent';
export interface AgentNode {
  id: string;
  index: number;
  name: string;
  description: string;
  color: string;
  model: string;
  position?: { x: number; y: number };
  subagents?: AgentNode[];
}

export interface AgenticSystem {
  id: string;
  teamName: string;
  teamType: string;
  teamDescription: string;
  color: string;
  user: {
    index: number;
    model: string;
    position?: { x: number; y: number };
  };
  leadAgent: AgentNode;
}

export const AGENTIC_SETS: AgenticSystem[] = [
  // 1. Single Agent (The Solo Expert)
  {
    id: 'single-agent',
    teamName: 'Solo Expert',
    teamType: 'Consultancy',
    teamDescription: 'A single high-capability agent for direct tasks.',
    color: '#C084FC',
    user: { index: 0, model: 'Human', position: { x: 0, y: 0 } },
    leadAgent: {
      id: 'expert',
      index: 1,
      name: 'Expert',
      description: 'Provide professional, concise, and technically accurate responses to all user requests.',
      color: '#C084FC',
      model: 'gemini-3-flash-preview',
      position: { x: 0, y: 130 }
    }
  },

  // 2. The Content Factory (Sequential Pipeline)
  {
    id: 'content-pipeline',
    teamName: 'Content Factory',
    teamType: 'Pipeline',
    teamDescription: 'A linear chain of production for content creation.',
    color: '#FB923C',
    user: { index: 0, model: 'Human', position: { x: 0, y: 0 } },
    leadAgent: {
      id: 'writer-lead',
      index: 1,
      name: 'Writer',
      description: 'Drafts the requested content. Acts as the first step in a linear chain.',
      color: '#FB923C',
      model: 'gemini-3-flash-preview',
      position: { x: 0, y: 130 },
      subagents: [
        {
          id: 'editor',
          index: 2,
          name: 'Editor',
          description: 'Refines and proofreads the content received from the Writer.',
          color: '#FACC15',
          model: 'gemini-3-flash-preview',
          position: { x: 0, y: 260 },
          subagents: [
            {
              id: 'translator',
              index: 3,
              name: 'Translator',
              description: 'Translates edited content professionally. Final step in the pipeline.',
              color: '#4ADE80',
              model: 'gemini-3-flash-preview',
              position: { x: 0, y: 390 }
            }
          ]
        }
      ]
    }
  },

  // 3. Engineering Loop (The Quality Guard)
  {
    id: 'engineering-loop',
    teamName: 'Safe Code',
    teamType: 'Engineering',
    teamDescription: 'A secure development pipeline with built-in auditing.',
    color: '#2DD4BF',
    user: { index: 0, model: 'Human', position: { x: 0, y: 0 } },
    leadAgent: {
      id: 'lead-dev',
      index: 1,
      name: 'Lead Developer',
      description: 'Writes core logic and triggers security reviews via consult_agent.',
      color: '#2DD4BF',
      model: 'gemini-3-flash-preview',
      position: { x: 0, y: 130 },
      subagents: [
        {
          id: 'security-auditor',
          index: 2,
          name: 'Security Auditor',
          description: 'Audits code for vulnerabilities. Suggests improvements via Request Revision.',
          color: '#FB7185',
          model: 'gemini-3-flash-preview',
          position: { x: 0, y: 260 }
        }
      ]
    }
  },

  // 4. The Swarm (Parallel Task Force)
  {
    id: 'swarm-parallel',
    teamName: 'The Swarm',
    teamType: 'Task Force',
    teamDescription: 'Massive parallel execution power for large-scale tasks.',
    color: '#818CF8',
    user: { index: 0, model: 'Human', position: { x: 0, y: 0 } },
    leadAgent: {
      id: 'swarm-leader',
      index: 1,
      name: 'Swarm Lead',
      description: 'Decomposes requests into parallel sub-tasks and delegates to workers.',
      color: '#818CF8',
      model: 'gemini-3-flash-preview',
      position: { x: 0, y: 130 },
      subagents: [
        {
          id: 'worker-alpha',
          index: 2,
          name: 'Worker Alpha',
          description: 'Execute technical tasks assigned by the Swarm Lead.',
          color: '#F87171',
          model: 'gemini-3-flash-preview',
          position: { x: -450, y: 280 }
        },
        {
          id: 'worker-beta',
          index: 3,
          name: 'Worker Beta',
          description: 'Execute creative tasks assigned by the Swarm Lead.',
          color: '#FBBC05',
          model: 'gemini-3-flash-preview',
          position: { x: -150, y: 280 }
        },
        {
          id: 'worker-gamma',
          index: 4,
          name: 'Worker Gamma',
          description: 'Execute data tasks assigned by the Swarm Lead.',
          color: '#34A853',
          model: 'gemini-3-flash-preview',
          position: { x: 150, y: 280 }
        },
        {
          id: 'worker-delta',
          index: 5,
          name: 'Worker Delta',
          description: 'Execute research tasks assigned by the Swarm Lead.',
          color: '#A78BFA',
          model: 'gemini-3-flash-preview',
          position: { x: 450, y: 280 }
        }
      ]
    }
  },

  // 5. The Hybrid Hub (Matrix/Branching)
  {
    id: 'hybrid-hub',
    teamName: 'Matrix Agency',
    teamType: 'Matrix',
    teamDescription: 'A delegating hub that manages specialized departments.',
    color: '#34D399',
    user: { index: 0, model: 'Human', position: { x: 0, y: 0 } },
    leadAgent: {
      id: 'studio-head',
      index: 1,
      name: 'Studio Head',
      description: 'Manages departmental leads and delegates high-level goals.',
      color: '#34D399',
      model: 'gemini-3-flash-preview',
      position: { x: 0, y: 130 },
      subagents: [
        {
          id: 'creative-lead',
          index: 2,
          name: 'Creative Lead',
          description: 'Manages creative execution and delegates art tasks.',
          color: '#F472B6',
          model: 'gemini-3-flash-preview',
          position: { x: -200, y: 280 },
          subagents: [
            {
              id: 'artist',
              index: 4,
              name: 'Artist',
              description: 'Execution art specialist.',
              color: '#FB7185',
              model: 'gemini-3-flash-preview',
              position: { x: -200, y: 430 }
            }
          ]
        },
        {
          id: 'tech-lead',
          index: 3,
          name: 'Tech Lead',
          description: 'Manages technical execution and delegates code tasks.',
          color: '#C084FC',
          model: 'gemini-3-flash-preview',
          position: { x: 200, y: 280 },
          subagents: [
            {
              id: 'developer',
              index: 5,
              name: 'Developer',
              description: 'Execution code specialist.',
              color: '#A78BFA',
              model: 'gemini-3-flash-preview',
              position: { x: 200, y: 430 }
            }
          ]
        }
      ]
    }
  },

  // 6. Corporate Ladder (Deep Hierarchy)
  {
    id: 'corporate-ladder',
    teamName: 'Global Corp',
    teamType: 'Enterprise',
    teamDescription: 'A deep chain of command from Strategy to Execution.',
    color: '#94A3B8',
    user: { index: 0, model: 'Human', position: { x: 0, y: 0 } },
    leadAgent: {
      id: 'ceo',
      index: 1,
      name: 'CEO',
      description: 'Strategic lead; sets vision and delegates to VP of Operations.',
      color: '#94A3B8',
      model: 'gemini-3-flash-preview',
      position: { x: 0, y: 130 },
      subagents: [
        {
          id: 'vp-ops',
          index: 2,
          name: 'VP of Ops',
          description: 'Operational manager; translates strategy into project plans.',
          color: '#CBD5E1',
          model: 'gemini-3-flash-preview',
          position: { x: 0, y: 260 },
          subagents: [
            {
              id: 'supervisor',
              index: 3,
              name: 'Supervisor',
              description: 'Direct task manager; assigns tasks and audits progress.',
              color: '#CBD5E1',
              model: 'gemini-3-flash-preview',
              position: { x: 0, y: 390 },
              subagents: [
                {
                  id: 'intern',
                  index: 4,
                  name: 'Intern',
                  description: 'Technical execution worker.',
                  color: '#CBD5E1',
                  model: 'gemini-3-flash-preview',
                  position: { x: 0, y: 520 }
                }
             ]
            }
          ]
        }
      ]
    }
  }
];

export function getAgentSet(id: string, customSystems: AgenticSystem[] = []): AgenticSystem {
  return (
    customSystems.find((s) => s.id === id) ||
    AGENTIC_SETS.find((s) => s.id === id) ||
    AGENTIC_SETS[0]
  );
}

export function getAllAgents(system: AgenticSystem): AgentNode[] {
  const agents: AgentNode[] = [];
  const traverse = (node: AgentNode) => {
    agents.push(node);
    if (node.subagents) {
      node.subagents.forEach(traverse);
    }
  };
  traverse(system.leadAgent);
  return agents;
}

export function getAllCharacters(system: AgenticSystem): AgentNode[] {
  const userNode: AgentNode = {
    id: USER_ID,
    index: system.user.index,
    name: USER_NAME,
    color: USER_COLOR,
    model: system.user.model,
    description: 'Human user issuing commands.',
  };
  return [userNode, ...getAllAgents(system)];
}
