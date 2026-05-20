// 数据加载 / 索引 / 交叉引用解析 / 完整性校验
const BASE = new URL("../../data/", import.meta.url);

async function j(path) {
  const res = await fetch(new URL(path, BASE));
  if (!res.ok) throw new Error(`加载失败 ${path}: ${res.status}`);
  return res.json();
}

export async function loadAll() {
  const [erasD, regimesD, peopleD, eventsD, mapsD, baseGeo, snaps] = await Promise.all([
    j("eras.json"), j("regimes.json"), j("people.json"),
    j("events.json"), j("maps.json"), j("geo/base-china.json"), j("geo/snapshots.json"),
  ]);

  const eras = erasD.eras;
  const regimes = index(regimesD.regimes);
  const people = index(peopleD.people);
  const events = index(eventsD.events);
  const maps = index(mapsD.maps, "eraId");
  const snapshots = snaps.snapshots;

  // 双向人物关系图
  for (const p of peopleD.people) {
    p.relations = p.relations ?? [];
    for (const rel of p.relations) {
      const other = people.get(rel.personId);
      if (other) {
        other._backrefs = other._backrefs ?? [];
        other._backrefs.push({ personId: p.id, type: rel.type, note: rel.note, back: true });
      }
    }
  }

  const db = {
    eras, snapshots, baseGeo,
    regimes, people, events, maps,
    regime: (id) => regimes.get(id),
    person: (id) => people.get(id),
    event: (id) => events.get(id),
    eraMap: (id) => maps.get(id),
    entity(id) { return people.get(id) || events.get(id) || regimes.get(id) || null; },
    entityKind(id) {
      if (people.has(id)) return "person";
      if (events.has(id)) return "event";
      if (regimes.has(id)) return "regime";
      return null;
    },
    hierarchy: () => buildHierarchy(eras, regimes),
  };

  const problems = validate(db);
  if (problems.length) {
    console.group("%c数据完整性警告", "color:#b23a2f;font-weight:bold");
    problems.forEach((p) => console.warn(p));
    console.groupEnd();
  } else {
    console.info("%c✓ 数据完整性校验通过", "color:#5d7a63");
  }
  db.problems = problems;
  return db;
}

/**
 * 把扁平的 eras 序列展平为 spine 渲染需要的 items：
 *   { kind: "parent" | "era" | "peer", depth, ... }
 *
 * - 同 parentChain 头部相同的连续 era → 共享父级标签行（virtual parent）
 *   当某层父级开启 → 推一个 { kind:"parent", label, color (从该层首个子 era 推), depth } item
 *   当父级关闭 → 不显式 pop（按是否相邻判断；如下一行 chain 头不再是该 label 则视为关闭）
 * - 每个 era 推一个 { kind:"era", era, depth: chain.length }
 * - 该 era.regimeIds.length >= 2 时，依次推 { kind:"peer", regime, depth+1 }
 *
 * 返回扁平数组，由 UI 层（DetailedRail）直接消费。
 */
function buildHierarchy(eras, regimes) {
  const out = [];
  // 当前开启的父级标签栈（自外向内）。每项 { label, depth, eraColor }
  const open = [];

  const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

  eras.forEach((era, i) => {
    const chain = era.parentChain || []; // 从直接父到最远祖先
    // 反转为"自外向内"的层级序列（祖先在前、直接父在后）
    const outerToInner = [...chain].reverse();

    // 关闭：从尾部开始，找到最长的与 open 共同前缀
    let common = 0;
    while (
      common < open.length &&
      common < outerToInner.length &&
      open[common].label === outerToInner[common]
    ) common++;
    // pop 不再共享的层
    open.length = common;

    // open 新层
    for (let d = common; d < outerToInner.length; d++) {
      const label = outerToInner[d];
      // 父级颜色：取该层首个子 era 的 color
      // 找下一个 era（含自己），其 chain reversed[d] == label
      const colorSource = eras
        .slice(i)
        .find((e) => (e.parentChain || []).slice().reverse()[d] === label);
      out.push({
        kind: "parent",
        label,
        depth: d,
        eraColor: colorSource?.color || "var(--c-other)",
      });
      open.push({ label, depth: d, eraColor: colorSource?.color });
    }

    // era 本身
    out.push({ kind: "era", era, depth: outerToInner.length });

    // 并立支线（regimeIds.length >= 2）
    if ((era.regimeIds || []).length >= 2) {
      for (const rid of era.regimeIds) {
        const reg = regimes.get(rid);
        if (!reg) continue;
        out.push({
          kind: "peer",
          regime: reg,
          parentEraId: era.id,
          depth: outerToInner.length + 1,
        });
      }
    }
  });
  return out;
}

function index(arr, key = "id") {
  const m = new Map();
  for (const it of arr) m.set(it[key], it);
  return m;
}

// 把文本中的 [[id]] 或 [[id|显示文字]] 解析为链接：
// - id 存在：渲染可点链接，文字优先用 |display，其次用 entity 自身 name/title。
// - id 不存在但有 |display：直接当文字（宽松降级，不再露 id|，适配 agent 偶尔编造的 id）。
// - id 不存在且无 |display：强调显示 id 本身（概念性引用，如『天命』）。
export function linkify(text, db, onClick) {
  const frag = document.createDocumentFragment();
  if (!text) return frag;
  const re = /\[\[([a-zA-Z0-9_-]+)(?:\|([^\]]+))?\]\]/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) frag.append(document.createTextNode(text.slice(last, m.index)));
    const id = m[1], display = m[2];
    const ent = db.entity(id);
    if (ent) {
      const a = document.createElement("span");
      a.className = "lk";
      a.textContent = display || ent.name || ent.title || id;
      a.tabIndex = 0;
      a.dataset.id = id;
      a.addEventListener("click", () => onClick?.(id));
      a.addEventListener("keydown", (e) => { if (e.key === "Enter") onClick?.(id); });
      frag.append(a);
    } else if (display) {
      frag.append(document.createTextNode(display));
    } else {
      const b = document.createElement("strong");
      b.textContent = id;
      frag.append(b);
    }
    last = re.lastIndex;
  }
  if (last < text.length) frag.append(document.createTextNode(text.slice(last)));
  return frag;
}

function validate(db) {
  const out = [];
  const has = (kind, id) =>
    kind === "regime" ? db.regimes.has(id)
    : kind === "person" ? db.people.has(id)
    : db.events.has(id);

  for (const era of db.eras) {
    (era.regimeIds || []).forEach((r) => !has("regime", r) && out.push(`era「${era.id}」引用未知政权 regime:${r}`));
    (era.keyPersonIds || []).forEach((p) => !has("person", p) && out.push(`era「${era.id}」引用未知人物 person:${p}`));
    (era.keyEventIds || []).forEach((e) => !has("event", e) && out.push(`era「${era.id}」引用未知事件 event:${e}`));
    if (era.snapshot && !db.snapshots[era.snapshot]) out.push(`era「${era.id}」引用未知快照 snapshot:${era.snapshot}`);
  }
  for (const map of db.maps.values()) {
    if (!db.eras.some((e) => e.id === map.eraId)) out.push(`地图「${map.title || map.src}」引用未知 era:${map.eraId}`);
    if (!map.src) out.push(`地图「${map.eraId}」缺少 src`);
    if (!map.sourceUrl) out.push(`地图「${map.eraId}」缺少 sourceUrl`);
    if (!map.license) out.push(`地图「${map.eraId}」缺少 license`);
    if (!map.attribution) out.push(`地图「${map.eraId}」缺少 attribution`);
  }
  for (const [sid, list] of Object.entries(db.snapshots)) {
    const cellIds = new Set(db.baseGeo.cells.map((c) => c.id));
    for (const seg of list) {
      if (!has("regime", seg.r)) out.push(`快照「${sid}」引用未知政权 regime:${seg.r}`);
      (seg.cells || []).forEach((c) => !cellIds.has(c) && out.push(`快照「${sid}」引用未知 cell:${c}`));
    }
  }
  for (const p of db.people.values())
    (p.relations || []).forEach((r) => !db.people.has(r.personId) && out.push(`人物「${p.id}」relation 指向未知 person:${r.personId}`));
  for (const e of db.events.values())
    (e.involvedPersonIds || []).forEach((p) => !db.people.has(p) && out.push(`事件「${e.id}」引用未知 person:${p}`));
  for (const r of db.regimes.values()) {
    (r.relatedPersonIds || []).forEach((p) => !db.people.has(p) && out.push(`政权「${r.id}」引用未知 person:${p}`));
    (r.relatedEventIds || []).forEach((e) => !db.events.has(e) && out.push(`政权「${r.id}」引用未知 event:${e}`));
  }
  return out;
}
