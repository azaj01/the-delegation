import { ChatMessage } from '../types';
import { AgentData } from '../data/agents';
import { geminiService } from './geminiService';

/**
 * ConversationService — all Gemini AI interaction logic in one place.
 *
 * No Three.js dependency. No store dependency.
 * Testable in isolation.
 */

function buildSystemInstruction(agent: AgentData, mode: 'chat' | 'greeting'): string {
  const base = `You are ${agent.role} at FakeClaw Inc.
Department: ${agent.department}
Mission: ${agent.mission}
Personality: ${agent.personality}
Expertise: ${agent.expertise.join(', ')}

Keep your responses extremely brief (1-2 short sentences max) and professional, matching your corporate persona.`;

  if (mode === 'greeting') {
    return base + '\nIntroduce yourself very briefly and ask how you can help.';
  }
  return base;
}

/**
 * Generate the NPC's opening greeting message.
 */
export async function getGreeting(agent: AgentData): Promise<string> {
  return geminiService.chat(
    buildSystemInstruction(agent, 'greeting'),
    [],
    'Hello! Please introduce yourself briefly.',
  );
}

/**
 * Send a user message and get the NPC's response.
 * @param history Full message history (excluding the current user message)
 * @param userText The new user message text
 */
export async function sendMessage(
  agent: AgentData,
  history: ChatMessage[],
  userText: string,
): Promise<string> {
  return geminiService.chat(
    buildSystemInstruction(agent, 'chat'),
    history,
    userText,
  );
}
