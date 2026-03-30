import { FunctionDeclaration, GoogleGenAI, Tool, Type } from '@google/genai';
import { LLMMessage, LLMProvider, LLMResponse, LLMToolCall, LLMToolDefinition } from '../types';

export class GeminiProvider implements LLMProvider {
  private client: GoogleGenAI;

  constructor(private apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async generateCompletion(
    messages: LLMMessage[],
    tools?: LLMToolDefinition[],
    systemInstruction?: string,
    modelName: string = 'gemini-3-flash-preview'
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

  async generateMultimodal(
    prompt: string,
    modelName: string,
    modalities: string[] = ["IMAGE", "TEXT"]
  ): Promise<{ content: string | null; data?: string; usage?: any }> {
    const result = await this.client.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseModalities: modalities as any,
        candidateCount: 1,
      }
    });

    const candidate = result.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    let contentStr: string | null = null;
    let base64Data: string | undefined;

    for (const part of parts) {
      if (part.text) {
        contentStr = (contentStr || '') + part.text;
      } else if (part.inlineData) {
        base64Data = part.inlineData.data;
      }
    }

    return {
      content: contentStr,
      data: base64Data,
      usage: result.usageMetadata ? {
        promptTokens: result.usageMetadata.promptTokenCount || 0,
        completionTokens: result.usageMetadata.candidatesTokenCount || 0,
        totalTokens: result.usageMetadata.totalTokenCount || 0
      } : undefined
    };
  }

  async generateVideo(
    prompt: string,
    modelName: string,
    onProgress?: (msg: string) => void
  ): Promise<{ videoUrl: string; usage?: any }> {
    // 1. Initial request with explicit config to control quality and cost (720p is more economical than 4k)
    let operation = await (this.client.models as any).generateVideos({
      model: modelName,
      prompt: prompt,
      config: {
        resolution: '720p',
        aspectRatio: '16:9',
      }
    });

    // 2. Poll the operation status until the video is ready (interval of 10s to avoid API spam)
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
