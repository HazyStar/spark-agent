import type { ToolDefinition } from "../types.js";
import { listDir, readFileTool, writeFileTool } from "./fs.js";
import { runCommand } from "./shell.js";

export const toolDefinitions: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "list_dir",
      description: "列出工作区相对路径下的文件与目录。",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "相对目录路径，默认 '.'",
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
      description: "读取工作区内的 UTF-8 文本文件。",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "相对文件路径" },
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
      description: "创建或覆盖工作区内的 UTF-8 文本文件。修改后应进行验证。",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "相对文件路径" },
          content: { type: "string", description: "要写入的完整文件内容" },
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
        "在工作区内执行 shell 命令。优先短时、非交互命令（typecheck / test / build / git status）。",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "要执行的 shell 命令" },
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
