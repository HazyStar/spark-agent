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

const HELP_EXAMPLES = `
示例:
  npm run spark -- "用中文总结这个仓库" -v
  npm run spark -- -p deepseek -w ./my-app "修复 typecheck" -v
  spark-agent -p qwen "给 README 加一节安装说明" -v
  spark-agent -p custom --base-url http://127.0.0.1:8000/v1 -m my-model "列出文件"

密钥:
  环境变量 SPARK_API_KEY / DEEPSEEK_API_KEY 等
  或本地文件 deepseek_apikey / qwen_apikey（已 gitignore）
  详见 docs/getting-started.md
`;

const program = new Command();

if (process.argv.length <= 2) {
  console.error("Spark Agent — 面向国内大模型 API 的迷你 Coding Agent\n");
  console.error('用法: npm run spark -- "<任务>" -v');
  console.error("     spark-agent -p deepseek \"<任务>\" -v\n");
  console.error(HELP_EXAMPLES.trim());
  process.exit(1);
}

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
  .addHelpText("after", HELP_EXAMPLES)
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
      console.error("");
      console.error("配置密钥的常用方式：");
      console.error("  1) echo sk-xxx > deepseek_apikey   # 仓库根目录，已 gitignore");
      console.error("  2) 设置环境变量 SPARK_API_KEY 或 DEEPSEEK_API_KEY");
      console.error("  3) 复制 .env.example 为 .env 后填写");
      console.error("详见 docs/getting-started.md");
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
