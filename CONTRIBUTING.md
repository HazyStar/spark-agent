# Contributing

感谢关注 Spark Agent。我们欢迎：修 bug、补文档、加 Provider、加 Lite 评测题。

## 开发流程

```bash
npm install
npm run typecheck
npm run build
npm run spark -- "你的测试任务" -v
```

## 添加 Provider

1. 编辑 [`src/providers.ts`](./src/providers.ts)，在 `PROVIDERS` 增加预设：`baseUrl`、`model`、`keyEnv`、`keyFiles`  
2. 在 README 的 Provider 表补一行  
3. 用真实 Key 跑通一条 `npm run spark -- -p <id> "..."`  

保持 **OpenAI-compatible** `/chat/completions` + tools 协议。

## 添加 Lite 评测题

目录约定：

```text
evals/lite/tasks/<id>/
  task.md          # 给 Agent 的自然语言任务
  meta.json        # id / title / difficulty
  workspace/       # Agent 可见的起始文件
  verify.mjs       # 退出码 0 = 通过
```

要求：

- `verify.mjs` 必须可在 `workspace` 复制后独立运行（Node 即可，尽量不依赖外网）  
- 不要在题目里泄露「唯一正确答案」到 task 文本之外的捷径（可给行为描述）  
- 跑：`node scripts/run-eval.mjs --mode compare --only <id>`

## 提交前检查

- [ ] `npm run typecheck` 通过  
- [ ] 未提交 `*_apikey` / `.env` / `github_token`  
- [ ] README / docs 若行为变更已同步  

## 行为准则

请保持友好、具体的 Issue / PR 描述。安全相关问题见 [SECURITY.md](./SECURITY.md)。
