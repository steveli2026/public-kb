// 从 Wikimedia Commons 拉取垫图，写入 manifest 的 ref 字段。
// 容错：解析/下载失败的 slot 跳过（ref 留空，UI 仍可无垫图生成或手动放图到 assets/ref/）。
// 用法：node scripts/fetch-refs.mjs
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const MANIFEST = ROOT + "data/art-manifest.json";
const REF_DIR = ROOT + "assets/ref/";

// slot → 候选 Commons 文件名（按序尝试，取第一个解析成功的）
const CURATED = {
  "map": ["File:China_edcp_relief_location_map.jpg"],
  "era:qin": ["File:Qin empire 210 BCE.svg", "File:QinEmpire.png"],
  "era:western-han": ["File:Han Dynasty.png", "File:Han dynasty 2nd century BC.png"],
  "era:tang": ["File:Tang dynasty circa 700 CE.png", "File:Tang Protectorates.png"],
  "era:sanguo": ["File:Three Kingdoms.png", "File:Three Kingdoms 262.png"],
  "era:zhanguo": ["File:EN-WarringStatesAll260BCE.jpg", "File:Warring States.png"],
  "era:northern-song": ["File:Song Dynasty 1111 AD.png", "File:Northern Song.png"],
  "era:southern-song": ["File:Southern Song.png", "File:Song dynasty 1142.png"],
  "era:yuan": ["File:Yuan Dynasty 1294.png", "File:Mongol Empire map.gif"],
  "era:ming": ["File:Ming Empire cca 1580 (en).svg", "File:Ming dynasty.png"],
  "era:qing": ["File:Qing Dynasty 1820.png", "File:Qing Empire 1820.png"],
};

const api = "https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url&iiurlwidth=1600&format=json&titles=";

async function resolve(title) {
  try {
    const r = await fetch(api + encodeURIComponent(title), { signal: AbortSignal.timeout(20000) });
    const d = await r.json();
    const pg = Object.values(d.query.pages)[0];
    const ii = pg.imageinfo?.[0];
    return ii?.thumburl || ii?.url || null;
  } catch { return null; }
}

const m = JSON.parse(await readFile(MANIFEST, "utf8"));
await mkdir(REF_DIR, { recursive: true });
let ok = 0;

for (const [slot, candidates] of Object.entries(CURATED)) {
  if (!m.slots[slot]) continue;
  if (m.slots[slot].ref) { ok++; continue; } // 已有则跳过
  let saved = null;
  for (const c of candidates) {
    const url = await resolve(c);
    if (!url) continue;
    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(40000) });
      if (!resp.ok) continue;
      const buf = Buffer.from(await resp.arrayBuffer());
      if (buf.length < 20000) continue;
      const safe = slot.replace(/[:]/g, "__");
      const file = `assets/ref/${safe}.jpg`;
      await writeFile(ROOT + file, buf);
      m.slots[slot].ref = file;
      saved = `${c} → ${file} (${(buf.length / 1024) | 0}KB)`;
      ok++;
      break;
    } catch { /* try next */ }
  }
  console.log(`${slot}: ${saved || "未解析（留空）"}`);
}

await writeFile(MANIFEST, JSON.stringify(m, null, 2) + "\n");
console.log(`\n完成：${ok}/${Object.keys(CURATED).length} 个 slot 已配垫图`);
