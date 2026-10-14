import fs from "node:fs/promises";
import path from "node:path";
import { runCommand } from "./tools/shell.js";

export interface VerifyPlan {
  commands: string[];
  reason: string;
}

export async function detectVerifyPlan(workspace: string): Promise<VerifyPlan> {
  // Prefer explicit harness oracles used by Spark Lite evals
  for (const oracle of ["verify.mjs", "check.mjs"]) {
    try {
      await fs.access(path.join(workspace, oracle));
      return {
        commands: [`node ${oracle}`],
        reason: oracle,
      };
    } catch {
      // continue
    }
  }

  const pkgPath = path.join(workspace, "package.json");
  try {
    const raw = await fs.readFile(pkgPath, "utf8");
    const pkg = JSON.parse(raw) as { scripts?: Record<string, string> };
    const scripts = pkg.scripts ?? {};
    if (scripts.typecheck) {
      return { commands: ["npm run typecheck"], reason: "package.json scripts.typecheck" };
    }
    if (scripts.test) {
      return { commands: ["npm test"], reason: "package.json scripts.test" };
    }
    if (scripts.build) {
      return { commands: ["npm run build"], reason: "package.json scripts.build" };
    }
  } catch {
    // ignore missing/invalid package.json
  }

  for (const marker of ["pyproject.toml", "pytest.ini", "setup.cfg"]) {
    try {
      await fs.access(path.join(workspace, marker));
      return { commands: ["python -m pytest -q"], reason: marker };
    } catch {
      // continue
    }
  }

  try {
    await fs.access(path.join(workspace, "Cargo.toml"));
    return { commands: ["cargo check"], reason: "Cargo.toml" };
  } catch {
    // ignore
  }

  try {
    await fs.access(path.join(workspace, "go.mod"));
    return { commands: ["go test ./..."], reason: "go.mod" };
  } catch {
    // ignore
  }

  return {
    commands: [],
    reason: "未检测到可自动验证的项目脚本",
  };
}

export async function runVerifyPlan(
  workspace: string,
  plan: VerifyPlan,
): Promise<{ ok: boolean; report: string }> {
  if (plan.commands.length === 0) {
    return {
      ok: true,
      report: `跳过验证：${plan.reason}`,
    };
  }

  const chunks: string[] = [`验证计划（${plan.reason}）:`];
  let ok = true;

  for (const command of plan.commands) {
    chunks.push(`$ ${command}`);
    const output = await runCommand(workspace, command);
    chunks.push(output);
    const exitMatch = output.match(/exit_code:\s*(-?\d+|null)/);
    const code = exitMatch?.[1];
    if (code !== "0") {
      ok = false;
      break;
    }
  }

  return { ok, report: chunks.join("\n\n") };
}

export function buildVerifyReminder(report: string, ok: boolean): string {
  if (ok) {
    return [
      "【强制验证环】检测到你已修改文件。系统已自动跑过验证且通过。",
      "请基于验证结果做简短中文总结，说明改了什么。除非还有明确残留问题，否则不要继续大范围改动。",
      "",
      report,
    ].join("\n");
  }

  return [
    "【强制验证环】检测到你已修改文件，但验证未通过。",
    "请阅读下面的验证输出，用工具修复问题，然后再次验证。在验证通过前不要宣称任务完成。",
    "",
    report,
  ].join("\n");
}
