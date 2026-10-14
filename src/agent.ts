import { chatCompletion } from "./llm.js";
import { executeTool, toolDefinitions } from "./tools/index.js";
import type { AgentConfig, ChatMessage } from "./types.js";

const SYSTEM_PROMPT = `You are Spark Agent, a minimal coding agent running in a local workspace.

Goals:
- Solve the user's software task by inspecting and editing files in the workspace.
- Prefer small, correct changes over large speculative rewrites.
- Use tools when you need real filesystem or shell evidence.
- When finished, stop calling tools and give a concise final summary of what you did.

Rules:
- Stay inside the workspace. Do not attempt to escape it.
- Do not print secrets from the environment.
- Prefer run_command for verification (tests, typecheck, scripts) after edits.
`;

function log(verbose: boolean, ...args: unknown[]): void {
  if (verbose) console.error(...args);
}

export async function runAgent(config: AgentConfig, task: string): Promise<string> {
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: task },
  ];

  for (let turn = 1; turn <= config.maxTurns; turn++) {
    log(config.verbose, `\n=== turn ${turn}/${config.maxTurns} ===`);

    const assistant = await chatCompletion(config, messages, toolDefinitions);
    messages.push({
      role: "assistant",
      content: assistant.content ?? null,
      tool_calls: assistant.tool_calls,
    });

    const toolCalls = assistant.tool_calls ?? [];
    if (toolCalls.length === 0) {
      const finalText = (assistant.content ?? "").trim();
      return finalText || "(agent finished with empty response)";
    }

    for (const call of toolCalls) {
      const name = call.function.name;
      const args = call.function.arguments;
      log(config.verbose, `→ ${name}(${args})`);
      const result = await executeTool(config.workspace, name, args);
      log(config.verbose, `← ${result.slice(0, 500)}${result.length > 500 ? "..." : ""}`);

      messages.push({
        role: "tool",
        tool_call_id: call.id,
        name,
        content: result,
      });
    }
  }

  return `Stopped after max turns (${config.maxTurns}). Increase --max-turns if the task needs more steps.`;
}
