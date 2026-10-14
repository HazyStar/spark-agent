# Spark Agent

**A minimal open-source coding agent harness** — not a fork of Claude Code / Codex / DeepSeek Harness.

> 中文：这是一个**自研、可读、MIT 开源**的迷你 Coding Agent，用来展示「Agent 循环 + 工具调用」的核心，而不是 fork 大型产品。适合作为作品集样例与二次开发起点。

Spark Agent shows the *core loop* behind modern coding agents:

```text
user → LLM (tool calling) → tools (fs / shell) → observe → repeat → final answer
```

It is intentionally small, readable, and MIT-licensed — suitable as a portfolio / teaching project, and as a starting point for your own agent experiments.

## Why this project (not a big fork)

| Approach | Verdict |
|----------|---------|
| Fork DeepSeek Harness / clone Claude Code | Hard to maintain; hard to claim as your work |
| **Build a tiny original harness** | Clear ownership, easy to explain in interviews |

Spark Agent focuses on:

- OpenAI-compatible APIs (DeepSeek, OpenAI, local gateways)
- Workspace-scoped tools (`list_dir` / `read_file` / `write_file` / `run_command`)
- A transparent agent loop you can read in one sitting

## Quick start

```bash
git clone https://github.com/HazyStar/spark-agent.git
cd spark-agent
npm install
cp .env.example .env   # set SPARK_API_KEY
npm run build
node dist/cli.js "List the files in this repo and summarize what it does" -v
```

Dev mode (no build):

```bash
npm run dev -- "Create examples/hello.txt with Hello Spark" -v
```

### Environment

| Variable | Default | Meaning |
|----------|---------|---------|
| `SPARK_API_KEY` | — | API key (required; `OPENAI_API_KEY` also accepted) |
| `SPARK_BASE_URL` | `https://api.deepseek.com/v1` | OpenAI-compatible base URL |
| `SPARK_MODEL` | `deepseek-chat` | Model id |
| `SPARK_MAX_TURNS` | `20` | Max agent loop turns |
| `SPARK_WORKSPACE` | `.` | Default workspace root |

## CLI

```bash
spark-agent "<task>" [options]

Options:
  -w, --workspace <path>   Workspace root (default: .)
  -m, --model <name>       Model id
  --base-url <url>         API base URL
  --max-turns <n>          Max turns (default: 20)
  -v, --verbose            Print tool calls
```

After `npm link` (optional):

```bash
npm link
spark-agent "Run npm run typecheck and fix any errors" -v
```

## Architecture

```text
src/
  cli.ts          # CLI entry
  agent.ts        # agent loop
  llm.ts          # chat/completions client
  tools/
    index.ts      # tool schemas + dispatch
    fs.ts         # sandboxed file tools
    shell.ts      # workspace-scoped shell
```

### Safety notes (MVP)

- File tools resolve paths under the workspace and reject `..` escapes
- Shell runs with `cwd = workspace`
- A few obviously dangerous command patterns are blocked
- This is **not** a full sandbox (no container / seccomp). Use on trusted local tasks only.

## Roadmap ideas

- Streaming + prettier TUI
- Patch-based edits (`apply_patch`) instead of full-file writes
- MCP tool bridge
- Eval harness (task suite + scores)
- Plugin profile system (inspired by — not forked from — larger harnesses)

## License

MIT © HazyStar

## Positioning vs popular agents

- **Claude Code / Codex**: polished product agents — great to use daily
- **DeepSeek Harness / OpenClaw**: large extensible runtimes
- **Spark Agent**: a *small original* reference implementation of the harness loop, written so you can learn, demo, and extend it
