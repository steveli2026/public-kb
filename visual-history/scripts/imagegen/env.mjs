// 极简 .env 读取（无依赖）。绝不打印 value。
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ENV_PATH = fileURLToPath(new URL("../../.env", import.meta.url));

function parseEnv(txt) {
  const out = {};
  for (let line of txt.split(/\r?\n/)) {
    line = line.trim();
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1);
    out[k] = v;
  }
  return out;
}

const fileEnv = existsSync(ENV_PATH) ? parseEnv(readFileSync(ENV_PATH, "utf8")) : {};
const get = (k) => process.env[k] ?? fileEnv[k] ?? "";

export const env = {
  openaiKey: get("openai_api_key") || get("OPENAI_API_KEY"),
  geminiKey: get("gemini_api_key") || get("GEMINI_API_KEY") || get("IMAGE_API_KEY"),
  // 模型可被 .env 覆盖；默认取当前真实可用的模型名
  openaiModel: get("openai_model") || "gpt-image-1",
  geminiModel: get("gemini_image_model") || "gemini-2.5-flash-image",
};

export function requireKey(which) {
  if (which === "openai" && !env.openaiKey) throw new Error("缺少 openai_api_key（.env）");
  if (which === "gemini" && !env.geminiKey) throw new Error("缺少 gemini_api_key（.env）");
}
