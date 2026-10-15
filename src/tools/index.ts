import type { ToolDefinition } from "../types.js";
import { applyPatchTool } from "./apply_patch.js";
import { listDir, readFileTool, writeFileTool } from "./fs.js";
import { grepTool } from "./grep.js";
import { runCommand } from "./shell.js";

const APPLY_PATCH_FORMAT = [
  "局部修改文件（优先于 write_file）。格式：",
  "*** Begin Patch",
  "*** Update File: relative/path.ts",
  "<<<<<<< SEARCH",
  "要替换的原文（必须唯一匹配）",
  "=======",
  "替换后的新文",
  ">>>>>>> REPLACE",
  "*** Add File: relative/new.ts",
  "新文件全文",
  "*** Delete File: relative/old.ts",
  "*** End Patch",
  "同一 Update File 可有多组 SEARCH/REPLACE；Add File 也可用空 SEARCH + REPLACE 块。",
].join("\n");

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
      name: "grep",
      description:
        "在工作区内用正则搜索代码/文本，返回 path:line:content。改代码前先用它定位。",
      parameters: {
        type: "object",
        properties: {
          pattern: {
            type: "string",
            description: "JavaScript 正则（不含斜杠分隔符）",
          },
          path: {
            type: "string",
            description: "相对文件或目录，默认整个工作区",
          },
          glob: {
            type: "string",
            description: '可选文件过滤，如 "*.ts" 或 "src/**/*.js"',
          },
          case_insensitive: {
            type: "boolean",
            description: "忽略大小写，默认 false",
          },
          max_results: {
            type: "number",
            description: "最多返回条数，默认 50，上限 200",
          },
        },
        required: ["pattern"],
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
      name: "apply_patch",
      description: APPLY_PATCH_FORMAT,
      parameters: {
        type: "object",
        properties: {
          patch: {
            type: "string",
            description: "完整 patch 文本（含 Begin/End Patch）",
          },
        },
        required: ["patch"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description:
        "创建或整文件覆盖工作区内的 UTF-8 文本。仅在新建大文件或必须整文件重写时使用；局部修改请用 apply_patch。",
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
      case "grep":
        return await grepTool(workspace, String(args.pattern ?? ""), {
          path: args.path !== undefined ? String(args.path) : undefined,
          glob: args.glob !== undefined ? String(args.glob) : undefined,
          case_insensitive: Boolean(args.case_insensitive),
          max_results:
            typeof args.max_results === "number"
              ? args.max_results
              : args.max_results !== undefined
                ? Number(args.max_results)
                : undefined,
        });
      case "read_file":
        return await readFileTool(workspace, String(args.path ?? ""));
      case "apply_patch":
        return await applyPatchTool(workspace, String(args.patch ?? ""));
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
