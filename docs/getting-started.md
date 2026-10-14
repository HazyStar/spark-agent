# Getting Started

## 环境要求

- Node.js **≥ 18**
- 任一 OpenAI 兼容的国内（或海外）API Key

## 安装

```bash
git clone https://github.com/HazyStar/spark-agent.git
cd spark-agent
npm install
npm run build
```

可选：全局命令（本机开发方便）

```bash
npm link
spark-agent --help
```

## 配置 API Key

任选一种（优先级：环境变量 > 工作区/`cwd` 下的 key 文件 > 仓库根目录 key 文件）：

### 方式 A：本地文件（推荐练手）

在仓库根目录创建（已在 `.gitignore`）：

```bash
echo "sk-你的key" > deepseek_apikey
```

其它 Provider 对应文件名：`qwen_apikey`、`zhipu_apikey`、`moonshot_apikey`、`siliconflow_apikey` 等。

### 方式 B：环境变量

```bash
# macOS / Linux
export SPARK_API_KEY=sk-你的key
# 或
export DEEPSEEK_API_KEY=sk-你的key

# Windows PowerShell
$env:SPARK_API_KEY="sk-你的key"
```

### 方式 C：`.env`

复制 `.env.example` 为 `.env` 后填写（勿提交）。

## 第一条命令

```bash
npm run spark -- "用中文总结这个仓库" -v
```

指定 Provider / 工作区：

```bash
npm run spark -- -p qwen -w ../my-app "修复 npm run typecheck 的报错" -v
```

## Windows / macOS / Linux 注意点

| 平台 | 注意 |
|------|------|
| Windows PowerShell | 用 `$env:NAME=...`；路径可用 `-w S:\path\to\project` |
| Windows CMD | 用 `set SPARK_API_KEY=...` |
| macOS / Linux | 用 `export`；确保 `node` 在 PATH |
| 所有平台 | 任务字符串含空格时请加引号；`npm run spark --` 后面的 `--` 不能省 |

## 常见失败排查

| 现象 | 处理 |
|------|------|
| 提示缺少 API Key | 检查 `deepseek_apikey` 是否在仓库根或 cwd；或设置 `SPARK_API_KEY` |
| `Missing dist/cli.js` | 先 `npm run build` |
| 401 / 鉴权失败 | Key 无效、复制了多余空格，或 Provider 选错 |
| 模型一直改但不验证 | 确认未加 `--no-verify`；工作区里是否有 `verify.mjs` / `check.mjs` / package scripts |
| Shell 命令失败 | Agent 只能在 `-w` 工作区内跑命令；检查路径与权限 |
| 想关掉验证环 | 加 `--no-verify`（评测基线用，日常建议打开） |

## 下一步

- 场景示例：[examples/quickstart.md](../examples/quickstart.md)
- 跑评测：[evals/lite/README.md](../evals/lite/README.md)
- 安全说明：[SECURITY.md](../SECURITY.md)
