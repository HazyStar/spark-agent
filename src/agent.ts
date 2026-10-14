import { chatCompletion } from "./llm.js";
import { SYSTEM_PROMPT_ZH } from "./prompt.js";
import { executeTool, toolDefinitions } from "./tools/index.js";
import {
  buildVerifyReminder,
  detectVerifyPlan,
  runVerifyPlan,
} from "./verify.js";
import type { AgentConfig, ChatMessage } from "./types.js";

function log(verbose: boolean, ...args: unknown[]): void {
  if (verbose) console.error(...args);
}

function toolCallMutates(name: string): boolean {
  return name === "write_file";
}

export async function runAgent(config: AgentConfig, task: string): Promise<string> {
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT_ZH },
    { role: "user", content: task },
  ];

  let dirty = false;
  let verifiedClean = false;
  let verifyAttempts = 0;
  const maxVerifyAttempts = 3;

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
      if (config.verify && dirty && !verifiedClean && verifyAttempts < maxVerifyAttempts) {
        verifyAttempts += 1;
        log(config.verbose, `[verify] gate #${verifyAttempts}`);
        const plan = await detectVerifyPlan(config.workspace);
        const { ok, report } = await runVerifyPlan(config.workspace, plan);
        log(config.verbose, report.slice(0, 800));

        if (ok) {
          verifiedClean = true;
          dirty = false;
        }

        messages.push({
          role: "user",
          content: buildVerifyReminder(report, ok),
        });
        continue;
      }

      const finalText = (assistant.content ?? "").trim();
      return finalText || "(agent finished with empty response)";
    }

    for (const call of toolCalls) {
      const name = call.function.name;
      const args = call.function.arguments;
      log(config.verbose, `→ ${name}(${args})`);
      const result = await executeTool(config.workspace, name, args);
      log(
        config.verbose,
        `← ${result.slice(0, 500)}${result.length > 500 ? "..." : ""}`,
      );

      if (toolCallMutates(name) && !result.startsWith("Tool error")) {
        dirty = true;
        verifiedClean = false;
      }

      // If the model itself ran a successful verify-like command, accept it.
      if (
        name === "run_command" &&
        dirty &&
        /exit_code:\s*0\b/.test(result) &&
        /(typecheck|test|build|pytest|cargo check|go test)/i.test(args)
      ) {
        verifiedClean = true;
        dirty = false;
      }

      messages.push({
        role: "tool",
        tool_call_id: call.id,
        name,
        content: result,
      });
    }
  }

  return `已达到最大轮次（${config.maxTurns}）。如任务未完成，请增大 --max-turns 后重试。`;
}
