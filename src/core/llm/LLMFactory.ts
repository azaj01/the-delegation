import { GeminiProvider } from './providers/GeminiProvider';
import { LLMConfig, LLMProvider } from './types';

export class LLMFactory {
  static getProvider(config: LLMConfig): LLMProvider {
    // We only support Gemini now
    if (!config.apiKey) throw new Error('Gemini API key is required');
    return new GeminiProvider(config.apiKey);
  }
}
