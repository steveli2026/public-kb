// OpenAI 图像生成（gpt-image / "Image-2"）— 原始 fetch
//  · 文生图：POST /v1/images/generations (JSON)
//  · 垫图/参考图：POST /v1/images/edits (multipart) —— ancher-imagecraft 未实现，此处补齐
import { env, requireKey } from "./env.mjs";

const BASE = "https://api.openai.com/v1";
const TIMEOUT = 280_000;

// gpt-image-1 支持的尺寸
function pickSize(ar) {
  if (ar === "1:1") return "1024x1024";
  if (ar === "3:2" || ar === "4:3" || ar === "16:9" || ar === "3:4landscape") return "1536x1024";
  if (ar === "2:3" || ar === "3:4" || ar === "9:16") return "1024x1536";
  return "auto";
}

function parse(data) {
  const e = data?.data?.[0];
  if (e?.b64_json) return { buffer: Buffer.from(e.b64_json, "base64"), mime: "image/png" };
  if (e?.url) throw new Error("OpenAI 返回了 URL 而非 b64_json");
  throw new Error("OpenAI 未返回图像数据：" + JSON.stringify(data?.error || data).slice(0, 300));
}

// 文生图
export async function openaiGenerate(prompt, { aspectRatio = "1:1", quality = "high", model } = {}) {
  requireKey("openai");
  const resp = await fetch(`${BASE}/images/generations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.openaiKey}` },
    body: JSON.stringify({
      model: model || env.openaiModel,
      prompt, n: 1, size: pickSize(aspectRatio), quality,
    }),
    signal: AbortSignal.timeout(TIMEOUT),
  });
  return parse(await resp.json());
}

// 垫图（图生图 / 参考图）。refs: [{ buffer, mime, name }]
export async function openaiEdit(prompt, refs, { aspectRatio = "3:2", quality = "high", model } = {}) {
  requireKey("openai");
  if (!refs?.length) throw new Error("openaiEdit 需要至少一张参考图");
  const fd = new FormData();
  fd.append("model", model || env.openaiModel);
  fd.append("prompt", prompt);
  fd.append("n", "1");
  fd.append("size", pickSize(aspectRatio));
  fd.append("quality", quality);
  for (const r of refs) {
    const ext = (r.mime || "image/png").split("/")[1] || "png";
    fd.append("image[]", new Blob([r.buffer], { type: r.mime || "image/png" }), r.name || `ref.${ext}`);
  }
  const resp = await fetch(`${BASE}/images/edits`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.openaiKey}` },
    body: fd,
    signal: AbortSignal.timeout(TIMEOUT),
  });
  return parse(await resp.json());
}
