# Quickstart 示例（可复制）

以下命令均在仓库根目录、已 `npm install && npm run build`、已配置 DeepSeek key 的前提下使用。

## 1. 读仓库

```bash
npm run spark -- "用三句话中文说明这个项目是什么、给谁用、核心目录有哪些" -v
```

## 2. 小改动

```bash
npm run spark -- "在 examples/ 下创建 hello-spark.txt，内容为一行：hello from spark-agent" -v
```

## 3. 对外面的项目动手

```bash
npm run spark -- -w ../your-project "运行已有的测试或 typecheck；若失败则修复到通过" -v
```

## 4. 换国内 Provider

```bash
# 通义
npm run spark -- -p qwen "总结 package.json 的 scripts" -v

# 智谱
npm run spark -- -p zhipu "列出 src 下 TypeScript 文件" -v

# 硅基流动
npm run spark -- -p siliconflow "解释 src/verify.ts 在做什么" -v
```

## 5. 本地兼容网关

```bash
npm run spark -- -p custom --base-url http://127.0.0.1:8000/v1 -m my-model "列出当前目录" -v
```
