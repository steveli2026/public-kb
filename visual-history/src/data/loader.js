// 数据加载 / 索引 / 交叉引用解析 / 完整性校验
const BASE = new URL("../../data/", import.meta.url);

async function j(path) {
  const res = await fetch(new URL(path, BASE));
  if (!res.ok) throw new Error(`加载失败 ${path}: ${res.status}`);
  return res.json();
}

export async function loadAll() {
  const [erasD, regimesD, peopleD, eventsD, baseGeo, snaps] = await Promise.all([
    j("eras.json"), j("regimes.json"), j("people.json"),
    j("events.json"), j("geo/base-china.json"), j("geo/snapshots.json"),
  ]);

  const eras = erasD.eras;
  const regimes = index(regimesD.regimes);
  const people = index(peopleD.people);
  const events = index(eventsD.events);
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
    regimes, people, events,
    regime: (id) => regimes.get(id),
    person: (id) => people.get(id),
    event: (id) => events.get(id),
    entity(id) { return people.get(id) || events.get(id) || regimes.get(id) || null; },
    entityKind(id) {
      if (people.has(id)) return "person";
      if (events.has(id)) return "event";
      if (regimes.has(id)) return "regime";
      return null;
    },
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

function index(arr) {
  const m = new Map();
  for (const it of arr) m.set(it.id, it);
  return m;
}

// 把 summary/story/bio 中的 [[id]] 解析为可点链接；未知 id 退化为强调文本（宽松，不报错）
export function linkify(text, db, onClick) {
  const frag = document.createDocumentFragment();
  if (!text) return frag;
  const re = /\[\[([a-zA-Z0-9_-]+)\]\]/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) frag.append(document.createTextNode(text.slice(last, m.index)));
    const id = m[1];
    const ent = db.entity(id);
    if (ent) {
      const a = document.createElement("span");
      a.className = "lk";
      a.textContent = ent.name || ent.title || id;
      a.tabIndex = 0;
      a.dataset.id = id;
      a.addEventListener("click", () => onClick?.(id));
      a.addEventListener("keydown", (e) => { if (e.key === "Enter") onClick?.(id); });
      frag.append(a);
    } else {
      const b = document.createElement("strong");
      b.textContent = id; // 概念性引用（如 天命）— 宽松降级
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
