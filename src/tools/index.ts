import type { ToolDefinition } from "../types.js";
import { listDir, readFileTool, writeFileTool } from "./fs.js";
import { runCommand } from "./shell.js";

export const toolDefinitions: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "list_dir",
      description: "List files and directories under a path relative to the workspace root.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Relative directory path. Defaults to '.'",
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read a UTF-8 text file relative to the workspace root.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative file path" },
        },
        required: ["path"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Create or overwrite a UTF-8 text file relative to the workspace root.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative file path" },
          content: { type: "string", description: "Full file content to write" },
        },
        required: ["path", "content"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_command",
      description:
        "Run a shell command inside the workspace. Prefer short, non-interactive commands (tests, builds, git status).",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "Shell command to execute" },
        },
        required: ["command"],
        additionalProperties: false,
      },
    },
  },
];

export async function executeTool(
  workspace: string,
  name: string,
  argsJson: string,
): Promise<string> {
  let args: Record<string, unknown>;
  try {
    args = JSON.parse(argsJson || "{}") as Record<string, unknown>;
  } catch {
    return `Invalid JSON arguments: ${argsJson}`;
  }

  try {
    switch (name) {
      case "list_dir":
        return await listDir(workspace, String(args.path ?? "."));
      case "read_file":
        return await readFileTool(workspace, String(args.path ?? ""));
      case "write_file":
        return await writeFileTool(
          workspace,
          String(args.path ?? ""),
          String(args.content ?? ""),
        );
      case "run_command":
        return await runCommand(workspace, String(args.command ?? ""));
      default:
        return `Unknown tool: ${name}`;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return `Tool error (${name}): ${message}`;
  }
}
