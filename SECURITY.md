# Security

## 密钥

- **永远不要**把 API Key、`github_token`、`.env` 提交到 Git  
- 本地使用 `*_apikey` 文件或环境变量（均已在 `.gitignore`）  
- 若 Key 曾出现在聊天记录 / 截图中，请在对应平台轮换  

## 运行时边界

Spark Agent 是 **MVP 级本地 Harness**：

- 文件工具限制在 `-w/--workspace` 目录内，并拒绝 `..` 逃逸  
- Shell 以 workspace 为 `cwd`，并拦截少量高危命令模式  
- **不是** Docker / seccomp / 完整沙箱  

请只在你信任的机器与仓库上使用；不要对不可信提示词开放「任意 shell」。

## 报告漏洞

若发现可导致密钥泄露、路径逃逸或任意代码执行的问题，请通过 GitHub Private Vulnerability Reporting（若已开启）或维护者邮箱联系，并避免公开完整利用细节。
