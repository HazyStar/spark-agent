import fs from "node:fs/promises";
import path from "node:path";
import { resolveInWorkspace } from "./fs.js";

type PatchAction =
  | { kind: "update"; path: string; hunks: Array<{ search: string; replace: string }> }
  | { kind: "add"; path: string; content: string }
  | { kind: "delete"; path: string };

const BEGIN = "*** Begin Patch";
const END = "*** End Patch";
const UPDATE = "*** Update File:";
const ADD = "*** Add File:";
const DELETE = "*** Delete File:";
const SEARCH = "<<<<<<< SEARCH";
const MID = "=======";
const REPLACE_END = ">>>>>>> REPLACE";

function stripPatchFences(raw: string): string {
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:patch|diff|text)?\s*\n?/i, "").replace(/\n?```$/i, "");
  }
  return text.trim();
}

function parseHunks(body: string): Array<{ search: string; replace: string }> {
  const hunks: Array<{ search: string; replace: string }> = [];
  const lines = body.split("\n");
  let i = 0;

  while (i < lines.length) {
    while (i < lines.length && lines[i]!.trim() === "") i += 1;
    if (i >= lines.length) break;

    if (lines[i]!.trim() !== SEARCH) {
      throw new Error(
        `Expected "${SEARCH}" in update hunk, got: ${lines[i]!.slice(0, 80)}`,
      );
    }
    i += 1;

    const searchLines: string[] = [];
    while (i < lines.length && lines[i]!.trim() !== MID) {
      searchLines.push(lines[i]!);
      i += 1;
    }
    if (i >= lines.length) {
      throw new Error(`Missing "${MID}" in SEARCH/REPLACE hunk`);
    }
    i += 1;

    const replaceLines: string[] = [];
    while (i < lines.length && lines[i]!.trim() !== REPLACE_END) {
      if (lines[i]!.startsWith("*** ")) {
        throw new Error(`Missing "${REPLACE_END}" before next patch directive`);
      }
      replaceLines.push(lines[i]!);
      i += 1;
    }
    if (i >= lines.length) {
      throw new Error(`Missing "${REPLACE_END}" in SEARCH/REPLACE hunk`);
    }
    i += 1;

    hunks.push({
      search: searchLines.join("\n"),
      replace: replaceLines.join("\n"),
    });
  }

  return hunks;
}

function parseAddContent(body: string): string {
  const trimmed = body.replace(/^\n/, "").replace(/\n$/, "");
  if (trimmed.startsWith(SEARCH)) {
    const hunks = parseHunks(trimmed);
    if (hunks.length !== 1) {
      throw new Error("Add File expects exactly one SEARCH/REPLACE hunk (empty SEARCH)");
    }
    if (hunks[0]!.search.trim() !== "") {
      throw new Error("Add File SEARCH block must be empty");
    }
    return hunks[0]!.replace;
  }
  return trimmed;
}

export function parseApplyPatch(raw: string): PatchAction[] {
  const text = stripPatchFences(raw);
  if (!text.includes(BEGIN) || !text.includes(END)) {
    throw new Error(
      `Patch must include "${BEGIN}" and "${END}". See tool description for format.`,
    );
  }

  const beginIdx = text.indexOf(BEGIN);
  const endIdx = text.indexOf(END);
  if (endIdx < beginIdx) {
    throw new Error(`"${END}" appears before "${BEGIN}"`);
  }

  const inner = text.slice(beginIdx + BEGIN.length, endIdx).replace(/^\n/, "");
  const lines = inner.split("\n");
  const actions: PatchAction[] = [];
  let i = 0;

  while (i < lines.length) {
    while (i < lines.length && lines[i]!.trim() === "") i += 1;
    if (i >= lines.length) break;

    const line = lines[i]!;

    if (line.startsWith(UPDATE)) {
      const filePath = line.slice(UPDATE.length).trim();
      if (!filePath) throw new Error("Update File missing path");
      i += 1;
      const bodyLines: string[] = [];
      while (i < lines.length && !lines[i]!.startsWith("*** ")) {
        bodyLines.push(lines[i]!);
        i += 1;
      }
      const hunks = parseHunks(bodyLines.join("\n"));
      if (hunks.length === 0) {
        throw new Error(`Update File ${filePath}: need at least one SEARCH/REPLACE hunk`);
      }
      actions.push({ kind: "update", path: filePath, hunks });
      continue;
    }

    if (line.startsWith(ADD)) {
      const filePath = line.slice(ADD.length).trim();
      if (!filePath) throw new Error("Add File missing path");
      i += 1;
      const bodyLines: string[] = [];
      while (i < lines.length && !lines[i]!.startsWith("*** ")) {
        bodyLines.push(lines[i]!);
        i += 1;
      }
      actions.push({ kind: "add", path: filePath, content: parseAddContent(bodyLines.join("\n")) });
      continue;
    }

    if (line.startsWith(DELETE)) {
      const filePath = line.slice(DELETE.length).trim();
      if (!filePath) throw new Error("Delete File missing path");
      actions.push({ kind: "delete", path: filePath });
      i += 1;
      continue;
    }

    throw new Error(`Unexpected patch line: ${line.slice(0, 80)}`);
  }

  if (actions.length === 0) {
    throw new Error("Patch contained no file actions");
  }

  return actions;
}

function applySearchReplace(content: string, search: string, replace: string, filePath: string): string {
  if (search === "") {
    throw new Error(`Update File ${filePath}: SEARCH block must not be empty`);
  }
  const matches = content.split(search).length - 1;
  if (matches === 0) {
    throw new Error(
      `Update File ${filePath}: SEARCH text not found. Re-read the file and match exact content.`,
    );
  }
  if (matches > 1) {
    throw new Error(
      `Update File ${filePath}: SEARCH text matched ${matches} times; provide more unique context.`,
    );
  }
  return content.replace(search, replace);
}

export async function applyPatchTool(workspace: string, patch: string): Promise<string> {
  const actions = parseApplyPatch(patch);
  const reports: string[] = [];

  for (const action of actions) {
    const abs = resolveInWorkspace(workspace, action.path);

    if (action.kind === "add") {
      try {
        await fs.stat(abs);
        throw new Error(`Add File ${action.path}: file already exists`);
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        if (err instanceof Error && err.message.includes("already exists")) throw err;
        if (code !== "ENOENT") throw err;
      }
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, action.content, "utf8");
      reports.push(`added ${action.path} (${action.content.length} chars)`);
      continue;
    }

    if (action.kind === "delete") {
      await fs.unlink(abs);
      reports.push(`deleted ${action.path}`);
      continue;
    }

    // update
    let content = await fs.readFile(abs, "utf8");
    for (const hunk of action.hunks) {
      content = applySearchReplace(content, hunk.search, hunk.replace, action.path);
    }
    await fs.writeFile(abs, content, "utf8");
    reports.push(`updated ${action.path} (${action.hunks.length} hunks)`);
  }

  return `Patch applied:\n${reports.map((r) => `- ${r}`).join("\n")}`;
}
