# Spark Agent

A **minimal open-source coding agent harness** in TypeScript.

Not a fork of DeepSeek Harness / Codex / Claude Code / OpenClaw.  
This project is intentionally small: one agent loop + a few tools + OpenAI-compatible LLM API — so you can read the whole codebase and understand how coding agents work.

## Why this exists

Products like Claude Code and Codex are polished end-user agents.  
Spark Agent is a **learning / portfolio / DIY base**:

- Clear agent loop (plan → tool calls → observe → repeat)
- Sandboxed workspace tools (`list_dir` / `read_file` / `write_file` / `run_command`)
- Works with **DeepSeek / OpenAI / any OpenAI-compatible gateway**
- MIT licensed, easy to extend

Use it to study harness design, demo tool-calling in interviews, or grow into your own specialized agent.

## Quick start

```bash
npm install
cp .env.example .env   # set SPARK_API_KEY
npm run build
node dist/cli.js "List the project files and summarize what this repo does"
```

Dev mode without build:

```bash
npx tsx src/cli.ts "Add a hello.txt that says spark-agent works"
```

### Environment

| Variable | Default | Meaning |
|----------|---------|---------|
| `SPARK_API_KEY` | required | API key (`OPENAI_API_KEY` also accepted) |
| `SPARK_BASE_URL` | `https://api.deepseek.com` | OpenAI-compatible base URL |
| `SPARK_MODEL` | `deepseek-chat` | Model id |
| `SPARK_MAX_TURNS` | `20` | Max loop turns |
| `SPARK_TIMEOUT_MS` | `120000` | LLM request timeout |

## Architecture

```text
User task
   │
   ▼
┌─────────────┐     tool_calls      ┌──────────────────┐
│  Agent loop │ ──────────────────► │ Tools (workspace)│
│  (agent.ts) │ ◄────────────────── │ list/read/write  │
└──────┬──────┘     observations    │ run_command      │
       │                            └──────────────────┘
       ▼
 OpenAI-compatible Chat Completions
 (DeepSeek / OpenAI / local proxy)
```

Key files:

- `src/cli.ts` — CLI entry
- `src/agent.ts` — agent loop
- `src/llm.ts` — chat completions client
- `src/tools/` — workspace-bound tools

## Safety notes

- Paths are resolved under `--workspace` and cannot escape with `..`
- `run_command` still executes real shell commands inside the workspace — treat untrusted prompts carefully
- Do not commit API keys

## Roadmap (good first extensions)

- [ ] Streaming token output
- [ ] Permission prompts before write / shell
- [ ] MCP tool bridge
- [ ] Multi-agent / sub-agent handoff
- [ ] Eval suite (task → expected files/tests)

## License

MIT © HazyStar
