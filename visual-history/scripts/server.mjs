// 本地开发服务：静态(无缓存) + 图位生成 API。密钥仅在服务端读取。
//   GET  /api/health
//   GET  /api/manifest
//   POST /api/prompt    {id, prompt}
//   POST /api/select    {id, file}
//   POST /api/generate  {id, prompt?, engine, useRef}
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname } from "node:path";
import { fileURLToPath } from "node:url";
import { geminiGenerate } from "./imagegen/gemini.mjs";
import { openaiGenerate, openaiEdit } from "./imagegen/openai.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const MANIFEST = ROOT + "data/art-manifest.json";
const PORT = process.env.PORT || 5173;

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".png": "image/png",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".svg": "image/svg+xml", ".ico": "image/x-icon",
};
const ASPECT = { portrait: "2:3", scene: "3:2", map: "3:2", hero: "16:9" };

const readManifest = async () => JSON.parse(await readFile(MANIFEST, "utf8"));
const saveManifest = (m) => writeFile(MANIFEST, JSON.stringify(m, null, 2) + "\n");
const body = (req) => new Promise((res, rej) => {
  let b = ""; req.on("data", (d) => (b += d)); req.on("end", () => { try { res(b ? JSON.parse(b) : {}); } catch (e) { rej(e); } });
});
const json = (res, code, obj) => { res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" }); res.end(JSON.stringify(obj)); };

async function loadRef(refPath) {
  const abs = ROOT + refPath;
  if (!existsSync(abs)) return null;
  const buf = await readFile(abs);
  const mime = refPath.endsWith(".png") ? "image/png" : refPath.endsWith(".webp") ? "image/webp" : "image/jpeg";
  return { buffer: buf, base64: buf.toString("base64"), mime, name: refPath.split("/").pop() };
}

async function handleGenerate(reqBody) {
  const { id, engine = "gemini", useRef = false } = reqBody;
  const m = await readManifest();
  const slot = m.slots[id];
  if (!slot) throw new Error(`未知 slot: ${id}`);
  const subject = (reqBody.prompt ?? slot.prompt ?? "").trim();
  const style = m.styleByType?.[slot.type] || "";
  const finalPrompt = subject + style;
  const ar = ASPECT[slot.type] || "3:2";
  const ref = useRef && slot.ref ? await loadRef(slot.ref) : null;

  let result;
  if (engine === "openai") {
    result = ref
      ? await openaiEdit(finalPrompt, [ref], { aspectRatio: ar })
      : await openaiGenerate(finalPrompt, { aspectRatio: ar });
  } else {
    result = await geminiGenerate(finalPrompt, {
      refs: ref ? [{ base64: ref.base64, mimeType: ref.mime }] : [],
      aspectRatio: ar === "2:3" ? "3:4" : ar,
    });
  }

  const safe = id.replace(/[:]/g, "__");
  const dir = `assets/art/${safe}`;
  await mkdir(ROOT + dir, { recursive: true });
  const ext = result.mime.includes("jpeg") ? "jpg" : result.mime.includes("webp") ? "webp" : "png";
  const n = (slot.versions?.length || 0) + 1;
  const file = `${dir}/v${n}-${Date.now()}.${ext}`;
  await writeFile(ROOT + file, result.buffer);

  slot.versions = slot.versions || [];
  slot.versions.push({ file, engine, usedRef: !!ref, ts: Date.now() });
  slot.selected = file;
  await saveManifest(m);
  return { ok: true, file, versions: slot.versions, selected: slot.selected, kb: (result.buffer.length / 1024) | 0 };
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = decodeURIComponent(url.pathname);

  try {
    if (path === "/api/health") return json(res, 200, { ok: true });
    if (path === "/api/manifest") return json(res, 200, await readManifest());

    if (req.method === "POST" && path === "/api/prompt") {
      const { id, prompt } = await body(req);
      const m = await readManifest();
      if (!m.slots[id]) return json(res, 404, { error: "no slot" });
      m.slots[id].prompt = prompt; m.slots[id].userEdited = true;
      await saveManifest(m);
      return json(res, 200, { ok: true });
    }
    if (req.method === "POST" && path === "/api/select") {
      const { id, file } = await body(req);
      const m = await readManifest();
      if (!m.slots[id]) return json(res, 404, { error: "no slot" });
      m.slots[id].selected = file;
      await saveManifest(m);
      return json(res, 200, { ok: true, selected: file });
    }
    if (req.method === "POST" && path === "/api/generate") {
      const out = await handleGenerate(await body(req));
      return json(res, 200, out);
    }

    // 静态
    let rel = path === "/" ? "/index.html" : path;
    const abs = ROOT + rel.replace(/^\/+/, "");
    if (!existsSync(abs)) { res.writeHead(404); return res.end("404"); }
    const data = await readFile(abs);
    res.writeHead(200, {
      "Content-Type": TYPES[extname(abs)] || "application/octet-stream",
      "Cache-Control": "no-store, max-age=0",
    });
    res.end(data);
  } catch (e) {
    console.error("✗", path, e.message);
    json(res, 500, { error: e.message });
  }
}).listen(PORT, () => console.log(`▶ http://localhost:${PORT}  (静态 + 图位生成 API · 编辑模式)`));
