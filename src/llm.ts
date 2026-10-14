import type { AgentConfig, ChatMessage, ToolDefinition } from "./types.js";

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
  tools: ToolDefinition[],
): Promise<ChatMessage> {
  const url = `${config.baseUrl.replace(/\/$/, "")}/chat/completions`;

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
  });

  const data = (await res.json()) as ChatCompletionResponse;

  if (!res.ok) {
    const detail = data.error?.message ?? JSON.stringify(data);
    throw new Error(`LLM request failed (${res.status}): ${detail}`);
  }

  const message = data.choices?.[0]?.message;
  if (!message) {
    throw new Error("LLM returned an empty response");
  }

  return message;
}
