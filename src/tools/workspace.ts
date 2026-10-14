import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

export function resolveInWorkspace(workspace: string, relativePath: string): string {
  const root = path.resolve(workspace);
  const target = path.resolve(root, relativePath || ".");
  const rel = path.relative(root, target);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`Path escapes workspace: ${relativePath}`);
  }
  return target;
}

export async function listDir(workspace: string, relativePath = "."): Promise<string> {
  const dir = resolveInWorkspace(workspace, relativePath);
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const lines = entries
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((e) => `${e.isDirectory() ? "dir " : "file"} ${e.name}`);
  return lines.length ? lines.join("\n") : "(empty)";
}

export async function readFile(
  workspace: string,
  relativePath: string,
  maxChars = 80_000,
): Promise<string> {
  const file = resolveInWorkspace(workspace, relativePath);
  const text = await fs.readFile(file, "utf8");
  if (text.length > maxChars) {
    return `${text.slice(0, maxChars)}\n\n...[truncated ${text.length - maxChars} chars]`;
  }
  return text;
}

export async function writeFile(
  workspace: string,
  relativePath: string,
  content: string,
): Promise<string> {
  const file = resolveInWorkspace(workspace, relativePath);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, content, "utf8");
  return `Wrote ${relativePath} (${content.length} chars)`;
}

export async function runCommand(
  workspace: string,
  command: string,
  timeoutMs = 60_000,
): Promise<string> {
  const root = path.resolve(workspace);
  return new Promise((resolve) => {
    const child = spawn(command, {
      cwd: root,
      shell: true,
      env: process.env,
    });

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      resolve(
        `Command timed out after ${timeoutMs}ms\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`,
      );
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
      if (stdout.length > 40_000) stdout = `${stdout.slice(0, 40_000)}\n...[truncated]`;
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
      if (stderr.length > 20_000) stderr = `${stderr.slice(0, 20_000)}\n...[truncated]`;
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve(
        [
          `exit_code: ${code ?? "null"}`,
          "STDOUT:",
          stdout || "(empty)",
          "STDERR:",
          stderr || "(empty)",
        ].join("\n"),
      );
    });
  });
}
