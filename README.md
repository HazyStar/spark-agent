# Spark Agent

**面向国内大模型 API 的迷你 Coding Agent Harness**（MIT）

不是 Claude Code / Codex / Cursor / DeepSeek Harness 的 fork，而是一个小而完整的自研运行时，用来验证：

> 国内模型并不「天生不会写代码」——缺的是适合它们的 Harness（工具调用、小步修改、强制验证）。

```text
任务 → LLM（Tool Calling）→ 读写文件 / 执行命令 → 强制验证环 → 中文总结
```

## v0.2 新特性

- **多 Provider**：`deepseek` / `qwen` / `zhipu` / `moonshot` / `siliconflow` / `openai` / `custom`
- **强制验证环**：一旦改文件，结束前自动跑 `typecheck` / `test` / `build`（可识别），失败则要求继续修
- **中文系统提示**：面向国内模型的工作方式与输出风格

## 快速开始

```bash
git clone https://github.com/HazyStar/spark-agent.git
cd spark-agent
npm install

# 方式 A：环境变量
export SPARK_API_KEY=sk-xxx

# 方式 B：本地密钥文件（已 gitignore）
# echo 'sk-xxx' > deepseek_apikey

npm run build
node dist/cli.js -p deepseek "用中文总结这个仓库在做什么" -v
```

## CLI

```bash
spark-agent "<任务>" [options]

Options:
  -p, --provider <name>    deepseek|qwen|zhipu|moonshot|siliconflow|openai|custom
  -w, --workspace <path>   工作区根目录
  -m, --model <name>       覆盖默认模型
  --base-url <url>         覆盖默认 Base URL
  --max-turns <n>          最大轮次（默认 20）
  --no-verify              关闭强制验证环
  -v, --verbose            打印工具与验证日志
```

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
  tools/          # list_dir / read_file / write_file / run_command
```

## 安全说明（MVP）

- 文件路径限制在 workspace 内
- Shell `cwd` 固定为 workspace，并拦截少量高危命令模式
- **不是**容器级沙箱；请只在可信本地任务中使用
- 切勿提交 `*_apikey` / `github_token` / `.env`

## 路线图

- [ ] `apply_patch` 局部编辑
- [ ] Provider 级重试 / JSON 修复
- [ ] 小型评测集（国内模型成功率对比）
- [ ] MCP 工具桥
- [ ] 更友好的 TUI

## License

MIT © HazyStar
