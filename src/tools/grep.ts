import fs from "node:fs/promises";
import path from "node:path";
import { resolveInWorkspace } from "./fs.js";

const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".next",
  ".turbo",
  ".cache",
  "__pycache__",
  ".venv",
  "venv",
  "target",
  ".idea",
  ".vscode",
]);

const SKIP_FILES = new Set([
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
]);

const BINARY_EXT = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".pdf",
  ".zip",
  ".gz",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".mp3",
  ".mp4",
  ".wasm",
  ".exe",
  ".dll",
  ".so",
  ".dylib",
]);

function matchGlob(filePath: string, glob?: string): boolean {
  if (!glob) return true;
  // Minimal glob: "*.ts", "src/**/*.ts", "**/foo.ts"
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "{{GLOBSTAR}}")
    .replace(/\*/g, "[^/\\\\]*")
    .replace(/{{GLOBSTAR}}/g, ".*");
  const re = new RegExp(`^${escaped}$`, "i");
  const normalized = filePath.replace(/\\/g, "/");
  return re.test(normalized) || re.test(path.basename(normalized));
}

async function walkFiles(
  root: string,
  dir: string,
  glob: string | undefined,
  out: string[],
  maxFiles: number,
): Promise<void> {
  if (out.length >= maxFiles) return;
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (out.length >= maxFiles) return;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      await walkFiles(root, abs, glob, out, maxFiles);
      continue;
    }
    if (!entry.isFile()) continue;
    if (SKIP_FILES.has(entry.name)) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (BINARY_EXT.has(ext)) continue;
    const rel = path.relative(root, abs).replace(/\\/g, "/");
    if (!matchGlob(rel, glob)) continue;
    out.push(abs);
  }
}

export async function grepTool(
  workspace: string,
  pattern: string,
  options: {
    path?: string;
    glob?: string;
    case_insensitive?: boolean;
    max_results?: number;
  } = {},
): Promise<string> {
  if (!pattern) return "Error: empty pattern";

  let regex: RegExp;
  try {
    regex = new RegExp(pattern, options.case_insensitive ? "i" : "");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return `Invalid regex pattern: ${message}`;
  }

  const root = path.resolve(workspace);
  const startRel = options.path?.trim() || ".";
  const startAbs = resolveInWorkspace(workspace, startRel);
  const maxResults = Math.min(Math.max(options.max_results ?? 50, 1), 200);
  const maxFiles = 2000;

  const stat = await fs.stat(startAbs);
  const files: string[] = [];
  if (stat.isFile()) {
    files.push(startAbs);
  } else {
    await walkFiles(root, startAbs, options.glob, files, maxFiles);
  }

  const hits: string[] = [];
  let scanned = 0;

  for (const file of files) {
    scanned += 1;
    let content: string;
    try {
      content = await fs.readFile(file, "utf8");
    } catch {
      continue;
    }
    if (content.includes("\u0000")) continue;

    const rel = path.relative(root, file).replace(/\\/g, "/");
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i]!;
      if (!regex.test(line)) continue;
      const display = line.length > 300 ? `${line.slice(0, 300)}...` : line;
      hits.push(`${rel}:${i + 1}:${display}`);
      if (hits.length >= maxResults) {
        return [
          `Found ${hits.length}+ matches (showing first ${maxResults}; scanned ${scanned} files)`,
          ...hits,
        ].join("\n");
      }
      // Reset lastIndex for global-less regex reuse safety if flags change later
      regex.lastIndex = 0;
    }
  }

  if (hits.length === 0) {
    return `No matches for /${pattern}/${options.case_insensitive ? "i" : ""} (scanned ${scanned} files)`;
  }

  return [`Found ${hits.length} matches (scanned ${scanned} files)`, ...hits].join("\n");
}
