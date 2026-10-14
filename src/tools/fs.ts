import fs from "node:fs/promises";
import path from "node:path";

export function resolveInWorkspace(workspace: string, relativePath: string): string {
  const root = path.resolve(workspace);
  const target = path.resolve(root, relativePath);

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

export async function readFileTool(
  workspace: string,
  relativePath: string,
  maxChars = 80_000,
): Promise<string> {
  const file = resolveInWorkspace(workspace, relativePath);
  const content = await fs.readFile(file, "utf8");
  if (content.length <= maxChars) return content;
  return `${content.slice(0, maxChars)}\n\n...[truncated ${content.length - maxChars} chars]`;
}

export async function writeFileTool(
  workspace: string,
  relativePath: string,
  content: string,
): Promise<string> {
  const file = resolveInWorkspace(workspace, relativePath);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, content, "utf8");
  return `Wrote ${relativePath} (${content.length} chars)`;
}
