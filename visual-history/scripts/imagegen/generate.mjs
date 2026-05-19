#!/usr/bin/env node
// 图像生成编排 / CLI
//   路由：有参考图(垫图)或 --engine openai → gpt-image（复杂）；否则 → Gemini（简单）
//
// 用法:
//   node scripts/imagegen/generate.mjs --id huangchao              # 用 art-manifest 的 prompt，简单→Gemini
//   node scripts/imagegen/generate.mjs --id _basemap --ref assets/ref/wiki.png   # 垫图→gpt-image
//   node scripts/imagegen/generate.mjs --id zhuwen --prompt "..." --engine gemini
//   node scripts/imagegen/generate.mjs --all                       # 补全 manifest 中所有缺图
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { geminiGenerate } from "./gemini.mjs";
import { openaiGenerate, openaiEdit } from "./openai.mjs";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const MANIFEST = ROOT + "data/art-manifest.json";
const ART_DIR = ROOT + "assets/art/";

function args() {
  const a = process.argv.slice(2), o = { ref: [] };
  for (let i = 0; i < a.length; i++) {
    const k = a[i];
    if (k === "--all") o.all = true;
    else if (k === "--id") o.id = a[++i];
    else if (k === "--prompt") o.prompt = a[++i];
    else if (k === "--ref") o.ref = a[++i].split(",").map((s) => s.trim()).filter(Boolean);
    else if (k === "--engine") o.engine = a[++i];
    else if (k === "--ar") o.ar = a[++i];
    else if (k === "--quality") o.quality = a[++i];
    else if (k === "--out") o.out = a[++i];
  }
  return o;
}

const mimeOf = (p) => p.endsWith(".jpg") || p.endsWith(".jpeg") ? "image/jpeg"
  : p.endsWith(".webp") ? "image/webp" : "image/png";
const extOf = (mime) => mime.includes("jpeg") ? "jpg" : mime.includes("webp") ? "webp" : "png";

async function loadRefs(paths) {
  const out = [];
  for (const p of paths) {
    const abs = p.startsWith("/") ? p : ROOT + p;
    const buf = await readFile(abs);
    const mime = mimeOf(p);
    out.push({ buffer: buf, base64: buf.toString("base64"), mime, name: abs.split("/").pop() });
  }
  return out;
}

async function genOne(id, manifest, opt) {
  const entry = manifest.art?.[id] || {};
  const prompt = opt.prompt || entry.prompt;
  if (!prompt) throw new Error(`id「${id}」无 prompt（manifest 无此条目，且未传 --prompt）`);

  const refs = await loadRefs(opt.ref);
  const type = entry.type || "scene";
  // 路由
  let engine = opt.engine;
  if (!engine || engine === "auto") engine = refs.length ? "openai" : "gemini";
  // 画幅
  const ar = opt.ar || (type === "portrait" ? "2:3" : type === "hero" ? "16:9"
    : type === "texture" ? "1:1" : "3:2");

  console.error(`· [${id}] engine=${engine} type=${type} ar=${ar} refs=${refs.length}`);
  let res;
  if (engine === "openai") {
    res = refs.length
      ? await openaiEdit(prompt, refs, { aspectRatio: ar, quality: opt.quality || "high" })
      : await openaiGenerate(prompt, { aspectRatio: ar, quality: opt.quality || "high" });
  } else {
    res = await geminiGenerate(prompt, {
      refs: refs.map((r) => ({ base64: r.base64, mimeType: r.mime })),
      aspectRatio: ar === "2:3" ? "3:4" : ar,
    });
  }

  await mkdir(ART_DIR, { recursive: true });
  const ext = extOf(res.mime);
  const file = `${id}.${ext}`;
  await writeFile(opt.out ? (opt.out.startsWith("/") ? opt.out : ROOT + opt.out) : ART_DIR + file, res.buffer);
  // 回写 manifest src（相对站点根）
  if (manifest.art?.[id]) {
    manifest.art[id].src = `assets/art/${file}`;
    await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
  }
  console.error(`  ✓ ${(res.buffer.length / 1024) | 0}KB → assets/art/${file}`);
  return file;
}

(async function main() {
  const opt = args();
  const manifest = existsSync(MANIFEST) ? JSON.parse(await readFile(MANIFEST, "utf8")) : { art: {} };

  if (opt.all) {
    const ids = Object.keys(manifest.art || {}).filter((id) => !manifest.art[id].src);
    console.error(`补全 ${ids.length} 张缺图：${ids.join(", ")}`);
    for (const id of ids) {
      try { await genOne(id, manifest, { ...opt, ref: [] }); }
      catch (e) { console.error(`  ✗ ${id}: ${e.message}`); }
    }
    return;
  }
  if (!opt.id) { console.error("需要 --id <id> 或 --all"); process.exit(1); }
  await genOne(opt.id, manifest, opt);
})().catch((e) => { console.error("失败:", e.message); process.exit(1); });
