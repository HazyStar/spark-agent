#!/usr/bin/env node
import { Command } from "commander";
import path from "node:path";
import { runAgent } from "./agent.js";
import type { AgentConfig } from "./types.js";

function loadConfig(opts: {
  workspace?: string;
  model?: string;
  maxTurns?: string;
  verbose?: boolean;
}): AgentConfig {
  const apiKey = process.env.SPARK_API_KEY || process.env.OPENAI_API_KEY || "";
  if (!apiKey) {
    throw new Error(
      "Missing SPARK_API_KEY (or OPENAI_API_KEY). Copy .env.example and set your key.",
    );
  }

  return {
    apiKey,
    baseUrl:
      process.env.SPARK_BASE_URL ||
      process.env.OPENAI_BASE_URL ||
      "https://api.deepseek.com",
    model: opts.model || process.env.SPARK_MODEL || "deepseek-chat",
    workspace: path.resolve(opts.workspace || process.cwd()),
    maxTurns: Number(opts.maxTurns || process.env.SPARK_MAX_TURNS || 20),
    timeoutMs: Number(process.env.SPARK_TIMEOUT_MS || 120_000),
    verbose: Boolean(opts.verbose),
  };
}

async function main(): Promise<void> {
  const program = new Command();
  program
    .name("spark-agent")
    .description("Minimal open-source coding agent harness (OpenAI-compatible)")
    .argument("<task...>", "Natural language coding task")
    .option("-w, --workspace <path>", "Workspace root", process.cwd())
    .option("-m, --model <name>", "Model id")
    .option("--max-turns <n>", "Max agent turns")
    .option("-v, --verbose", "Verbose logs", false)
    .action(async (taskParts: string[], opts) => {
      const task = taskParts.join(" ").trim();
      if (!task) {
        console.error("Please provide a task, e.g. spark-agent \"add a README section\"");
        process.exitCode = 1;
        return;
      }
      const config = loadConfig(opts);
      console.log(`workspace: ${config.workspace}`);
      console.log(`model: ${config.model} @ ${config.baseUrl}`);
      console.log(`task: ${task}`);
      const summary = await runAgent(config, task);
      console.log(`\n=== summary ===\n${summary}`);
    });

  await program.parseAsync(process.argv);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
