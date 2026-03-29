export interface ModelPricing {
  inputPer1M?: number;
  outputPer1M?: number;
  perImage?: number;
  perSong?: number;
  perSecond?: number;
}

export const GEMINI_PRICING: Record<string, ModelPricing> = {
  // Text Models
  'gemini-3.1-pro-preview': { inputPer1M: 2.00, outputPer1M: 12.00 },
  'gemini-3-flash-preview': { inputPer1M: 0.50, outputPer1M: 3.00 },
  'gemini-3.1-flash-lite-preview': { inputPer1M: 0.25, outputPer1M: 1.50 },
  
  // Image Models
  'gemini-3.1-flash-image-preview': { perImage: 0.067 },
  'gemini-3-pro-image-preview': { perImage: 0.134 },
  'gemini-2.5-flash-image': { perImage: 0.039 },
  
  // Music Models
  'lyria-3-pro-preview': { perSong: 0.080 },
  'lyria-3-clip-preview': { perSong: 0.040 },
  
  // Video Models
  'veo-3.1-generate-preview': { perSecond: 0.400 },
  'veo-3.1-fast-generate-preview': { perSecond: 0.150 },
};

export const DEFAULT_PRICING: ModelPricing = GEMINI_PRICING['gemini-3-flash-preview'];

export function calculateCost(promptTokens: number, completionTokens: number, modelName: string, durationOrCount?: number): number {
  const lowerName = modelName.toLowerCase();
  const pricingKey = Object.keys(GEMINI_PRICING).find(key => lowerName.includes(key));
  const pricing = pricingKey ? GEMINI_PRICING[pricingKey] : DEFAULT_PRICING;

  // 1. Per Image
  if (pricing.perImage !== undefined) {
    return (durationOrCount || 1) * pricing.perImage;
  }
  
  // 2. Per Song
  if (pricing.perSong !== undefined) {
    return (durationOrCount || 1) * pricing.perSong;
  }
  
  // 3. Per Second (Video)
  if (pricing.perSecond !== undefined) {
    return (durationOrCount || 5) * pricing.perSecond; // Default 5s if not specified
  }

  // 4. Token based (Text)
  const inputCost = (promptTokens / 1000000) * (pricing.inputPer1M || 0);
  const outputCost = (completionTokens / 1000000) * (pricing.outputPer1M || 0);

  return inputCost + outputCost;
}
