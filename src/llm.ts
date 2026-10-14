import type { AgentConfig, ChatMessage, ToolSpec } from "./types.js";

interface ChatCompletionResponse {
  choices?: Array<{
    message?: ChatMessage;
    finish_reason?: string;
  }>;
  error?: { message?: string };
}

export async function chatCompletion(
  config: AgentConfig,
  messages: ChatMessage[],
  tools: ToolSpec[],
): Promise<ChatMessage> {
  const url = `${config.baseUrl.replace(/\/$/, "")}/v1/chat/completions`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        tools,
        tool_choice: "auto",
        temperature: 0.2,
      }),
      signal: controller.signal,
    });

    const data = (await res.json()) as ChatCompletionResponse;
    if (!res.ok) {
      throw new Error(
        data.error?.message || `LLM HTTP ${res.status}: ${JSON.stringify(data)}`,
      );
    }

    const message = data.choices?.[0]?.message;
    if (!message) {
      throw new Error("LLM returned empty message");
    }
    return message;
  } finally {
    clearTimeout(timer);
  }
}
