# Spark Agent

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Node.js >= 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)
[![GitHub](https://img.shields.io/badge/GitHub-HazyStar%2Fspark--agent-181717?logo=github)](https://github.com/HazyStar/spark-agent)

**面向国内大模型 API 的迷你 Coding Agent Harness**（MIT）

> English: A small, readable coding-agent harness optimized for China LLM APIs (DeepSeek / Qwen / GLM / Kimi / SiliconFlow), with a forced verify loop and a reproducible Lite eval suite. Not a Claude Code / Codex fork.

```text
任务 → LLM（Tool Calling）→ 读写文件 / 执行命令 → 强制验证环 → 中文总结
```

## 为什么做 Spark Agent

国内模型在聊天里能写代码，但当 **Coding Agent** 时经常翻车：漏调工具、改完不验证、一次吐太多。  
差距很多时候在 **Harness**，不只在模型。

| 方案 | 问题 |
|------|------|
| 纯聊天改代码 | 无工具、无闭环，难落地到真实仓库 |
| 套壳「国产 Claude Code」 | 体验绑海外产品叙事，难证明自己有效 |
| Fork 大型 Harness | 维护成本高，作品集难讲清贡献 |
| **Spark Agent** | 小而可读 + 国内 Provider + 验证环 + 可复现评测 |

## 亮点

1. **国内 API 一等公民** — DeepSeek / 通义 / 智谱 / Kimi / 硅基流动预设；密钥可用环境变量或本地 `*_apikey` 文件  
2. **强制验证环** — 改文件后自动发现并跑 `verify.mjs` / `check.mjs` / `typecheck|test|build`，失败继续修  
3. **可复现评测** — `evals/lite` 对比 `chat` / `no-verify` / `verify`，脚本判分而非模型自述  
4. **诚实边界** — Lite 在 DeepSeek-chat 上已饱和；公开写清「基建已通，增益需更弱模型 / SWE 子集」  
5. **小而可读** — 核心循环可在一个下午读完：`src/agent.ts` · `src/verify.ts` · `src/providers.ts`

## 30 秒上手

前置：Node.js ≥ 18，以及任一国内 API Key（下面以 DeepSeek 为例）。

```bash
git clone https://github.com/HazyStar/spark-agent.git
cd spark-agent
npm install
npm run build

# 把 key 放进本地文件（已 gitignore）
echo "sk-你的key" > deepseek_apikey

# 对当前目录跑一条任务
npm run spark -- "用中文总结这个仓库在做什么" -v
```

或使用环境变量：

```bash
# Windows PowerShell
$env:SPARK_API_KEY="sk-你的key"
npm run spark -- -p deepseek "列出 src 目录并说明每个文件职责" -v

# macOS / Linux
export SPARK_API_KEY=sk-你的key
npm run spark -- -p deepseek "列出 src 目录并说明每个文件职责" -v
```

更完整的说明：[docs/getting-started.md](./docs/getting-started.md) · 可复制示例：[examples/quickstart.md](./examples/quickstart.md)

## 常用场景

```bash
# 1) 修 bug / 改代码（在指定工作区）
npm run spark -- -w ./your-project "修复 typecheck 报错" -v

# 2) 新建小文件
npm run spark -- "创建 notes/todo.md，写三条本周计划" -v

# 3) 跑 Lite 评测（对比 chat / 无验证环 / 有验证环）
npm run eval:lite
```

## CLI

```bash
npm run spark -- "<任务>" [options]
# 或：npx tsx src/cli.ts "<任务>" ...
# 或：npm link 后直接 spark-agent "<任务>" ...
```

| 选项 | 含义 |
|------|------|
| `-p, --provider` | `deepseek\|qwen\|zhipu\|moonshot\|siliconflow\|openai\|custom` |
| `-w, --workspace` | 工作区根目录（默认 `.`） |
| `-m, --model` | 覆盖默认模型 |
| `--base-url` | 覆盖 OpenAI 兼容 Base URL |
| `--max-turns` | 最大轮次（默认 20） |
| `--no-verify` | 关闭强制验证环 |
| `-v, --verbose` | 打印工具与验证日志 |

### Provider 默认值

| Provider | Base URL | 默认模型 | Key 环境变量 / 文件 |
|----------|----------|----------|---------------------|
| deepseek | `https://api.deepseek.com/v1` | `deepseek-chat` | `DEEPSEEK_API_KEY` / `deepseek_apikey` |
| qwen | DashScope compatible | `qwen-coder-plus` | `DASHSCOPE_API_KEY` / `qwen_apikey` |
| zhipu | BigModel v4 | `glm-4-flash` | `ZHIPU_API_KEY` / `zhipu_apikey` |
| moonshot | `https://api.moonshot.cn/v1` | `moonshot-v1-auto` | `MOONSHOT_API_KEY` |
| siliconflow | `https://api.siliconflow.cn/v1` | DeepSeek-V3 | `SILICONFLOW_API_KEY` |
| openai | `https://api.openai.com/v1` | `gpt-4o-mini` | `OPENAI_API_KEY` |
| custom | `SPARK_BASE_URL` | `SPARK_MODEL` | `SPARK_API_KEY` |

## 架构

```text
src/
  cli.ts          # CLI / provider 解析
  providers.ts    # 国内 API 预设与 Key 解析
  prompt.ts       # 中文 system prompt
  agent.ts        # Agent 循环 + 验证门闩
  verify.ts       # 自动发现并执行验证命令
  llm.ts          # OpenAI-compatible chat/completions
  tools/          # list_dir / grep / read_file / apply_patch / write_file / run_command
```

## 评测

固定同一模型，对比三种设置：

| Mode | 含义 |
|------|------|
| `chat` | 无工具，一次 JSON 改文件 |
| `no-verify` | 工具环，关闭验证门闩 |
| `verify` | 工具环 + 强制验证门闩 |

```bash
npm run eval:lite
```

详见 [evals/lite/README.md](./evals/lite/README.md)。

**已跑结果（DeepSeek-chat）**：Lite 对强模型过易，三种模式均可冲到满分 —— 说明评测基建可用；下一步用更弱国内模型或 SWE-bench 子集拉开差距。见 [evals/lite/results/latest.md](./evals/lite/results/latest.md)。

## 安全与限制

- 文件路径限制在 workspace 内；Shell `cwd` 固定为 workspace  
- **不是**容器级沙箱；请只在可信本地任务中使用  
- 切勿提交 `*_apikey` / `github_token` / `.env`  
- 详见 [SECURITY.md](./SECURITY.md)

## 路线图

- [x] 国内多 Provider + 中文提示 + 强制验证环  
- [x] Spark Lite 评测（chat / no-verify / verify）  
- [x] `apply_patch` 局部编辑 + `grep` 代码搜索
- [ ] Provider 级重试 / JSON 修复  
- [ ] 更弱模型对比 + SWE-bench 子集  
- [ ] npm 发布（当前推荐 git clone）  
- [ ] MCP 工具桥 / 更友好 TUI  

## 贡献

欢迎加 Provider、加 Lite 题、修文档。见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

**建议 GitHub Topics**：`coding-agent` · `llm-harness` · `deepseek` · `qwen` · `agent` · `typescript`

## License

MIT © [HazyStar](https://github.com/HazyStar)
