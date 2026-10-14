import fs from "node:fs";
import path from "node:path";

export type ProviderId =
  | "deepseek"
  | "openai"
  | "qwen"
  | "zhipu"
  | "moonshot"
  | "siliconflow"
  | "custom";

export interface ProviderPreset {
  id: ProviderId;
  label: string;
  baseUrl: string;
  model: string;
  keyEnv: string[];
  keyFiles: string[];
}

export const PROVIDERS: Record<ProviderId, ProviderPreset> = {
  deepseek: {
    id: "deepseek",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    keyEnv: ["SPARK_API_KEY", "DEEPSEEK_API_KEY", "OPENAI_API_KEY"],
    keyFiles: ["deepseek_apikey", ".deepseek_apikey"],
  },
  openai: {
    id: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    keyEnv: ["SPARK_API_KEY", "OPENAI_API_KEY"],
    keyFiles: ["openai_apikey", ".openai_apikey"],
  },
  qwen: {
    id: "qwen",
    label: "通义千问 (DashScope)",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: "qwen-coder-plus",
    keyEnv: ["SPARK_API_KEY", "DASHSCOPE_API_KEY", "QWEN_API_KEY"],
    keyFiles: ["qwen_apikey", "dashscope_apikey"],
  },
  zhipu: {
    id: "zhipu",
    label: "智谱 GLM",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    model: "glm-4-flash",
    keyEnv: ["SPARK_API_KEY", "ZHIPU_API_KEY", "BIGMODEL_API_KEY"],
    keyFiles: ["zhipu_apikey", "glm_apikey"],
  },
  moonshot: {
    id: "moonshot",
    label: "月之暗面 Kimi",
    baseUrl: "https://api.moonshot.cn/v1",
    model: "moonshot-v1-auto",
    keyEnv: ["SPARK_API_KEY", "MOONSHOT_API_KEY", "KIMI_API_KEY"],
    keyFiles: ["moonshot_apikey", "kimi_apikey"],
  },
  siliconflow: {
    id: "siliconflow",
    label: "硅基流动",
    baseUrl: "https://api.siliconflow.cn/v1",
    model: "deepseek-ai/DeepSeek-V3",
    keyEnv: ["SPARK_API_KEY", "SILICONFLOW_API_KEY"],
    keyFiles: ["siliconflow_apikey"],
  },
  custom: {
    id: "custom",
    label: "Custom OpenAI-compatible",
    baseUrl: process.env.SPARK_BASE_URL || "http://127.0.0.1:8000/v1",
    model: process.env.SPARK_MODEL || "default",
    keyEnv: ["SPARK_API_KEY", "OPENAI_API_KEY"],
    keyFiles: ["custom_apikey"],
  },
};

export function listProviders(): ProviderPreset[] {
  return Object.values(PROVIDERS);
}

function readKeyFile(filePath: string): string | undefined {
  try {
    if (!fs.existsSync(filePath)) return undefined;
    const value = fs.readFileSync(filePath, "utf8").trim();
    return value || undefined;
  } catch {
    return undefined;
  }
}

function resolveApiKey(preset: ProviderPreset, searchDirs: string[]): string | undefined {
  for (const envName of preset.keyEnv) {
    const value = process.env[envName]?.trim();
    if (value) return value;
  }
  for (const dir of searchDirs) {
    for (const fileName of preset.keyFiles) {
      const value = readKeyFile(path.join(dir, fileName));
      if (value) return value;
    }
  }
  return undefined;
}

export interface ResolvedProvider {
  provider: ProviderId;
  label: string;
  apiKey: string;
  baseUrl: string;
  model: string;
}

export function resolveProvider(options: {
  provider?: string;
  baseUrl?: string;
  model?: string;
  apiKey?: string;
  searchDirs?: string[];
}): ResolvedProvider {
  const raw = (options.provider || process.env.SPARK_PROVIDER || "deepseek").toLowerCase();
  const providerId = (raw in PROVIDERS ? raw : "custom") as ProviderId;
  const preset = PROVIDERS[providerId];
  const searchDirs = options.searchDirs?.length
    ? options.searchDirs
    : [process.cwd()];

  const apiKey = options.apiKey?.trim() || resolveApiKey(preset, searchDirs);
  if (!apiKey) {
    const envs = preset.keyEnv.join(" / ");
    const files = preset.keyFiles.join(" / ");
    throw new Error(
      `缺少 API Key（provider=${preset.id}）。\n` +
        `请设置环境变量 ${envs}，\n` +
        `或在仓库根目录 / 当前目录放置密钥文件：${files}`,
    );
  }

  return {
    provider: preset.id,
    label: preset.label,
    apiKey,
    baseUrl: options.baseUrl || process.env.SPARK_BASE_URL || preset.baseUrl,
    model: options.model || process.env.SPARK_MODEL || preset.model,
  };
}
