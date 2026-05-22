// 生成/刷新 data/art-manifest.json —— 为系统里每个需要图的位置建一个 slot。
// 保留已有 versions/selected/ref/手改 prompt，不覆盖已生成成果。
// 用法：node scripts/build-art-manifest.mjs
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const D = ROOT + "data/";
const rd = async (p) => JSON.parse(await readFile(D + p, "utf8"));

const eras = (await rd("eras.json")).eras;
const people = (await rd("people.json")).people;
const events = (await rd("events.json")).events;
const regimes = (await rd("regimes.json")).regimes;

const MANIFEST = D + "art-manifest.json";
const prev = existsSync(MANIFEST) ? JSON.parse(await readFile(MANIFEST, "utf8")) : {};
const prevSlots = prev.slots || {};

const head = (s, n = 1) =>
  (s || "").split(/[。；！？\n]/).filter(Boolean).slice(0, n).join("。") + ((s || "").trim() ? "。" : "");

// 每个 type 的统一风格后缀由服务端在生成时附加；此处只存“主体” prompt（简化版，便于编辑）
const slots = {};
const put = (id, type, prompt, extra = {}) => {
  const p = prevSlots[id] || {};
  slots[id] = {
    type,
    prompt: p.userEdited ? p.prompt : prompt, // 用户在 UI 改过则保留
    userEdited: p.userEdited || false,
    ref: p.ref ?? extra.ref ?? null,
    engine: p.engine || extra.engine || (type === "map" || type === "scene" || type === "hero" ? "openai" : "gemini"),
    versions: p.versions || [],
    selected: p.selected || null,
    source: p.source || null,
  };
};

put("hero", "hero", "中国历史长卷开篇：黄河长江贯穿的辽阔山河，群山如龙，云气翻涌，朝代如潮起潮落");
put("map", "map", "中国全图：完整的海岸线、山脉与江河水系", { ref: existsSync(ROOT + "assets/ref/china-relief.webp") ? "assets/ref/china-relief.webp" : null });

for (const e of eras)
  put(`era:${e.id}`, "scene", `${e.name}（${e.years}）天下大势。${head(e.summary)}`);

for (const p of people)
  put(`person:${p.id}`, "portrait", `${p.name}，${p.role || ""}（${p.life || ""}）。${head(p.bio)}`);

for (const v of events)
  put(`event:${v.id}`, "scene", `${v.title}。${head(v.narrative)}`);

for (const r of regimes)
  put(`regime:${r.id}`, "scene", `${r.name}：${head(r.summary)}`);

// 迁移此前已生成的图，避免丢失（作为各 slot 的 v1）
function migrate(id, file) {
  if (!existsSync(ROOT + file)) return;
  const s = slots[id];
  if (!s || s.versions.some((x) => x.file === file)) return;
  s.versions.unshift({ file, engine: "legacy", ts: 0 });
  if (!s.selected) s.selected = file;
}
migrate("map", "assets/art/_basemap.webp");
migrate("person:huangchao", "assets/art/huangchao.webp");
migrate("person:zhuwen", "assets/art/zhuwen.webp");

const out = {
  _note:
    "每个需要图的位置一个 slot。prompt 为可编辑的‘主体’，生成时服务端按 type 追加统一风格后缀。" +
    "ref=垫图(可空，UI 可开关)。versions=本地多版本，selected=当前采用。由 build-art-manifest.mjs 生成，保留已有成果。",
  styleByType: {
    portrait: "，中国传统绢本工笔结合水墨，暖褐色调，半身肖像，神态传神，背景为当时场景或留白，博物馆藏品级，无文字无边框",
    scene: "，水墨史诗长卷，电影感构图，苍劲大气，暖墨与朱砂点染，做旧绢本质感，无文字",
    map: "。将其改绘为水墨绢本古地图：严格保留参考图的海岸线/陆地轮廓/水系与构图，去除所有文字、经纬网格、现代行政与国界线；山为水墨皴染，海为淡青古波纹，陆地为均匀做旧米色（不要妨碍后续叠色），雅致留白，无标题无指北针",
    hero: "，徐徐展开的绢本山河长卷，黄河长江贯穿，朱砂印章，苍劲大气，电影级开篇画面，无文字",
  },
  slots,
};
await writeFile(MANIFEST, JSON.stringify(out, null, 2) + "\n");
const withRef = Object.values(slots).filter((s) => s.ref).length;
const withImg = Object.values(slots).filter((s) => s.selected).length;
console.log(`slots: ${Object.keys(slots).length} | 带垫图: ${withRef} | 已有图: ${withImg}`);
