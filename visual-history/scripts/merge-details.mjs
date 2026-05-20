#!/usr/bin/env node
// 把 patches/D*.json 的 peopleDetails / eventDetails 写到 data/people.json / events.json 的 detail 字段。
// 报告：每个 agent 写了多少 / 多少落入不存在 id（被忽略）/ 总 detail 总字数

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(".");
const DATA = path.join(ROOT, "data");
const PATCHES = path.join(ROOT, "patches");

const people = JSON.parse(fs.readFileSync(path.join(DATA, "people.json"), "utf8"));
const events = JSON.parse(fs.readFileSync(path.join(DATA, "events.json"), "utf8"));

const personById = new Map(people.people.map(p => [p.id, p]));
const eventById = new Map(events.events.map(e => [e.id, e]));

const patchFiles = fs.readdirSync(PATCHES).filter(f => /^D\d+\.json$/.test(f)).sort();
console.log(`发现 ${patchFiles.length} 份 detail patch：${patchFiles.join(", ")}\n`);

const report = { perAgent: {}, missing: [], lastWriterWins: [] };
let totalChars = 0;

for (const fname of patchFiles) {
  const patch = JSON.parse(fs.readFileSync(path.join(PATCHES, fname), "utf8"));
  const ag = patch.agentGroup || fname;
  const r = { written: { people: 0, events: 0 }, chars: 0, missed: 0 };

  for (const d of patch.peopleDetails || []) {
    const p = personById.get(d.id);
    if (!p) { report.missing.push(`${ag}: person:${d.id} 不存在`); r.missed++; continue; }
    if (p.detail) report.lastWriterWins.push(`person:${d.id}（被 ${ag} 覆盖）`);
    p.detail = d.detail;
    r.written.people++;
    r.chars += d.detail.length;
  }
  for (const d of patch.eventDetails || []) {
    const e = eventById.get(d.id);
    if (!e) { report.missing.push(`${ag}: event:${d.id} 不存在`); r.missed++; continue; }
    if (e.detail) report.lastWriterWins.push(`event:${d.id}（被 ${ag} 覆盖）`);
    e.detail = d.detail;
    r.written.events++;
    r.chars += d.detail.length;
  }
  totalChars += r.chars;
  report.perAgent[ag] = r;
}

fs.writeFileSync(path.join(DATA, "people.json"), JSON.stringify(people, null, 2) + "\n");
fs.writeFileSync(path.join(DATA, "events.json"), JSON.stringify(events, null, 2) + "\n");

console.log("=== 每个 agent 写入统计 ===");
for (const [ag, r] of Object.entries(report.perAgent)) {
  console.log(`  ${ag}  人物 +${r.written.people}  事件 +${r.written.events}  共 ${r.chars} 字${r.missed ? `  miss=${r.missed}` : ""}`);
}
console.log(`\n总字数：${totalChars} 中文字符`);

const peopleWithDetail = people.people.filter(p => p.detail).length;
const eventsWithDetail = events.events.filter(e => e.detail).length;
console.log(`现在带 detail 的：人物 ${peopleWithDetail}/${people.people.length}，事件 ${eventsWithDetail}/${events.events.length}`);

if (report.missing.length) {
  console.log(`\n⚠ ${report.missing.length} 条 patch 引用了不存在的 id（已忽略）：`);
  report.missing.slice(0, 20).forEach(s => console.log("  " + s));
}
if (report.lastWriterWins.length) {
  console.log(`\nℹ ${report.lastWriterWins.length} 个 id 被多 agent 覆盖（last-writer-wins，按 D1→D8 顺序后者赢）：`);
  report.lastWriterWins.slice(0, 10).forEach(s => console.log("  " + s));
}
