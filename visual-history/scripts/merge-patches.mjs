#!/usr/bin/env node
// 把 patches/A*.json 合到 data/eras.json / people.json / events.json。
// 写回前会汇报：每朝净增 / 总 id 数 / 重复冲突 / 未解析 [[id]] 引用。
// 反向 relations：A 提到 B，自动给 B 加一条反向条目（不重复加）。

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA = path.join(ROOT, "data");
const PATCHES = path.join(ROOT, "patches");

const eras = JSON.parse(fs.readFileSync(path.join(DATA, "eras.json"), "utf8"));
const people = JSON.parse(fs.readFileSync(path.join(DATA, "people.json"), "utf8"));
const events = JSON.parse(fs.readFileSync(path.join(DATA, "events.json"), "utf8"));
const regimes = JSON.parse(fs.readFileSync(path.join(DATA, "regimes.json"), "utf8"));

const personById = new Map(people.people.map(p => [p.id, p]));
const eventById = new Map(events.events.map(e => [e.id, e]));
const regimeById = new Map(regimes.regimes.map(r => [r.id, r]));
const eraById = new Map(eras.eras.map(e => [e.id, e]));

const patchFiles = fs.readdirSync(PATCHES).filter(f => /^A\d+\.json$/.test(f)).sort();
console.log(`发现 ${patchFiles.length} 份 patch：${patchFiles.join(", ")}`);

const report = { perEra: {}, perAgent: {}, idCollisions: [], unknownRefs: [] };

// 第一遍：收集 added people / events，建集合查重
for (const fname of patchFiles) {
  const patch = JSON.parse(fs.readFileSync(path.join(PATCHES, fname), "utf8"));
  const ag = patch.agentGroup || fname;
  report.perAgent[ag] = { added: { people: 0, events: 0, storylets: 0 }, eras: patch.eras || [] };

  for (const p of patch.people || []) {
    if (personById.has(p.id)) {
      report.idCollisions.push(`person ${p.id} (from ${ag}) 已存在`);
      continue;
    }
    personById.set(p.id, p);
    people.people.push(p);
    report.perAgent[ag].added.people++;
  }
  for (const e of patch.events || []) {
    if (eventById.has(e.id)) {
      report.idCollisions.push(`event ${e.id} (from ${ag}) 已存在`);
      continue;
    }
    eventById.set(e.id, e);
    events.events.push(e);
    report.perAgent[ag].added.events++;
  }

  // era patches
  for (const [eraId, ep] of Object.entries(patch.eraPatches || {})) {
    const era = eraById.get(eraId);
    if (!era) {
      report.unknownRefs.push(`agent ${ag} 引用未知 era:${eraId}`);
      continue;
    }
    report.perEra[eraId] ??= { storylets: 0, addedPersons: 0, addedEvents: 0, fromAgents: [] };
    report.perEra[eraId].fromAgents.push(ag);

    if (ep.storyAppend) {
      era.story = (era.story || "") + "\n\n" + ep.storyAppend;
    }
    if (ep.addedKeyPersonIds?.length) {
      era.keyPersonIds = uniqMerge(era.keyPersonIds, ep.addedKeyPersonIds);
      report.perEra[eraId].addedPersons += ep.addedKeyPersonIds.length;
    }
    if (ep.addedKeyEventIds?.length) {
      era.keyEventIds = uniqMerge(era.keyEventIds, ep.addedKeyEventIds);
      report.perEra[eraId].addedEvents += ep.addedKeyEventIds.length;
    }
    if (ep.addedStorylets?.length) {
      era.storylets ??= [];
      // 按 title 去重
      const seen = new Set(era.storylets.map(s => s.title));
      for (const sl of ep.addedStorylets) {
        if (seen.has(sl.title)) continue;
        era.storylets.push(sl);
        seen.add(sl.title);
        report.perEra[eraId].storylets++;
        report.perAgent[ag].added.storylets++;
      }
    }
  }
}

// 第二遍：双向 relations
// 不做任何手动补全！loader.js 已经从 relations 自动生成 _backrefs，
// DetailPanel 同时渲染 relations 和 _backrefs——任何手动补反向都会让
// 每条边在面板里显示两次。保留此空段作为提醒。
const backrefsAdded = 0;

// 第三遍：校验 [[id]] 引用 + 字段引用完整性
const allIds = new Set([
  ...personById.keys(),
  ...eventById.keys(),
  ...regimeById.keys(),
]);
const bracketRe = /\[\[([a-zA-Z0-9_-]+)\]\]/g;
function scanText(text, where) {
  if (!text) return;
  let m;
  while ((m = bracketRe.exec(text))) {
    if (!allIds.has(m[1])) report.unknownRefs.push(`${where} 引用未知 [[${m[1]}]]`);
  }
}
for (const e of eras.eras) {
  scanText(e.summary, `era:${e.id}.summary`);
  scanText(e.story, `era:${e.id}.story`);
  for (const sl of e.storylets || []) scanText(sl.body, `era:${e.id}.storylet:${sl.title}`);
}
for (const p of people.people) {
  scanText(p.bio, `person:${p.id}.bio`);
  for (const r of p.relations || []) {
    if (!personById.has(r.personId)) report.unknownRefs.push(`person:${p.id}.relations 指向未知 ${r.personId}`);
    scanText(r.note, `person:${p.id}.relations[${r.personId}].note`);
  }
}
for (const e of events.events) {
  scanText(e.narrative, `event:${e.id}.narrative`);
  for (const pid of e.involvedPersonIds || []) {
    if (!personById.has(pid)) report.unknownRefs.push(`event:${e.id}.involvedPersonIds 指向未知 ${pid}`);
  }
}

// 写回（保留 _note）
fs.writeFileSync(path.join(DATA, "eras.json"), JSON.stringify(eras, null, 2) + "\n");
fs.writeFileSync(path.join(DATA, "people.json"), JSON.stringify(people, null, 2) + "\n");
fs.writeFileSync(path.join(DATA, "events.json"), JSON.stringify(events, null, 2) + "\n");

// 汇报
console.log("\n=== 每个 agent 净增 ===");
for (const [ag, r] of Object.entries(report.perAgent)) {
  console.log(`  ${ag}  人物 +${r.added.people}  事件 +${r.added.events}  storylet +${r.added.storylets}   覆盖 era: ${r.eras.join(",")}`);
}
console.log("\n=== 每个 era 净增（storylet · keyPersonIds · keyEventIds）===");
for (const era of eras.eras) {
  const e = report.perEra[era.id];
  if (!e) continue;
  console.log(`  ${era.id.padEnd(18)} storylet+${e.storylets}  人物+${e.addedPersons}  事件+${e.addedEvents}`);
}
console.log(`\n反向 relations 自动补全：${backrefsAdded} 条`);
console.log(`\n现在总量：人物 ${people.people.length}  事件 ${events.events.length}  storylet ${eras.eras.reduce((n,e)=>n+(e.storylets?.length||0),0)}`);

if (report.idCollisions.length) {
  console.log(`\n⚠ id 冲突 ${report.idCollisions.length} 条：`);
  report.idCollisions.slice(0, 20).forEach(s => console.log("  " + s));
}
if (report.unknownRefs.length) {
  console.log(`\n⚠ 未解析引用 ${report.unknownRefs.length} 条（前 30）：`);
  report.unknownRefs.slice(0, 30).forEach(s => console.log("  " + s));
  console.log(`\n（这些会被 npm run validate 进一步检查；轻微问题不影响渲染——loader 会降级为强调文本）`);
}

function uniqMerge(a = [], b = []) {
  const out = [...a];
  for (const x of b) if (!out.includes(x)) out.push(x);
  return out;
}
