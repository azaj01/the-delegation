import { FunctionDeclaration, GoogleGenAI, Tool, Type } from '@google/genai';
import { LLMMessage, LLMProvider, LLMResponse, LLMToolCall, LLMToolDefinition } from '../types';
import { DEFAULT_MODELS } from '../constants';

export class GeminiProvider implements LLMProvider {
  private client: GoogleGenAI;

  constructor(private apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async generateCompletion(
    messages: LLMMessage[],
    tools?: LLMToolDefinition[],
    systemInstruction?: string,
    modelName: string = DEFAULT_MODELS.text
  ): Promise<LLMResponse> {
    const contents = this.mapMessagesToGemini(messages);

    const systemTools: Tool[] | undefined = tools ? [{
      functionDeclarations: tools.map(t => ({
        name: t.function.name,
        description: t.function.description,
        parameters: this.mapToGeminiSchema(t.function.parameters)
      } as FunctionDeclaration))
    }] : undefined;

    console.log("sent to Gemini")
    console.log("contents--------", contents);
    console.log("systemInstruction--------", systemInstruction);
    console.log("tools--------", tools);
    const result = await this.client.models.generateContent({
      model: modelName,
      contents,
      config: {
        systemInstruction: systemInstruction,
        tools: systemTools,
      }
    });
    console.log("received from Gemini")
    console.log("result--------", result);
    const candidate = result.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    let contentStr: string | null = null;
    let toolCalls: LLMToolCall[] = [];

    for (const part of parts) {
      if (part.text) {
        contentStr = (contentStr || '') + part.text;
      }
    }

    // Pull tool calls from both candidates and root (some SDK versions vary)
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.functionCall) {
          toolCalls.push({
            id: Math.random().toString(36).substring(7),
            type: 'function',
            function: {
              name: part.functionCall.name,
              arguments: JSON.stringify(part.functionCall.args)
            }
          });
        }
      }
    }

    if (result.functionCalls && toolCalls.length === 0) {
      for (const call of result.functionCalls) {
        toolCalls.push({
          id: Math.random().toString(36).substring(7),
          type: 'function',
          function: {
            name: call.name,
            arguments: JSON.stringify(call.args)
          }
        });
      }
    }

    const usage = result.usageMetadata ? {
      promptTokens: result.usageMetadata.promptTokenCount || 0,
      completionTokens: (result.usageMetadata.candidatesTokenCount || 0) + (result.usageMetadata.thoughtsTokenCount || 0),
      totalTokens: result.usageMetadata.totalTokenCount || 0
    } : undefined;

    return {
      content: contentStr,
      tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
      usage,
      finishReason: candidate?.finishReason as string,
      raw: result, // Return the original SDK result for technical logging
      request: {
        contents,
        systemInstruction,
        tools: systemTools
      }
    };
  }

  async generateImage(
    prompt: string,
    modelName: string = DEFAULT_MODELS.image,
    onProgress?: (msg: string) => void,
    options: { aspectRatio?: string; imageSize?: string } = {},
    images?: string[]
  ): Promise<{ data: string; usage?: any }> {
    if (onProgress) onProgress("Generating image...");

    const config = {
      responseModalities: ["IMAGE", "TEXT"],
      imageConfig: {
        aspectRatio: options.aspectRatio || '16:9',
        imageSize: options.imageSize || '1K', // Default 1K, options: '512', '1K', '2K', '4K'
      }
    };

    const contents: any[] = [{ text: prompt }];
    
    if (images && images.length > 0) {
      for (const img of images) {
        const base64Match = img.match(/^data:(image\/[a-z]+);base64,(.+)$/);
        if (base64Match) {
          contents.push({
            inlineData: {
              mimeType: base64Match[1],
              data: base64Match[2]
            }
          });
        }
      }
    }

    const result = await this.client.models.generateContent({
      model: modelName,
      contents,
      config: config as any
    });

    const candidate = result.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    let base64Data: string | undefined;

    for (const part of parts) {
      if (part.inlineData) {
        base64Data = part.inlineData.data;
      }
    }

    return {
      data: base64Data || '',
      usage: result.usageMetadata ? {
        promptTokens: result.usageMetadata.promptTokenCount || 0,
        completionTokens: result.usageMetadata.candidatesTokenCount || 0,
        totalTokens: result.usageMetadata.totalTokenCount || 0
      } : undefined
    };
  }

  async generateAudio(
    prompt: string,
    modelName: string = DEFAULT_MODELS.music,
    onProgress?: (msg: string) => void
  ): Promise<{ data: string; usage?: any }> {
    if (onProgress) onProgress("Generating audio...");
    const result = await this.client.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseModalities: ["AUDIO", "TEXT"],
      }
    });

    const candidate = result.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    let base64Data: string | undefined;

    for (const part of parts) {
      if (part.inlineData) {
        base64Data = part.inlineData.data;
      }
    }

    return {
      data: base64Data || '',
      usage: result.usageMetadata ? {
        promptTokens: result.usageMetadata.promptTokenCount || 0,
        completionTokens: result.usageMetadata.candidatesTokenCount || 0,
        totalTokens: result.usageMetadata.totalTokenCount || 0
      } : undefined
    };
  }

  // async generateMultimodal(
  //   prompt: string,
  //   modelName: string,
  //   modalities: string[] = ["IMAGE", "TEXT"]
  // ): Promise<{ content: string | null; data?: string; usage?: any }> {
  //   const result = await this.client.models.generateContent({
  //     model: modelName,
  //     contents: prompt,
  //     config: {
  //       responseModalities: modalities as any,
  //       candidateCount: 1,
  //     }
  //   });

  //   const candidate = result.candidates?.[0];
  //   const parts = candidate?.content?.parts || [];

  //   let contentStr: string | null = null;
  //   let base64Data: string | undefined;

  //   for (const part of parts) {
  //     if (part.text) {
  //       contentStr = (contentStr || '') + part.text;
  //     } else if (part.inlineData) {
  //       base64Data = part.inlineData.data;
  //     }
  //   }

  //   return {
  //     content: contentStr,
  //     data: base64Data,
  //     usage: result.usageMetadata ? {
  //       promptTokens: result.usageMetadata.promptTokenCount || 0,
  //       completionTokens: result.usageMetadata.candidatesTokenCount || 0,
  //       totalTokens: result.usageMetadata.totalTokenCount || 0
  //     } : undefined
  //   };
  // }

  async generateVideo(
    prompt: string,
    modelName: string = DEFAULT_MODELS.video,
    onProgress?: (msg: string) => void,
    options: {
      resolution?: '720p' | '1080p' | '4k';
      aspectRatio?: '16:9' | '9:16';
      durationSeconds?: 4 | 6 | 8;
      generateAudio?: boolean;
    } = {},
    images?: string[]
  ): Promise<{ videoUrl: string; usage?: any }> {
    const contents: any[] = [{ text: prompt }];

    if (images && images.length > 0) {
      // veo-3.1-lite-generate-preview only supports 1 image
      const imagesToGenerate = modelName === 'veo-3.1-lite-generate-preview' ? images.slice(0, 1) : images;
      for (const img of imagesToGenerate) {
        const base64Match = img.match(/^data:(image\/[a-z]+);base64,(.+)$/);
        if (base64Match) {
          contents.push({
            inlineData: {
              mimeType: base64Match[1],
              data: base64Match[2]
            }
          });
        }
      }
    }

    // 1. Initial request with explicit config for Veo 3.1
    let operation = await (this.client.models as any).generateVideos({
      model: modelName,
      contents,
      config: {
        resolution: options.resolution || '720p', // Options: '720p', '1080p', '4k'
        aspectRatio: options.aspectRatio || '16:9', // Options: '16:9', '9:16'
        durationSeconds: options.durationSeconds || 4,  // Options: 4, 6, 8 (Must be 8 for >= 1080p)
        generateAudio: options.generateAudio !== undefined ? options.generateAudio : true,
        sampleCount: 1,
      }
    });

    // 2. Poll the operation status until the video is ready
    while (!operation.done) {
      if (onProgress) onProgress("Generating video (this may take a minute)...");
      await new Promise((resolve) => setTimeout(resolve, 10000));
      operation = await (this.client as any).operations.getVideosOperation({
        operation: operation,
      });
    }

    // 3. Extract the URI from the generated video object
    const videoData = operation.response?.generatedVideos?.[0];
    let videoUri = (videoData?.video as any)?.uri || '';

    // Append API key to allow direct browser download
    if (videoUri && videoUri.includes('generativelanguage.googleapis.com')) {
      const separator = videoUri.includes('?') ? '&' : '?';
      videoUri += `${separator}key=${this.apiKey}`;
    }

    return {
      videoUrl: videoUri,
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        duration: videoData?.durationSeconds || 8
      }
    };
  }

  private mapMessagesToGemini(messages: LLMMessage[]): any[] {
    return messages
      .filter(m => m.role !== 'system')
      .map(m => {
        const role = m.role === 'assistant' ? 'model' : 'user';
        const parts: any[] = [];

        if (m.content) {
          parts.push({ text: m.content });
        }

        if (m.tool_calls) {
          for (const tc of m.tool_calls) {
            parts.push({
              functionCall: {
                name: tc.function.name,
                args: JSON.parse(tc.function.arguments)
              }
            });
          }
        }

        if (m.role === 'tool' && m.name) {
          parts.push({
            functionResponse: {
              name: m.name,
              response: JSON.parse(m.content)
            }
          });
        }

        if (m.images) {
          for (const img of m.images) {
            // Strip data URL prefix if present: "data:image/png;base64,..."
            const base64Match = img.match(/^data:(image\/[a-z]+);base64,(.+)$/);
            if (base64Match) {
              parts.push({
                inlineData: {
                  mimeType: base64Match[1],
                  data: base64Match[2]
                }
              });
            } else {
              // Assume it's already a raw base64 string and default to jpeg
              parts.push({
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: img
                }
              });
            }
          }
        }

        return { role, parts };
      });
  }

  private mapToGeminiSchema(schema: any): any {
    if (!schema) return undefined;

    const typeStr = (schema.type || 'string').toUpperCase();
    const mappedType = Type[typeStr as keyof typeof Type] || Type.STRING;

    const result: any = {
      type: mappedType,
      description: schema.description,
      nullable: schema.nullable,
      minItems: schema.minItems,
      maxItems: schema.maxItems,
      minimum: schema.minimum,
      maximum: schema.maximum,
      minLength: schema.minLength,
      maxLength: schema.maxLength,
    };

    if (schema.properties) {
      result.properties = Object.keys(schema.properties).reduce((acc, key) => {
        acc[key] = this.mapToGeminiSchema(schema.properties[key]);
        return acc;
      }, {} as Record<string, any>);
    }

    if (schema.required) {
      result.required = schema.required;
    }

    if (schema.items) {
      result.items = this.mapToGeminiSchema(schema.items);
    }

    if (schema.enum) {
      result.enum = schema.enum;
    }

    return result;
  }
}
