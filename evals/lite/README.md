# Spark Lite Eval（证明 Harness 有效）

固定 **同一国内模型**，只改变 Harness 设置，比较任务通过率。

## 对比什么

| Mode | 含义 |
|------|------|
| `chat` | 无工具：一次 JSON 改文件（弱基线） |
| `no-verify` | 有工具，但关闭强制验证环（`--no-verify`） |
| `verify` | 有工具 + 强制验证环（产品默认） |

判定标准：每题目录下的 `verify.mjs` 退出码为 0（不是模型自述“完成了”）。

## 运行

```bash
# 需要可用的 DeepSeek（或其它 provider）密钥：deepseek_apikey / SPARK_API_KEY
npm run eval:lite

# 只跑验证环开
npm run eval:lite:verify

# 子集
node scripts/run-eval.mjs --mode both --only 01-add-hello,02-fix-sum -v
```

结果写入 `evals/lite/results/latest.md`。

## 任务列表

| ID | 技能点 |
|----|--------|
| 01-add-hello | 创建文件 |
| 02-fix-sum | 修逻辑 bug |
| 03-update-config | 改 JSON 配置 |
| 04-fix-typo | 修导出名称 |
| 05-add-multiply | 补实现 |
| 06-fix-import | 修导入路径 |
| 07-bump-version | 改 version 字段 |
| 08-create-ping | 新建脚本文件 |
| 09-fix-even | 修条件逻辑 |
| 10-append-readme | 追加文档行 |
| 11-two-bugs | 双 bug 一次修干净 |
| 12-strict-report | 严格 JSON schema |
| 13-palindrome | 边界用例 |
| 14-rename-util | 跨文件重命名 |
| 15-range-sum | off-by-one + 异常 |

## 当前实测（DeepSeek-chat）

在 easy(01–10) 与 hard 子集上，`chat` / `no-verify` / `verify` **均接近/达到 100%**。  
结论：评测管线可用；要对齐「Harness 增益」需换更弱模型或上 SWE-bench 子集。详见 `results/latest.md`。
