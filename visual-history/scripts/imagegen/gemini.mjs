// Gemini 图像生成（Nano Banana）— 原始 fetch，支持垫图（inline_data 参考图）
// 参照 ancher-imagecraft/src/providers/gemini.ts 的调用约定
import { env, requireKey } from "./env.mjs";

const BASE = "https://generativelanguage.googleapis.com/v1beta";
const TIMEOUT = 120_000;
const MAX_RETRY = 2;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// refs: [{ base64, mimeType }]（base64 不带 data: 前缀）
export async function geminiGenerate(prompt, { refs = [], aspectRatio, model } = {}) {
  requireKey("gemini");
  const m = model || env.geminiModel;
  const url = `${BASE}/models/${m}:generateContent?key=${env.geminiKey}`;
  const parts = [{ text: prompt }];
  for (const r of refs) parts.push({ inline_data: { mime_type: r.mimeType, data: r.base64 } });
  const body = JSON.stringify({
    contents: [{ parts }],
    generationConfig: {
      responseModalities: ["IMAGE"],
      ...(aspectRatio ? { imageConfig: { aspectRatio } } : {}),
    },
  });

  let lastErr;
  for (let attempt = 0; attempt <= MAX_RETRY; attempt++) {
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        signal: AbortSignal.timeout(TIMEOUT),
      });
      const data = await resp.json();
      if (!resp.ok) {
        const msg = data?.error?.message || resp.status;
        if ([429, 500, 502, 503].includes(resp.status) && attempt < MAX_RETRY) {
          lastErr = new Error(`Gemini ${msg}`); await sleep(3000 * 2 ** attempt); continue;
        }
        throw new Error(`Gemini API ${msg}`);
      }
      for (const c of data.candidates ?? []) {
        for (const p of c.content?.parts ?? []) {
          const inline = p.inlineData || p.inline_data;
          if (inline?.data)
            return { buffer: Buffer.from(inline.data, "base64"), mime: inline.mimeType || inline.mime_type || "image/png" };
        }
        if (c.finishReason === "SAFETY") throw new Error("SAFETY_BLOCK");
      }
      throw new Error("Gemini 未返回图像数据");
    } catch (e) {
      lastErr = e;
      if (e.message === "SAFETY_BLOCK") throw e;
      if (attempt < MAX_RETRY && /timeout|abort|fetch failed|ECONNRESET/i.test(e.message)) {
        await sleep(3000 * 2 ** attempt); continue;
      }
      throw lastErr;
    }
  }
  throw lastErr;
}
