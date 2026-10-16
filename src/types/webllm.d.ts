declare module "@mlc-ai/web-llm" {
  export interface WebLlmChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
  }
  export interface WebLlmCompletionChoice {
    message?: { content?: string };
  }
  export interface WebLlmCompletion {
    choices: WebLlmCompletionChoice[];
  }
  export class MLCEngine {
    constructor(options?: Record<string, unknown>);
    reload(model: string, chatConfig?: unknown, engineConfig?: unknown): Promise<void>;
    chat: {
      completions: {
        create(request: {
          messages: WebLlmChatMessage[];
          temperature?: number;
          max_tokens?: number;
        }): Promise<WebLlmCompletion>;
      };
    };
  }
  export function hasModelInCache(model: string): Promise<boolean>;
}
