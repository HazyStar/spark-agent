import type { ToolSpec } from "../types.js";
import { listDir, readFile, runCommand, writeFile } from "./workspace.js";

export const toolSpecs: ToolSpec[] = [
  {
    type: "function",
    function: {
      name: "list_dir",
      description: "List files and directories under a workspace-relative path.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Relative directory path. Default: .",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read a text file inside the workspace.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative file path" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Create or overwrite a text file inside the workspace.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative file path" },
          content: { type: "string", description: "Full file content" },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_command",
      description:
        "Run a shell command inside the workspace (tests, builds, git status, etc.).",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "Shell command to execute" },
        },
        required: ["command"],
      },
    },
  },
];

export async function executeTool(
  workspace: string,
  name: string,
  rawArgs: string,
): Promise<string> {
  let args: Record<string, unknown> = {};
  try {
    args = rawArgs ? (JSON.parse(rawArgs) as Record<string, unknown>) : {};
  } catch {
    return `Invalid JSON arguments: ${rawArgs}`;
  }

  try {
    switch (name) {
      case "list_dir":
        return await listDir(workspace, String(args.path ?? "."));
      case "read_file":
        return await readFile(workspace, String(args.path ?? ""));
      case "write_file":
        return await writeFile(
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
    return `Tool error (${name}): ${err instanceof Error ? err.message : String(err)}`;
  }
}
