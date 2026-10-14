#!/usr/bin/env node
/**
 * Spark Agent Lite Eval runner
 *
 * Modes (same model, different harness):
 *   - chat:      no tools — one-shot JSON file edits applied blindly
 *   - no-verify: agent tools ON, forced verify gate OFF
 *   - verify:    agent tools ON, forced verify gate ON
 *
 * Usage:
 *   node scripts/run-eval.mjs --mode compare
 *   node scripts/run-eval.mjs --mode verify --only 13-palindrome,15-range-sum
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import os from "node:os";
import { pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const tasksRoot = path.join(repoRoot, "evals", "lite", "tasks");
const cliPath = path.join(repoRoot, "dist", "cli.js");
const { resolveProvider } = await import(
  pathToFileURL(path.join(repoRoot, "dist", "providers.js")).href
);

function parseArgs(argv) {
  const out = {
    mode: "compare",
    provider: process.env.SPARK_PROVIDER || "deepseek",
    maxTurns: process.env.SPARK_MAX_TURNS || "12",
    only: null,
    verbose: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--mode") out.mode = argv[++i];
    else if (a === "--provider") out.provider = argv[++i];
    else if (a === "--max-turns") out.maxTurns = argv[++i];
    else if (a === "--only") out.only = argv[++i].split(",").map((s) => s.trim());
    else if (a === "-v" || a === "--verbose") out.verbose = true;
  }
  return out;
}

function expandModes(mode) {
  if (mode === "compare" || mode === "all" || mode === "both") {
    // "both" kept for backward compat → no-verify+verify; prefer compare for 3-way
    if (mode === "both") return ["no-verify", "verify"];
    return ["chat", "no-verify", "verify"];
  }
  return [mode];
}

async function listTasks(only) {
  const entries = await fs.readdir(tasksRoot, { withFileTypes: true });
  let ids = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  if (only?.length) ids = ids.filter((id) => only.includes(id));
  return ids;
}

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) await copyDir(from, to);
    else await fs.copyFile(from, to);
  }
}

function run(command, args, opts) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: opts.cwd,
      env: opts.env,
      shell: false,
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
    }, opts.timeoutMs);
    child.stdout.on("data", (c) => {
      stdout += c.toString();
    });
    child.stderr.on("data", (c) => {
      stderr += c.toString();
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, stdout, stderr });
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ code: 1, stdout, stderr: String(err) });
    });
  });
}

async function listWorkspaceFiles(dir, prefix = "") {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === "verify.mjs") continue;
    const rel = prefix ? `${prefix}/${e.name}` : e.name;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await listWorkspaceFiles(full, rel)));
    else {
      const text = await fs.readFile(full, "utf8");
      out.push({ path: rel, content: text.slice(0, 8000) });
    }
  }
  return out;
}

function extractJsonObject(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fenced ? fenced[1] : text).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("no json object in chat response");
  return JSON.parse(raw.slice(start, end + 1));
}

async function runChatBaseline(workspace, taskPrompt, provider) {
  const files = await listWorkspaceFiles(workspace);
  const fileBlock = files
    .map((f) => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
    .join("\n\n");

  const messages = [
    {
      role: "system",
      content:
        "你是编码助手。不能使用工具。请一次给出最终文件修改。只输出 JSON：{\"files\":{\"<relativePath>\":\"<full file content>\"}}。不要输出其它说明。",
    },
    {
      role: "user",
      content: `任务：\n${taskPrompt}\n\n当前工作区文件：\n${fileBlock}`,
    },
  ];

  const url = `${provider.baseUrl.replace(/\/$/, "")}/chat/completions`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model: provider.model,
      messages,
      temperature: 0.2,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || JSON.stringify(data));
  }
  const content = data.choices?.[0]?.message?.content || "";
  const parsed = extractJsonObject(content);
  const map = parsed.files || parsed;
  if (!map || typeof map !== "object") throw new Error("invalid files map");

  for (const [rel, body] of Object.entries(map)) {
    if (typeof body !== "string") continue;
    if (rel.includes("..")) continue;
    const target = path.join(workspace, rel);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, body, "utf8");
  }
  return content.slice(0, 500);
}

async function runOneTask(taskId, mode, opts, provider) {
  const taskDir = path.join(tasksRoot, taskId);
  const workspaceSrc = path.join(taskDir, "workspace");
  const taskPrompt = await fs.readFile(path.join(taskDir, "task.md"), "utf8");
  const verifySrc = path.join(taskDir, "verify.mjs");

  const workRoot = await fs.mkdtemp(path.join(os.tmpdir(), `spark-eval-${taskId}-`));
  const workspace = path.join(workRoot, "workspace");
  await copyDir(workspaceSrc, workspace);
  await fs.copyFile(verifySrc, path.join(workspace, "verify.mjs"));

  const started = Date.now();
  let agentExit = 0;
  let agentTail = "";

  if (mode === "chat") {
    try {
      agentTail = await runChatBaseline(workspace, taskPrompt.trim(), provider);
    } catch (err) {
      agentExit = 1;
      agentTail = err instanceof Error ? err.message : String(err);
    }
  } else {
    const agentArgs = [
      cliPath,
      taskPrompt.trim(),
      "-p",
      opts.provider,
      "-w",
      workspace,
      "--max-turns",
      String(opts.maxTurns),
    ];
    if (mode === "no-verify") agentArgs.push("--no-verify");
    if (opts.verbose) agentArgs.push("-v");

    const agent = await run(process.execPath, agentArgs, {
      cwd: repoRoot,
      env: { ...process.env, SPARK_PROVIDER: opts.provider },
      timeoutMs: 180_000,
    });
    agentExit = agent.code;
    agentTail = (agent.stdout + "\n" + agent.stderr).slice(-1200);
  }

  const verify = await run(process.execPath, ["verify.mjs"], {
    cwd: workspace,
    env: process.env,
    timeoutMs: 30_000,
  });

  const passed = verify.code === 0;
  const result = {
    taskId,
    mode,
    passed,
    durationMs: Date.now() - started,
    agentExit,
    verifyExit: verify.code,
    agentTail,
    verifyOut: (verify.stdout + "\n" + verify.stderr).trim().slice(0, 500),
    workRoot: passed ? undefined : workRoot,
  };

  if (passed) {
    await fs.rm(workRoot, { recursive: true, force: true });
  }

  return result;
}

function summarize(results) {
  const byMode = {};
  for (const r of results) {
    byMode[r.mode] ??= { total: 0, passed: 0, rows: [] };
    byMode[r.mode].total += 1;
    if (r.passed) byMode[r.mode].passed += 1;
    byMode[r.mode].rows.push(r);
  }
  return byMode;
}

function toMarkdown(byMode, meta) {
  const lines = [];
  lines.push("# Spark Agent Lite Eval Results");
  lines.push("");
  lines.push(`- Date: ${meta.date}`);
  lines.push(`- Provider: \`${meta.provider}\``);
  lines.push(`- Max turns: ${meta.maxTurns}`);
  lines.push(`- Tasks: ${meta.taskCount}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push("| Mode | Pass | Total | Rate |");
  lines.push("|------|------|-------|------|");
  for (const mode of ["chat", "no-verify", "verify"]) {
    const s = byMode[mode];
    if (!s) continue;
    const rate = s.total ? ((100 * s.passed) / s.total).toFixed(1) + "%" : "n/a";
    lines.push(`| ${mode} | ${s.passed} | ${s.total} | ${rate} |`);
  }
  lines.push("");
  lines.push("## Per-task");
  lines.push("");
  lines.push("| Task | Mode | Pass | Seconds |");
  lines.push("|------|------|------|---------|");
  for (const mode of ["chat", "no-verify", "verify"]) {
    const s = byMode[mode];
    if (!s) continue;
    for (const r of s.rows) {
      lines.push(
        `| ${r.taskId} | ${mode} | ${r.passed ? "PASS" : "FAIL"} | ${(r.durationMs / 1000).toFixed(1)} |`,
      );
    }
  }
  lines.push("");
  lines.push("## Interpretation");
  lines.push("");
  lines.push("- `chat`: 无工具，一次生成 JSON 改文件（弱 Harness）");
  lines.push("- `no-verify`: Spark Agent 工具环，关闭强制验证门闩");
  lines.push("- `verify`: Spark Agent 工具环 + 强制验证门闩");
  lines.push("");
  lines.push("若 `verify` / `no-verify` 明显高于 `chat`，说明工具型 Harness 有效。");
  lines.push("若 `verify` 高于 `no-verify`，说明强制验证环额外有效。");
  lines.push("");
  return lines.join("\n");
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const modes = expandModes(opts.mode);

  for (const m of modes) {
    if (!["chat", "verify", "no-verify"].includes(m)) {
      console.error(`Unknown mode: ${m}`);
      process.exit(1);
    }
  }

  try {
    await fs.access(cliPath);
  } catch {
    console.error("Missing dist/cli.js — run `npm run build` first.");
    process.exit(1);
  }

  let provider;
  try {
    provider = resolveProvider({
      provider: opts.provider,
      searchDirs: [repoRoot, process.cwd()],
    });
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  const taskIds = await listTasks(opts.only);
  if (!taskIds.length) {
    console.error("No tasks found.");
    process.exit(1);
  }

  console.error(
    `Running ${taskIds.length} tasks × ${modes.length} modes on ${provider.label}`,
  );
  const results = [];

  for (const mode of modes) {
    for (const taskId of taskIds) {
      console.error(`\n>>> ${mode} :: ${taskId}`);
      const r = await runOneTask(taskId, mode, opts, provider);
      console.error(
        r.passed
          ? `PASS (${(r.durationMs / 1000).toFixed(1)}s)`
          : `FAIL (${(r.durationMs / 1000).toFixed(1)}s)`,
      );
      if (!r.passed && opts.verbose) {
        console.error(r.verifyOut || r.agentTail);
      }
      results.push(r);
    }
  }

  const byMode = summarize(results);
  const outDir = path.join(repoRoot, "evals", "lite", "results");
  await fs.mkdir(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const jsonPath = path.join(outDir, `lite-${stamp}.json`);
  const mdPath = path.join(outDir, `lite-${stamp}.md`);
  const latestJson = path.join(outDir, "latest.json");
  const latestMd = path.join(outDir, "latest.md");

  const payload = {
    meta: {
      date: new Date().toISOString(),
      provider: opts.provider,
      model: provider.model,
      maxTurns: opts.maxTurns,
      taskCount: taskIds.length,
      modes,
    },
    summary: Object.fromEntries(
      Object.entries(byMode).map(([k, v]) => [
        k,
        { passed: v.passed, total: v.total, rate: v.total ? v.passed / v.total : 0 },
      ]),
    ),
    results,
  };

  const md = toMarkdown(byMode, {
    date: payload.meta.date,
    provider: `${opts.provider} / ${provider.model}`,
    maxTurns: opts.maxTurns,
    taskCount: taskIds.length,
  });

  await fs.writeFile(jsonPath, JSON.stringify(payload, null, 2), "utf8");
  await fs.writeFile(mdPath, md, "utf8");
  await fs.writeFile(latestJson, JSON.stringify(payload, null, 2), "utf8");
  await fs.writeFile(latestMd, md, "utf8");

  console.log("\n" + md);
  console.error(`\nWrote ${mdPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
