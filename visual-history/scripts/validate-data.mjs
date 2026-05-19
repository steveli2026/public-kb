// 数据完整性校验（Node）：node scripts/validate-data.mjs
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const D = fileURLToPath(new URL("../data/", import.meta.url));
const rd = async (p) => JSON.parse(await readFile(D + p, "utf8"));

const [eras, regimes, people, events, base, snaps] = await Promise.all([
  rd("eras.json"), rd("regimes.json"), rd("people.json"),
  rd("events.json"), rd("geo/base-china.json"), rd("geo/snapshots.json"),
]);

const R = new Set(regimes.regimes.map((x) => x.id));
const P = new Set(people.people.map((x) => x.id));
const E = new Set(events.events.map((x) => x.id));
const C = new Set(base.cells.map((x) => x.id));
const S = new Set(Object.keys(snaps.snapshots));
const problems = [];
const chk = (cond, msg) => !cond && problems.push(msg);

for (const e of eras.eras) {
  (e.regimeIds || []).forEach((r) => chk(R.has(r), `era ${e.id} → 未知 regime:${r}`));
  (e.keyPersonIds || []).forEach((p) => chk(P.has(p), `era ${e.id} → 未知 person:${p}`));
  (e.keyEventIds || []).forEach((v) => chk(E.has(v), `era ${e.id} → 未知 event:${v}`));
  chk(!e.snapshot || S.has(e.snapshot), `era ${e.id} → 未知 snapshot:${e.snapshot}`);
}
for (const [sid, list] of Object.entries(snaps.snapshots))
  for (const seg of list) {
    chk(R.has(seg.r), `snapshot ${sid} → 未知 regime:${seg.r}`);
    (seg.cells || []).forEach((c) => chk(C.has(c), `snapshot ${sid} → 未知 cell:${c}`));
  }
for (const p of people.people)
  (p.relations || []).forEach((r) => chk(P.has(r.personId), `person ${p.id} → 未知 relation:${r.personId}`));
for (const v of events.events)
  (v.involvedPersonIds || []).forEach((p) => chk(P.has(p), `event ${v.id} → 未知 person:${p}`));
for (const r of regimes.regimes) {
  (r.relatedPersonIds || []).forEach((p) => chk(P.has(p), `regime ${r.id} → 未知 person:${p}`));
  (r.relatedEventIds || []).forEach((v) => chk(E.has(v), `regime ${r.id} → 未知 event:${v}`));
  chk(!r.founderPersonId || P.has(r.founderPersonId), `regime ${r.id} → 未知 founder:${r.founderPersonId}`);
}

// 覆盖度报告
const noSnap = eras.eras.filter((e) => !e.snapshot);
console.log(`时期 ${eras.eras.length} · 政权 ${R.size} · 人物 ${P.size} · 事件 ${E.size} · 快照 ${S.size} · cell ${C.size}`);
if (noSnap.length) console.log("（无快照，将回退默认）:", noSnap.map((e) => e.id).join(", ") || "无");

if (problems.length) {
  console.error(`\n✗ ${problems.length} 处问题：`);
  problems.forEach((p) => console.error("  - " + p));
  process.exit(1);
}
console.log("\n✓ 数据完整性校验通过");
