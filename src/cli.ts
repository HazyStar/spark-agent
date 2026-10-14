#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { config as loadDotenv } from "dotenv";
import { runAgent } from "./agent.js";
import { listProviders, resolveProvider } from "./providers.js";
import type { AgentConfig } from "./types.js";

loadDotenv();

const here = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(here, "..");

const program = new Command();

program
  .name("spark-agent")
  .description(
    "面向国内大模型 API 的迷你 Coding Agent（多 Provider + 强制验证环）",
  )
  .argument("<task>", "自然语言编程任务")
  .option(
    "-p, --provider <name>",
    `模型服务商：${listProviders()
      .map((p) => p.id)
      .join("|")}`,
    process.env.SPARK_PROVIDER || "deepseek",
  )
  .option(
    "-w, --workspace <path>",
    "Agent 可访问的工作区根目录",
    process.env.SPARK_WORKSPACE || ".",
  )
  .option("-m, --model <name>", "模型 id（覆盖 provider 默认）")
  .option("--base-url <url>", "OpenAI 兼容 API base URL（覆盖 provider 默认）")
  .option(
    "--max-turns <n>",
    "最大循环轮次",
    process.env.SPARK_MAX_TURNS || "20",
  )
  .option("--no-verify", "关闭强制验证环")
  .option("-v, --verbose", "打印工具调用与验证日志", false)
  .addHelpText(
    "after",
    `
示例:
  spark-agent -p deepseek "用中文总结这个仓库" -v
  spark-agent -p qwen "给 README 加一节安装说明" -v
  spark-agent -p custom --base-url http://127.0.0.1:8000/v1 -m my-model "列出文件"
`,
  )
  .action(async (task: string, opts: {
    provider: string;
    workspace: string;
    model?: string;
    baseUrl?: string;
    maxTurns: string;
    verify: boolean;
    verbose: boolean;
  }) => {
    const workspace = path.resolve(opts.workspace);

    let resolved;
    try {
      resolved = resolveProvider({
        provider: opts.provider,
        baseUrl: opts.baseUrl,
        model: opts.model,
        searchDirs: [workspace, process.cwd(), packageRoot],
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(message);
      process.exit(1);
    }

    const config: AgentConfig = {
      apiKey: resolved.apiKey,
      baseUrl: resolved.baseUrl,
      model: resolved.model,
      workspace,
      maxTurns: Math.max(1, Number.parseInt(opts.maxTurns, 10) || 20),
      verbose: Boolean(opts.verbose),
      verify: opts.verify !== false,
      provider: resolved.provider,
    };

    console.error(`provider: ${resolved.label} (${resolved.provider})`);
    console.error(`workspace: ${config.workspace}`);
    console.error(`model: ${config.model} @ ${config.baseUrl}`);
    console.error(`verify: ${config.verify ? "on" : "off"}`);

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
