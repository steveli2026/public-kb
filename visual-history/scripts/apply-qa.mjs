#!/usr/bin/env node
// 应用 patches/QA.json 的 factFixes（action:fix）和 high+medium prune。
// 自动汇报每一处改动，方便核对。
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(".");
const DATA = path.join(ROOT, "data");
const qa = JSON.parse(fs.readFileSync(path.join(ROOT, "patches", "QA.json"), "utf8"));

const eras = JSON.parse(fs.readFileSync(path.join(DATA, "eras.json"), "utf8"));
const people = JSON.parse(fs.readFileSync(path.join(DATA, "people.json"), "utf8"));
const events = JSON.parse(fs.readFileSync(path.join(DATA, "events.json"), "utf8"));

const eraById = new Map(eras.eras.map(e => [e.id, e]));
const personById = new Map(people.people.map(p => [p.id, p]));
const eventById = new Map(events.events.map(e => [e.id, e]));

// === 1. fact fixes ===
let fixed = 0, skipped = 0;
for (const fix of qa.factFixes || []) {
  if (fix.action !== "fix") continue;
  // path 例： "people.tang-wangxuance.bio"  /  "eras.tang.storylets[王玄策一人灭一国].body"
  const m = /^(people|events|eras)\.([a-zA-Z0-9_-]+)(\.storylets\[(.+?)\])?\.(\w+)$/.exec(fix.path);
  if (!m) { console.log(`✗ 无法解析 path: ${fix.path}`); skipped++; continue; }
  const [, kind, id, , storyletTitle, field] = m;
  if (kind === "people") {
    const p = personById.get(id);
    if (!p) { console.log(`✗ people.${id} 不存在`); skipped++; continue; }
    p[field] = fix.newValue;
    console.log(`  ✓ people.${id}.${field} ← (${fix.newValue.length} chars)`);
  } else if (kind === "events") {
    const e = eventById.get(id);
    if (!e) { console.log(`✗ events.${id} 不存在`); skipped++; continue; }
    e[field] = fix.newValue;
    console.log(`  ✓ events.${id}.${field} ←`);
  } else if (kind === "eras") {
    const era = eraById.get(id);
    if (!era) { console.log(`✗ eras.${id} 不存在`); skipped++; continue; }
    if (storyletTitle) {
      const sl = (era.storylets || []).find(s => s.title === storyletTitle);
      if (!sl) { console.log(`✗ eras.${id}.storylets[${storyletTitle}] 找不到`); skipped++; continue; }
      sl[field] = fix.newValue;
      console.log(`  ✓ eras.${id}.storylets[${storyletTitle}].${field} ←`);
    } else {
      era[field] = fix.newValue;
      console.log(`  ✓ eras.${id}.${field} ←`);
    }
  }
  fixed++;
}

// === 2. prunes：删 high + medium ===
let pruned = 0;
for (const cand of qa.storyletsToPrune || []) {
  if (cand.confidence !== "high" && cand.confidence !== "medium") continue;
  const era = eraById.get(cand.era);
  if (!era || !Array.isArray(era.storylets)) { console.log(`✗ era ${cand.era} 不存在`); continue; }
  const before = era.storylets.length;
  era.storylets = era.storylets.filter(s => s.title !== cand.title);
  if (era.storylets.length === before) {
    console.log(`✗ ${cand.era} 没有 storylet "${cand.title}" 可删`);
    continue;
  }
  console.log(`  ✂ ${cand.era} / ${cand.title}（${cand.confidence}）`);
  pruned++;
}

fs.writeFileSync(path.join(DATA, "eras.json"), JSON.stringify(eras, null, 2) + "\n");
fs.writeFileSync(path.join(DATA, "people.json"), JSON.stringify(people, null, 2) + "\n");
fs.writeFileSync(path.join(DATA, "events.json"), JSON.stringify(events, null, 2) + "\n");

console.log(`\n=== 汇总 ===`);
console.log(`  fact fixes  应用：${fixed}  跳过：${skipped}`);
console.log(`  storylet 删：${pruned}`);
console.log(`  现 storylet 总数：${eras.eras.reduce((n, e) => n + (e.storylets?.length || 0), 0)}`);
