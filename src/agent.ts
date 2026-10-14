import { chatCompletion } from "./llm.js";
import { executeTool, toolSpecs } from "./tools/index.js";
import type { AgentConfig, ChatMessage } from "./types.js";

const SYSTEM_PROMPT = `You are Spark Agent, a minimal coding agent running inside a local workspace.

Rules:
1. Prefer tools over guessing. Inspect the workspace before editing.
2. Keep changes small and focused on the user goal.
3. After edits, run a relevant check command when possible (tests, typecheck, or a quick smoke command).
4. Never try to escape the workspace.
5. When finished, stop calling tools and give a short summary of what you did and how to verify it.
`;

function log(verbose: boolean, ...args: unknown[]): void {
  if (verbose) console.log(...args);
}

export async function runAgent(config: AgentConfig, task: string): Promise<string> {
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: task },
  ];

  for (let turn = 1; turn <= config.maxTurns; turn++) {
    log(config.verbose, `\n=== turn ${turn}/${config.maxTurns} ===`);
    const assistant = await chatCompletion(config, messages, toolSpecs);
    messages.push({
      role: "assistant",
      content: assistant.content ?? null,
      tool_calls: assistant.tool_calls,
    });

    if (assistant.content) {
      console.log(`\nassistant:\n${assistant.content}`);
    }

    const calls = assistant.tool_calls ?? [];
    if (calls.length === 0) {
      return assistant.content?.trim() || "(done)";
    }

    for (const call of calls) {
      const name = call.function.name;
      const args = call.function.arguments;
      console.log(`\n→ tool ${name}(${args})`);
      const result = await executeTool(config.workspace, name, args);
      const preview =
        result.length > 1200 ? `${result.slice(0, 1200)}\n...[truncated]` : result;
      console.log(preview);
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        name,
        content: result,
      });
    }
  }

  return `Stopped after maxTurns=${config.maxTurns}. Increase SPARK_MAX_TURNS if needed.`;
}
