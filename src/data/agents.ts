import { USER_COLOR } from '../theme/brand';
import { DEFAULT_MODELS } from '../core/llm/constants';

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
  humanInTheLoop?: boolean;
  position?: { x: number; y: number };
  subagents?: AgentNode[];
}

export type OutputType = 'text' | 'image' | 'music' | 'video';
export interface AgenticSystem {
  id: string;
  teamName: string;
  teamType: string;
  teamDescription: string;
  color: string;
  outputType: OutputType;
  outputModel: string;
  user: {
    index: number;
    model: string;
    position?: { x: number; y: number };
  };
  leadAgent: AgentNode;
}

export const AGENTIC_SETS: AgenticSystem[] = [
  // 1. Strategy Coach (Pattern: Solo Expert)
  {
    id: 'strategy-coach',
    teamName: 'Strategy Coach',
    teamType: 'Strategic',
    teamDescription: 'A high-level strategic advisor for project direction and roadmap.',
    color: '#64748B',
    outputType: 'text',
    outputModel: DEFAULT_MODELS.text,
    user: { index: 0, model: 'Human', position: { x: 0, y: 0 } },
    leadAgent: {
      id: 'visionary-advisor',
      index: 1,
      name: 'Visionary Advisor',
      description: 'Handles project direction, roadmap, and ecosystem growth strategy.',
      color: '#64748B',
      model: DEFAULT_MODELS.text,
      humanInTheLoop: true,
      position: { x: 0, y: 130 }
    }
  },

  // 2. Communications Agency (Horizontal Hub)
  {
    id: 'comm-agency',
    teamName: 'PR Agency',
    teamType: 'Agency',
    teamDescription: 'A horizontal hub for parallel creative campaign management.',
    color: '#6366F1',
    outputType: 'text',
    outputModel: DEFAULT_MODELS.text,
    user: { index: 0, model: 'Human', position: { x: 0, y: 0 } },
    leadAgent: {
      id: 'campaign-director',
      index: 1,
      name: 'Campaign Director',
      description: 'Coordinates campaign assets and synthesizes the final message.',
      color: '#6366F1',
      model: DEFAULT_MODELS.text,
      humanInTheLoop: true,
      position: { x: 0, y: 130 },
      subagents: [
        {
          id: 'copywriter',
          index: 2,
          name: 'Copywriter',
          description: 'Crafts persuasive narratives for social and PR.',
          color: '#818CF8',
          model: DEFAULT_MODELS.text,
          humanInTheLoop: true,
          position: { x: -300, y: 280 }
        },
        {
          id: 'community-manager',
          index: 3,
          name: 'Community Manager',
          description: 'Handles engagement strategies and potential FAQ.',
          color: '#4F46E5',
          model: DEFAULT_MODELS.text,
          position: { x: 0, y: 280 }
        },
        {
          id: 'pr-strategist',
          index: 4,
          name: 'PR Strategist',
          description: 'Manages media relations and influencer outreach.',
          color: '#312E81',
          model: DEFAULT_MODELS.text,
          position: { x: 300, y: 280 }
        }
      ]
    }
  },

  // 3. Music Studio (Specialized Panel - Lyria)
  {
    id: 'music-studio',
    teamName: 'Music Studio',
    teamType: 'Production',
    teamDescription: 'High-fidelity audio production following Lyria guidelines.',
    color: '#F43F5E',
    outputType: 'music',
    outputModel: DEFAULT_MODELS.music,
    user: { index: 0, model: 'Human', position: { x: 0, y: 0 } },
    leadAgent: {
      id: 'master-producer',
      index: 1,
      name: 'Master Producer',
      description: 'Orchestrates the 4 pillars of sound into a cohesive track.',
      color: '#F43F5E',
      model: DEFAULT_MODELS.text,
      humanInTheLoop: true,
      position: { x: 0, y: 130 },
      subagents: [
        {
          id: 'genre-expert',
          index: 2,
          name: 'Genre Expert',
          description: 'Defines style, mood, and global aesthetic (e.g., Synthwave, Lofi).',
          color: '#FB7185',
          model: DEFAULT_MODELS.text,
          position: { x: -450, y: 280 }
        },
        {
          id: 'tempo-architect',
          index: 3,
          name: 'Tempo Architect',
          description: 'Specifies BPM, rhythmical complexity, and time signatures.',
          color: '#FDA4AF',
          model: DEFAULT_MODELS.text,
          position: { x: -150, y: 280 }
        },
        {
          id: 'instrumentalist',
          index: 4,
          name: 'Instrumentalist',
          description: 'Selects timbres, arrangement, and orchestration layers.',
          color: '#E11D48',
          model: DEFAULT_MODELS.text,
          position: { x: 150, y: 280 }
        },
        {
          id: 'dynamics-engineer',
          index: 5,
          name: 'Dynamics Engineer',
          description: 'Controls volume, texture, contrast, and emotional progression.',
          color: '#9F1239',
          model: DEFAULT_MODELS.text,
          position: { x: 450, y: 280 }
        }
      ]
    }
  },

  // 4. Photo Studio (Visual Composition - Nano Banana)
  {
    id: 'photo-studio',
    teamName: 'Photo Studio',
    teamType: 'Visual',
    teamDescription: 'Pro image generation using the [Subject] + [Action] + [Context] + [Comp] + [Style] formula.',
    color: '#F59E0B',
    outputType: 'image',
    outputModel: DEFAULT_MODELS.image,
    user: { index: 0, model: 'Human', position: { x: 0, y: 0 } },
    leadAgent: {
      id: 'art-director',
      index: 1,
      name: 'Art Director',
      description: 'Synthesizes descriptions into valid Nano Banana prompts.',
      color: '#F59E0B',
      humanInTheLoop: true,
      model: DEFAULT_MODELS.text,
      position: { x: 0, y: 130 },
      subagents: [
        {
          id: 'scene-designer',
          index: 2,
          name: 'Scene Designer',
          description: 'Focuses on Subject and Action within the scene.',
          color: '#FBBF24',
          humanInTheLoop: true,
          model: DEFAULT_MODELS.text,
          position: { x: -150, y: 280 }
        },
        {
          id: 'lighting-stylist',
          index: 3,
          name: 'Lighting Stylist',
          description: 'Focuses on Composition, Lighting, and Style/Materiality.',
          color: '#D97706',
          humanInTheLoop: true,
          model: DEFAULT_MODELS.text,
          position: { x: 150, y: 280 }
        }
      ]
    }
  },

  // 5. Film Studio (Matrix/Departmental - Veo 3.1)
  {
    id: 'film-studio',
    teamName: 'Film Studio',
    teamType: 'Cinematic',
    teamDescription: 'Full cinematic production: Visuals + Soundstage (Veo 3.1 style).',
    color: '#10B981',
    outputType: 'video',
    outputModel: DEFAULT_MODELS.video,
    user: { index: 0, model: 'Human', position: { x: 0, y: 0 } },
    leadAgent: {
      id: 'film-director',
      index: 1,
      name: 'Film Director',
      description: 'Orchestrates visuals and soundstage with global cinematic vision.',
      color: '#10B981',
      model: DEFAULT_MODELS.text,
      humanInTheLoop: true,
      position: { x: 0, y: 130 },
      subagents: [
        {
          id: 'visual-lead',
          index: 2,
          name: 'Visual Lead',
          description: 'Manages cinematography and VFX direction.',
          color: '#34D399',
          model: DEFAULT_MODELS.text,
          position: { x: -200, y: 280 },
          subagents: [
            {
              id: 'cinematographer',
              index: 4,
              name: 'Cinematographer',
              description: 'Defines camera work, shot composition, and subject action.',
              color: '#059669',
              model: DEFAULT_MODELS.text,
              position: { x: -200, y: 430 }
            }
          ]
        },
        {
          id: 'audio-lead',
          index: 3,
          name: 'Audio Lead',
          description: 'Manages the soundstage: Dialogue, SFX, and Ambience.',
          color: '#059669',
          model: DEFAULT_MODELS.text,
          position: { x: 200, y: 280 },
          subagents: [
            {
              id: 'sound-designer',
              index: 5,
              name: 'Sound Designer',
              description: 'Specifies SFX (SFX:), Ambient Noise (Ambient noise:), and Dialogue (" ").',
              color: '#064E3B',
              model: DEFAULT_MODELS.text,
              position: { x: 200, y: 430 }
            }
          ]
        }
      ]
    }
  },

  // 6. Case Study Squad (Sequential Pipeline)
  {
    id: 'case-study-squad',
    teamName: 'Case Study Squad',
    teamType: 'Documentation',
    teamDescription: 'A linear chain for extracting metrics and drafting project case studies.',
    color: '#06B6D4',
    outputType: 'text',
    outputModel: DEFAULT_MODELS.text,
    user: { index: 0, model: 'Human', position: { x: 0, y: 0 } },
    leadAgent: {
      id: 'strategy-lead',
      index: 1,
      name: 'Strategy Lead',
      description: 'Synthesizes project results and oversees the case study narrative.',
      color: '#06B6D4',
      model: DEFAULT_MODELS.text,
      humanInTheLoop: true,
      position: { x: 0, y: 130 },
      subagents: [
        {
          id: 'researcher',
          index: 2,
          name: 'Researcher',
          description: 'Extracts data, metrics, and key achievements from the project.',
          color: '#22D3EE',
          model: DEFAULT_MODELS.text,
          position: { x: 0, y: 260 },
          subagents: [
            {
              id: 'case-writer',
              index: 3,
              name: 'Case Writer',
              description: 'Drafts the final case study narrative and formats the results.',
              color: '#0891B2',
              model: DEFAULT_MODELS.text,
              position: { x: 0, y: 390 }
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
