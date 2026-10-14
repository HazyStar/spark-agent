import { spawn } from "node:child_process";
import path from "node:path";

const BLOCKED = [
  /\brm\s+(-[^\s]*f[^\s]*\s+)?\//i,
  /\bmkfs\b/i,
  /\bdd\s+if=/i,
  /\bshutdown\b/i,
  /\breboot\b/i,
];

export async function runCommand(
  workspace: string,
  command: string,
  timeoutMs = 60_000,
): Promise<string> {
  const trimmed = command.trim();
  if (!trimmed) return "Error: empty command";

  for (const pattern of BLOCKED) {
    if (pattern.test(trimmed)) {
      return `Blocked potentially dangerous command: ${trimmed}`;
    }
  }

  const cwd = path.resolve(workspace);

  return new Promise((resolve) => {
    const child = spawn(trimmed, {
      cwd,
      shell: true,
      env: process.env,
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGTERM");
      resolve(`Timed out after ${timeoutMs}ms\nstdout:\n${stdout}\nstderr:\n${stderr}`);
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
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(
        [
          `exit_code: ${code ?? "null"}`,
          "stdout:",
          stdout || "(empty)",
          "stderr:",
          stderr || "(empty)",
        ].join("\n"),
      );
    });

    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(`Failed to start command: ${err.message}`);
    });
  });
}
