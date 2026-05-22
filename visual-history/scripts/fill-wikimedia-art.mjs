// 用 Wikimedia Commons / 中文维基百科公开图片补齐缺失图位。
// 用法：
//   node scripts/fill-wikimedia-art.mjs           # 尝试补齐所有 selected 为空的图位
//   node scripts/fill-wikimedia-art.mjs --limit 50
//   node scripts/fill-wikimedia-art.mjs --kind person
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { encodeWebp, isRasterMime } from "./imagegen/webp.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const DATA = ROOT + "data/";
const MANIFEST = DATA + "art-manifest.json";
const OUT_DIR = ROOT + "assets/art/wiki/";
const SITE_OUT_DIR = "assets/art/wiki/";
const STATE_DIR = ROOT + ".omx/state/";
const RATE_STATE = STATE_DIR + "wikimedia-art-fill.json";
const UA = "visual-history-image-fill/0.1 (Wikimedia Commons attribution helper)";
const THUMB_WIDTH = "640";

const args = new Map();
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (!a.startsWith("--")) continue;
  const [k, inline] = a.slice(2).split("=");
  if (inline != null) {
    args.set(k, inline);
  } else if (process.argv[i + 1] && !process.argv[i + 1].startsWith("--")) {
    args.set(k, process.argv[i + 1]);
    i++;
  } else {
    args.set(k, true);
  }
}
const limit = Number(args.get("limit") || 0);
const kindFilter = args.get("kind") || "";
const idFilter = new Set(String(args.get("ids") || "").split(",").map((x) => x.trim()).filter(Boolean));
const apiIntervalMs = Number(args.get("api-interval-ms") || 1200);
const downloadIntervalMs = Number(args.get("download-interval-ms") || 5000);
const rateRetries = Number(args.get("rate-retries") || 8);
const maxSleepMs = Number(args.get("max-sleep-ms") || 30 * 60 * 1000);
const stopOnRateLimit = args.has("stop-on-rate-limit");
const startAfter = args.get("start-after") || "";
const retryMisses = args.has("retry-misses");

const rd = async (p) => JSON.parse(await readFile(DATA + p, "utf8"));
const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
const eras = (await rd("eras.json")).eras;
const people = (await rd("people.json")).people;
const events = (await rd("events.json")).events;
const regimes = (await rd("regimes.json")).regimes;

const meta = new Map([
  ...eras.map((x) => [`era:${x.id}`, { kind: "era", title: x.name, extra: x.years || "" }]),
  ...people.map((x) => [`person:${x.id}`, { kind: "person", title: x.name, extra: [x.role, x.life].filter(Boolean).join(" ") }]),
  ...events.map((x) => [`event:${x.id}`, { kind: "event", title: x.title, extra: "" }]),
  ...regimes.map((x) => [`regime:${x.id}`, { kind: "regime", title: x.name, extra: "" }]),
]);

for (const [id, slot] of Object.entries(manifest.slots || {})) {
  if (meta.has(id)) continue;
  const kind = id.split(":")[0];
  const title = (slot.prompt || id).split(/[。；！？\n]/).filter(Boolean)[0] || id;
  meta.set(id, { kind, title, extra: "" });
}

const CURATED_FILES = {
  "person:qinshihuang": "File:Qinshihuangdi3.jpg",
  "person:caocao": "File:Cao Cao scth.jpg",
  "person:liubei": "File:Liu Bei Portrait 2.jpg",
  "person:sunquan": "File:Sun Quan Tang.jpg",
  "person:zhugeliang": "File:明人绘 《诸葛亮像》（南薰殿本）.jpg",
  "person:yangjian": "File:隋文帝 杨坚.jpg",
  "person:litaizong": "File:TangTaizongP (cropped).jpg",
  "person:wuzetian": "File:則天大聖皇帝像圖.jpg",
  "person:shang-fuhao": "File:Fu Hao.jpg",
  "person:dj-xiedaoyun": "File:Xie Daoyun.jpg",
  "person:sui-xushiji-pre": "File:李勣.png",
  "person:tang-lishiji": "File:李勣.png",
  "person:tang-guoziyi": "File:Portraits of Famous Men - Guo Ziyi.jpg",
  "person:tang-yangaoqing": "File:唐名臣像-12-顔杲卿.jpg",
  "person:tang-dufu": "File:Dufu.jpg",
  "person:bs-yangye": "File:繼業夜觀天象（楊家府世代忠勇演義志傳）.jpg",
  "person:bs-ouyangxiu": "File:OuyangXiuPortrait.jpg",
  "person:ss-zhangjun": "File:張俊.jpg",
  "person:ss-xinqiji": "File:The statue of Xin Qiji.JPG",
  "person:ss-zhangshijie": "File:張世傑-吳郡名賢圖傳贊.jpg",
  "person:ss-songgongdi": "File:Song Gongdi2.jpg",
  "person:yuan-guoshoujing": "File:Xingtai Guo Shoujing's Statue.jpg",
  "person:qing-liangqichao": "File:Liang-Qichao.jpg",
  "event:muye": "File:Battle of Muye.jpg",
  "event:changping": "File:Battle of changping,长平之战.svg",
  "event:guandu": "File:Guanduzhizhan eng.png",
  "event:chibi": "File:Battle of Red Cliffs 208 extended map-en.svg",
  "event:feishui": "File:Battle of Fei River.png",
  "event:qin-julu": "File:Juluzhizhan.png",
  "event:gaixia": "File:Gaixia Site in Guzhen (9974483164).jpg",
  "event:shang-jizi-yangkuang": "File:FengShen.jpg",
  "event:wd2-yelvdeguang-rumian": "File:KhitanAD1000.png",
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const defaultThrottle = () => ({
  api: { lastAt: 0, blockedUntil: 0, strikes: 0 },
  download: { lastAt: 0, blockedUntil: 0, strikes: 0 },
  misses: {},
});
let throttle = defaultThrottle();
const clean = (s) => (s || "")
  .replace(/<[^>]+>/g, "")
  .replace(/&nbsp;/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/\s+/g, " ")
  .trim();
const safeName = (id) => id.replace(/[^a-z0-9_-]+/gi, "__");
const hasSelected = (slot) => !!slot.selected && existsSync(ROOT + slot.selected);
const baseTitle = (title) => title
  .replace(/[（(].*?[）)]/g, "")
  .replace(/\s*·\s*/g, " ")
  .trim();

async function loadThrottleState() {
  try {
    throttle = { ...defaultThrottle(), ...JSON.parse(await readFile(RATE_STATE, "utf8")) };
    throttle.api = { ...defaultThrottle().api, ...(throttle.api || {}) };
    throttle.download = { ...defaultThrottle().download, ...(throttle.download || {}) };
    throttle.misses = throttle.misses || {};
  } catch {
    throttle = defaultThrottle();
  }
}

async function saveThrottleState() {
  await mkdir(STATE_DIR, { recursive: true });
  await writeFile(RATE_STATE, JSON.stringify({ ...throttle, updatedAt: Date.now() }, null, 2) + "\n");
}

function fmtMs(ms) {
  const sec = Math.ceil(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const rest = sec % 60;
  return rest ? `${min}m${rest}s` : `${min}m`;
}

async function throttleWait(scope, minIntervalMs) {
  const bucket = throttle[scope];
  const now = Date.now();
  const waits = [
    Math.max(0, bucket.blockedUntil - now),
    Math.max(0, minIntervalMs - (now - bucket.lastAt)),
  ];
  const wait = Math.max(...waits);
  if (wait) {
    console.log(`WAIT ${scope}: ${fmtMs(wait)}`);
    await sleep(wait);
  }
  bucket.lastAt = Date.now();
  await saveThrottleState();
}

function rateDelayMs(resp, body, scope, attempt) {
  const retryAfter = Number(resp.headers.get("retry-after") || 0);
  if (retryAfter > 0) return retryAfter * 1000;
  const policyLimit = /robot policy|less disruptive|too many requests/i.test(body || "");
  if (!policyLimit) return 5000 * (attempt + 1);
  const strikes = (throttle[scope].strikes || 0) + 1;
  return Math.min(maxSleepMs, 60_000 * (2 ** Math.min(strikes - 1, 5)));
}

async function handleRateLimit(resp, body, scope, attempt) {
  if (stopOnRateLimit) throw new Error("WIKIMEDIA_RATE_LIMIT");
  const delay = rateDelayMs(resp, body, scope, attempt);
  throttle[scope].strikes = (throttle[scope].strikes || 0) + 1;
  throttle[scope].blockedUntil = Date.now() + delay;
  await saveThrottleState();
  console.log(`WAIT ${scope}: 429 rate limit, sleeping ${fmtMs(delay)} before retry`);
  await sleep(delay);
}

async function markRateSuccess(scope) {
  throttle[scope].strikes = 0;
  throttle[scope].blockedUntil = 0;
  throttle[scope].lastAt = Date.now();
  await saveThrottleState();
}

async function api(url, params) {
  const u = new URL(url);
  for (const [k, v] of Object.entries({ origin: "*", format: "json", ...params })) {
    if (v != null && v !== "") u.searchParams.set(k, v);
  }
  for (let attempt = 0; attempt < rateRetries; attempt++) {
    await throttleWait("api", apiIntervalMs);
    const resp = await fetch(u, {
      headers: {
        "User-Agent": UA,
        "Api-User-Agent": UA,
      },
      signal: AbortSignal.timeout(20000),
    });
    if (resp.status === 429) {
      const body = await resp.text().catch(() => "");
      await handleRateLimit(resp, body, "api", attempt);
      continue;
    }
    if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
    await markRateSuccess("api");
    return resp.json();
  }
  throw new Error("WIKIMEDIA_RATE_LIMIT");
}

async function zhPages(params) {
  const data = await api("https://zh.wikipedia.org/w/api.php", params);
  return Object.values(data.query?.pages || {}).filter((p) => !p.missing);
}

async function zhPageImageBatch(titles) {
  const result = new Map();
  if (!titles.length) return result;
  const data = await api("https://zh.wikipedia.org/w/api.php", {
    action: "query",
    redirects: "1",
    titles: titles.join("|"),
    prop: "pageimages",
    piprop: "name",
  });
  const normalized = new Map((data.query?.normalized || []).map((x) => [x.from, x.to]));
  const redirects = new Map((data.query?.redirects || []).map((x) => [x.from, x.to]));
  const pagesByTitle = new Map(Object.values(data.query?.pages || {}).map((p) => [p.title, p]));
  for (const title of titles) {
    const n = normalized.get(title) || title;
    const r = redirects.get(n) || n;
    const page = pagesByTitle.get(r);
    if (page?.pageimage) result.set(title, page.pageimage);
  }
  return result;
}

async function commonsFileBatch(titles) {
  const result = new Map();
  if (!titles.length) return result;
  const data = await api("https://commons.wikimedia.org/w/api.php", {
    action: "query",
    titles: titles.join("|"),
    prop: "imageinfo",
    iiprop: "url|mime|size|extmetadata",
    iiurlwidth: THUMB_WIDTH,
  });
  const normalized = new Map((data.query?.normalized || []).map((x) => [x.from, x.to]));
  const pagesByTitle = new Map(Object.values(data.query?.pages || {}).map((p) => [p.title, p]));
  for (const title of titles) {
    const n = normalized.get(title) || title;
    const page = pagesByTitle.get(n);
    const ii = page?.imageinfo?.[0];
    if (!ii || !ii.mime?.startsWith("image/")) continue;
    if (ii.mime !== "image/svg+xml" && (ii.width < 260 || ii.height < 260)) continue;
    result.set(title, normalizeImage(page.title, ii));
  }
  return result;
}

async function commonsImage(title) {
  const pages = await zhPages({
    action: "query",
    redirects: "1",
    titles: title,
    prop: "pageimages",
    piprop: "name",
    pilimit: "1",
  });
  const file = pages[0]?.pageimage;
  if (!file) return null;
  return commonsFile(`File:${file}`);
}

async function zhSearchImages(query) {
  const pages = await zhPages({
    action: "query",
    generator: "search",
    gsrsearch: query,
    gsrlimit: "5",
    prop: "pageimages",
    piprop: "name",
  });
  const out = [];
  for (const p of pages) {
    if (!p.pageimage) continue;
    const hit = await commonsFile(`File:${p.pageimage}`);
    if (hit) out.push(hit);
  }
  return out;
}

async function commonsFile(title) {
  try {
    const data = await api("https://commons.wikimedia.org/w/api.php", {
      action: "query",
      titles: title,
      prop: "imageinfo",
      iiprop: "url|mime|size|extmetadata",
      iiurlwidth: THUMB_WIDTH,
    });
    const page = Object.values(data.query?.pages || {})[0];
    const ii = page?.imageinfo?.[0];
    if (!ii || !ii.mime?.startsWith("image/")) return null;
    if (ii.mime !== "image/svg+xml" && (ii.width < 260 || ii.height < 260)) return null;
    return normalizeImage(page.title, ii);
  } catch (err) {
    if (err.message === "WIKIMEDIA_RATE_LIMIT") throw err;
    return null;
  }
}

async function commonsSearchImages(query) {
  const data = await api("https://commons.wikimedia.org/w/api.php", {
    action: "query",
    generator: "search",
    gsrnamespace: "6",
    gsrsearch: `${query} filetype:bitmap|drawing`,
    gsrlimit: "8",
    prop: "imageinfo",
    iiprop: "url|mime|size|extmetadata",
    iiurlwidth: THUMB_WIDTH,
  });
  return Object.values(data.query?.pages || {})
    .map((p) => p.imageinfo?.[0] ? normalizeImage(p.title, p.imageinfo[0]) : null)
    .filter(Boolean)
    .filter((x) => x.mime === "image/svg+xml" || (x.width >= 260 && x.height >= 260));
}

function normalizeImage(title, ii) {
  const md = ii.extmetadata || {};
  return {
    title,
    url: ii.thumburl || ii.url,
    originalUrl: ii.url,
    pageUrl: ii.descriptionurl,
    mime: ii.thumbmime || ii.mime,
    width: ii.thumbwidth || ii.width,
    height: ii.thumbheight || ii.height,
    artist: clean(md.Artist?.value || md.Credit?.value || ""),
    license: clean(md.LicenseShortName?.value || md.UsageTerms?.value || ""),
    licenseUrl: clean(md.LicenseUrl?.value || ""),
  };
}

function score(hit, title, kind) {
  const t = title.toLowerCase();
  const h = hit.title.toLowerCase();
  let n = 0;
  if (h.includes(t)) n += 8;
  if (h.includes(baseTitle(title).toLowerCase())) n += 5;
  if (kind === "person" && /portrait|painting|statue|人物|像|画像|肖像|statue/.test(h)) n += 3;
  if (kind !== "person" && /map|地图|dynasty|empire|battle|war|疆域|戰|战/.test(h)) n += 2;
  if (/logo|seal|insignia|flag|symbol|emblem|icon|qr|route|railway/.test(h)) n -= 4;
  return n;
}

function variants({ title, extra, kind }) {
  const b = baseTitle(title);
  const xs = [
    title,
    b,
    `${title} ${extra}`.trim(),
    `${b} ${extra}`.trim(),
  ];
  if (kind === "era") xs.push(`${b} 中国历史`, `${b} 朝代 地图`);
  if (kind === "regime") xs.push(`${b} 中国历史`, `${b} 疆域`);
  if (kind === "event") xs.push(`${b} 中国历史`, `${b} 战役`);
  if (kind === "person") xs.push(`${b} 画像`, `${b} 肖像`);
  return [...new Set(xs.filter((x) => x && x.length > 1))];
}

async function findImage(info) {
  if (info.id && CURATED_FILES[info.id]) {
    const exact = await commonsFile(CURATED_FILES[info.id]);
    if (exact) return { ...exact, query: CURATED_FILES[info.id], method: "curated-commons-file" };
  }
  const qs = variants(info);
  for (const q of qs.slice(0, 2)) {
    const exact = await commonsImage(q);
    if (exact) return { ...exact, query: q, method: "zh-pageimage" };
  }
  for (const q of qs.slice(0, 3)) {
    const hits = await zhSearchImages(q);
    if (hits.length) {
      hits.sort((a, b) => score(b, info.title, info.kind) - score(a, info.title, info.kind));
      return { ...hits[0], query: q, method: "zh-search-pageimage" };
    }
  }
  for (const q of qs) {
    const hits = await commonsSearchImages(q);
    if (hits.length) {
      hits.sort((a, b) => score(b, info.title, info.kind) - score(a, info.title, info.kind));
      return { ...hits[0], query: q, method: "commons-search" };
    }
  }
  return null;
}

function extFrom(mime, url) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/svg+xml") return "svg";
  if (mime === "image/gif") return "gif";
  if (mime === "image/jpeg") return "jpg";
  const m = new URL(url).pathname.match(/\.([a-z0-9]+)$/i);
  return m?.[1] || "jpg";
}

async function download(hit, id) {
  for (let attempt = 0; attempt < rateRetries; attempt++) {
    await throttleWait("download", downloadIntervalMs);
    const resp = await fetch(hit.url, {
      headers: { "User-Agent": UA, "Api-User-Agent": UA },
      signal: AbortSignal.timeout(30000),
    });
    if (resp.status === 429) {
      const body = await resp.text().catch(() => "");
      await handleRateLimit(resp, body, "download", attempt);
      continue;
    }
    if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
    await markRateSuccess("download");
    const buf = Buffer.from(await resp.arrayBuffer());
    if (buf.length < 5000) throw new Error("image too small");
    const mime = resp.headers.get("content-type")?.split(";")[0] || hit.mime;
    const encoded = isRasterMime(mime) ? await encodeWebp(buf, mime) : { buffer: buf, mime };
    const ext = encoded.mime === "image/webp" ? "webp" : extFrom(mime, hit.url);
    const file = `${SITE_OUT_DIR}${safeName(id)}.${ext}`;
    await writeFile(ROOT + file, encoded.buffer);
    return file;
  }
  throw new Error("WIKIMEDIA_RATE_LIMIT");
}

async function saveManifest() {
  await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
}

async function applyHit(id, slot, hit) {
  const existingExt = isRasterMime(hit.mime) ? "webp" : extFrom(hit.mime, hit.url);
  const file = existsSync(ROOT + `${SITE_OUT_DIR}${safeName(id)}.${existingExt}`)
    ? `${SITE_OUT_DIR}${safeName(id)}.${existingExt}`
    : await download(hit, id);
  const source = {
    provider: "Wikimedia Commons",
    title: hit.title,
    pageUrl: hit.pageUrl,
    fileUrl: hit.originalUrl,
    license: hit.license,
    licenseUrl: hit.licenseUrl,
    artist: hit.artist,
    query: hit.query,
    method: hit.method,
  };
  slot.versions = slot.versions || [];
  if (!slot.versions.some((v) => v.file === file)) {
    slot.versions.push({ file, engine: "wikimedia", usedRef: false, ts: Date.now(), source });
  }
  slot.selected = file;
  slot.source = source;
  if (throttle.misses[id]) {
    delete throttle.misses[id];
    await saveThrottleState();
  }
  await saveManifest();
  return file;
}

async function recordMiss(id, info) {
  throttle.misses[id] = {
    title: info.title,
    kind: info.kind,
    lastAt: Date.now(),
  };
  await saveThrottleState();
}

async function batchExact(entries) {
  let ok = 0;
  let fail = 0;
  let halted = false;
  const titleToIds = new Map();
  for (const [id, slot] of entries) {
    if (hasSelected(slot)) continue;
    const info = meta.get(id);
    for (const title of [info.title, baseTitle(info.title)]) {
      if (!title || title.length < 2) continue;
      if (!titleToIds.has(title)) titleToIds.set(title, []);
      titleToIds.get(title).push(id);
    }
  }

  const titleToFile = new Map();
  const titles = [...titleToIds.keys()];
  for (let i = 0; i < titles.length; i += 45) {
    const found = await zhPageImageBatch(titles.slice(i, i + 45));
    for (const [title, file] of found) titleToFile.set(title, `File:${file}`);
  }

  const fileToHit = new Map();
  const files = [...new Set(titleToFile.values())];
  for (let i = 0; i < files.length; i += 45) {
    const found = await commonsFileBatch(files.slice(i, i + 45));
    for (const [file, hit] of found) fileToHit.set(file, hit);
  }

  for (const title of titles) {
    const fileTitle = titleToFile.get(title);
    const hit = fileTitle ? fileToHit.get(fileTitle) : null;
    if (!hit) continue;
    for (const id of titleToIds.get(title) || []) {
      const slot = manifest.slots[id];
      if (hasSelected(slot)) continue;
      try {
        const info = meta.get(id);
        const saved = await applyHit(id, slot, { ...hit, query: title, method: "zh-pageimage-batch" });
        ok++;
        console.log(`OK   ${id} ${info.title} -> ${saved}`);
      } catch (err) {
        if (err.message === "WIKIMEDIA_RATE_LIMIT") {
          fail++;
          halted = true;
          console.log(`STOP ${id}: Wikimedia rate limit 429`);
          return { ok, fail, halted };
        }
        fail++;
        console.log(`FAIL ${id}: ${err.message}`);
      }
    }
  }
  return { ok, fail, halted };
}

await loadThrottleState();
await mkdir(OUT_DIR, { recursive: true });

const allEntries = Object.entries(manifest.slots);
const startAfterIndex = startAfter ? allEntries.findIndex(([id]) => id === startAfter) : -1;
if (startAfter && startAfterIndex === -1) {
  throw new Error(`Unknown --start-after id: ${startAfter}`);
}

const entries = allEntries
  .filter((_, index) => startAfterIndex < 0 || index > startAfterIndex)
  .filter(([id, slot]) => !hasSelected(slot) && meta.has(id))
  .filter(([id]) => !kindFilter || meta.get(id).kind === kindFilter)
  .filter(([id]) => !idFilter.size || idFilter.has(id))
  .filter(([id]) => retryMisses || idFilter.size || !throttle.misses[id])
  .slice(0, limit || undefined);

let ok = 0;
let miss = 0;
let fail = 0;
let halted = false;

if (!idFilter.size) {
  const batch = await batchExact(entries);
  ok += batch.ok;
  fail += batch.fail;
  halted = batch.halted;
}

for (const [id, slot] of entries) {
  if (halted) break;
  if (hasSelected(slot)) continue;
  const info = { id, ...meta.get(id) };
  try {
    const hit = await findImage(info);
    if (!hit) {
      miss++;
      console.log(`MISS ${id} ${info.title}`);
      await recordMiss(id, info);
      continue;
    }
    const file = await applyHit(id, slot, hit);
    ok++;
    console.log(`OK   ${id} ${info.title} -> ${file}`);
  } catch (err) {
    if (err.message === "WIKIMEDIA_RATE_LIMIT") {
      fail++;
      halted = true;
      console.log(`STOP ${id}: Wikimedia rate limit 429`);
      break;
    }
    fail++;
    console.log(`FAIL ${id} ${info.title}: ${err.message}`);
  }
  await sleep(120);
}

await saveManifest();
console.log(`\n完成：填充 ${ok}，未找到 ${miss}，失败 ${fail}，扫描 ${entries.length}${halted ? "（因 Wikimedia rate limit 429 提前停止）" : ""}。`);
