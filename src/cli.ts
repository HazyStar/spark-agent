#!/usr/bin/env node
import path from "node:path";
import { Command } from "commander";
import { config as loadDotenv } from "dotenv";
import { runAgent } from "./agent.js";
import type { AgentConfig } from "./types.js";

loadDotenv();

const program = new Command();

program
  .name("spark-agent")
  .description(
    "Minimal open-source coding agent harness (OpenAI-compatible / DeepSeek)",
  )
  .argument("<task>", "Natural language coding task")
  .option(
    "-w, --workspace <path>",
    "Workspace root the agent can access",
    process.env.SPARK_WORKSPACE || ".",
  )
  .option(
    "-m, --model <name>",
    "Model id",
    process.env.SPARK_MODEL || "deepseek-chat",
  )
  .option(
    "--base-url <url>",
    "OpenAI-compatible API base URL",
    process.env.SPARK_BASE_URL || "https://api.deepseek.com/v1",
  )
  .option(
    "--max-turns <n>",
    "Maximum agent loop turns",
    process.env.SPARK_MAX_TURNS || "20",
  )
  .option("-v, --verbose", "Print tool calls and intermediate logs", false)
  .action(async (task: string, opts: {
    workspace: string;
    model: string;
    baseUrl: string;
    maxTurns: string;
    verbose: boolean;
  }) => {
    const apiKey = process.env.SPARK_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error(
        "Missing SPARK_API_KEY (or OPENAI_API_KEY). Copy .env.example to .env and set your key.",
      );
      process.exit(1);
    }

    const config: AgentConfig = {
      apiKey,
      baseUrl: opts.baseUrl,
      model: opts.model,
      workspace: path.resolve(opts.workspace),
      maxTurns: Math.max(1, Number.parseInt(opts.maxTurns, 10) || 20),
      verbose: Boolean(opts.verbose),
    };

    console.error(`workspace: ${config.workspace}`);
    console.error(`model: ${config.model} @ ${config.baseUrl}`);

    try {
      const result = await runAgent(config, task);
      console.log("\n" + result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\nError: ${message}`);
      process.exit(1);
    }
  });

program.parseAsync(process.argv);
