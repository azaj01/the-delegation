// ─────────────────────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────────────────────

export const DEFAULT_AGENTIC_SET_ID = 'marketing-agency';
export const USER_ID = 'user';
export const USER_NAME = 'user';
export const USER_COLOR = '#7EACEA';

// ─────────────────────────────────────────────────────────────
//  Agent data types
// ─────────────────────────────────────────────────────────────
export interface AgentNode {
  id: string;
  index: number; // For 3D simulation character mapping
  name: string; // Unique identifier and display name
  description?: string; // Concise summary of capabilities
  instruction: string; // Core task, persona, and constraints
  color: string;
  model: string;
  allowedTools: string[];
  reportsToId?: string; // For hierarchy
  maxIterations?: number;
  position?: { x: number; y: number }; // For visual canvas storage
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
  };

  leadAgent: AgentNode;
  subagents: AgentNode[];
}

// ─────────────────────────────────────────────────────────────
//  Agent Sets (Agentic Systems)
// ─────────────────────────────────────────────────────────────
export const AGENTIC_SETS: AgenticSystem[] = [
  // ── 1. Unboring dot net ─────────────────────────
  {
    id: 'marketing-agency',
    teamName: 'Unboring.net',
    teamType: 'Creative & Strategy Agency',
    teamDescription: 'A full-service creative agency covering branding, design, development and go-to-market strategy.',
    color: '#4387E2',
    user: {
      index: 0,
      model: 'Human',
    },

    leadAgent: {
      id: 'account-manager',
      index: 1,
      name: 'Account Manager',
      description: 'Central orchestrator who breaks down client requests into actionable team tasks.',
      instruction: `You are the central point of contact. Your goal is to coordinate the team to deliver a perfect proposal.

- Mission: Break down the client's request into actionable missions for the team.
- Personality: Organized, efficient, and central orchestrator.`,
      color: '#4387E2',
      model: 'gemini-3.1-flash-lite-preview',
      allowedTools: ['propose_task', 'notify_client_project_ready', 'update_client_brief', 'request_client_approval', 'receive_client_approval', 'complete_task'],
    },
    subagents: [
      {
        id: 'designer',
        index: 2,
        name: 'Designer',
        description: 'Focuses on UI/UX, aesthetics, and branding consistency.',
        instruction: `Design beautiful interfaces and ensure brand consistency.

- Mission: Ensure the aesthetics and user experience are exceptional.
- Personality: Creative, detail-oriented, and focused on visual harmony.`,
        color: '#eab308',
        model: 'gemini-3.1-flash-lite-preview',
        allowedTools: ['request_client_approval', 'receive_client_approval', 'complete_task', 'propose_task'],
        reportsToId: 'account-manager',
      },
      {
        id: 'developer',
        index: 3,
        name: 'Developer',
        description: 'Handles technical feasibility, architecture, and tech stack decisions.',
        instruction: `Focus on technical execution and documentation.

- Mission: Evaluate technical feasibility and define the necessary architecture.
- Personality: Pragmatic, technical, and focused on robustness.`,
        color: '#22c55e',
        model: 'gemini-3.1-flash-lite-preview',
        allowedTools: ['request_client_approval', 'receive_client_approval', 'complete_task', 'propose_task'],
        reportsToId: 'account-manager',
      },
      {
        id: 'marketing-expert',
        index: 4,
        name: 'Marketing Expert',
        description: 'Specializes in market analysis, target audience, and sales narratives.',
        instruction: `Create a compelling narrative and analyze market trends.

- Mission: Analyze the target audience and build the sales narrative.
- Personality: Strategic, persuasive, and market-savvy.`,
        color: '#EF52BA',
        model: 'gemini-3.1-flash-lite-preview',
        allowedTools: ['request_client_approval', 'receive_client_approval', 'complete_task', 'propose_task'],
        reportsToId: 'account-manager',
      },
      {
        id: 'sales-lead',
        index: 5,
        name: 'Sales Lead',
        description: 'Ensures profitability and business viability of all proposals.',
        instruction: `Vet all proposals for business viability.

- Mission: Act as the final filter, ensuring the plan is profitable and viable.
- Personality: Critical, realistic, and focused on return on investment.`,
        color: '#ef4444',
        model: 'gemini-3.1-flash-lite-preview',
        allowedTools: ['request_client_approval', 'receive_client_approval', 'complete_task', 'propose_task'],
        reportsToId: 'account-manager',
      },
    ],
  },

  // ── 2. Game Studio ──────────────────────────────────────────
  {
    id: 'game-studio',
    teamName: 'Pixxel AI Games',
    teamType: 'Indie Game Studio',
    teamDescription: 'A specialized game development studio focused on creating the next viral hit.',
    color: '#22c55e',
    user: {
      index: 0,
      model: 'Human',
    },

    leadAgent: {
      id: 'game-director',
      index: 1,
      name: 'Game Director',
      description: 'Visionary who turns game ideas into structured mechanics and systems.',
      instruction: `You lead the creative vision and system architecture.

- Mission: Turn raw ideas into structured game mechanics and loop systems.
- Personality: Analytical, visionary, and balanced.`,
      color: '#22c55e',
      model: 'gemini-3.1-flash-lite-preview',
      allowedTools: ['propose_task', 'notify_client_project_ready', 'update_client_brief', 'request_client_approval', 'receive_client_approval', 'complete_task'],
    },
    subagents: [
      {
        id: 'tech-architect',
        index: 2,
        name: 'Technical Architect',
        description: 'Translates game vision into high-fidelity technical specs and AI prompts.',
        instruction: `Translate vision into technical specs.

- Mission: Ensure the game concept is technically feasible and translate it into a high-fidelity generation prompt.
- Personality: Calculated, tech-obsessed, and precise.`,
        color: '#4DECAC',
        model: 'gemini-3.1-flash-lite-preview',
        allowedTools: ['request_client_approval', 'receive_client_approval', 'complete_task', 'propose_task'],
        reportsToId: 'game-director',
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────
export function getAgentSet(id: string, customSystems: AgenticSystem[] = []): AgenticSystem {
  return (
    customSystems.find((s) => s.id === id) ||
    AGENTIC_SETS.find((s) => s.id === id) ||
    AGENTIC_SETS[0]
  );
}

export function getAllAgents(system: AgenticSystem): AgentNode[] {
  // Returns ONLY the AI agents (lead + subagents)
  return [system.leadAgent, ...system.subagents];
}

export function getAllCharacters(system: AgenticSystem): AgentNode[] {
  // Returns ALL characters in the simulation (User + AI agents)
  const userNode: AgentNode = {
    id: USER_ID,
    index: system.user.index,
    name: USER_NAME,
    color: USER_COLOR,
    model: system.user.model,
    instruction: '',
    allowedTools: [],
  };
  return [userNode, system.leadAgent, ...system.subagents];
}


export function getAgent(index: number, agents: AgentNode[]): AgentNode | undefined {
  return agents.find((a) => a.index === index);
}

