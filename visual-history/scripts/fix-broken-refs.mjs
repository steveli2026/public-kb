#!/usr/bin/env node
// 修补合并后 validate 报告的 11 个引用问题：
// - 10 条 person.relations.personId 错指向 event id（schema 只允许 person id）：剔除
// - 1 处 era keyPersonIds 把 eh-banchao-bro 误写成 eh-banggu：改回
// - 1 处 event involvedPersonIds 把 bs-zhaoguangyi 误写成 zhaoguangyi：补 bs- 前缀

import fs from "node:fs";
import path from "node:path";

const DATA = path.resolve("data");
const eras = JSON.parse(fs.readFileSync(path.join(DATA, "eras.json"), "utf8"));
const people = JSON.parse(fs.readFileSync(path.join(DATA, "people.json"), "utf8"));
const events = JSON.parse(fs.readFileSync(path.join(DATA, "events.json"), "utf8"));

const personIds = new Set(people.people.map(p => p.id));

let stripped = 0, typoFixed = 0;

// 1. 剔除 relations 中指向非人物 id 的条目
for (const p of people.people) {
  if (!Array.isArray(p.relations)) continue;
  const before = p.relations.length;
  p.relations = p.relations.filter(r => {
    if (personIds.has(r.personId)) return true;
    console.log(`  剔除 ${p.id}.relations → ${r.personId}（指向非人物）`);
    return false;
  });
  stripped += before - p.relations.length;
}

// 2. era eastern-han.keyPersonIds: eh-banggu → eh-banchao-bro（A3 创建的实际 id）
for (const era of eras.eras) {
  if (era.id === "eastern-han" && Array.isArray(era.keyPersonIds)) {
    const i = era.keyPersonIds.indexOf("eh-banggu");
    if (i >= 0) {
      era.keyPersonIds[i] = "eh-banchao-bro";
      typoFixed++;
      console.log(`  era eastern-han.keyPersonIds: eh-banggu → eh-banchao-bro`);
    }
  }
}

// 3. event involvedPersonIds 里把 zhaoguangyi 改为 bs-zhaoguangyi
for (const ev of events.events) {
  if (!Array.isArray(ev.involvedPersonIds)) continue;
  const i = ev.involvedPersonIds.indexOf("zhaoguangyi");
  if (i >= 0) {
    ev.involvedPersonIds[i] = "bs-zhaoguangyi";
    typoFixed++;
    console.log(`  event ${ev.id}.involvedPersonIds: zhaoguangyi → bs-zhaoguangyi`);
  }
}

fs.writeFileSync(path.join(DATA, "eras.json"), JSON.stringify(eras, null, 2) + "\n");
fs.writeFileSync(path.join(DATA, "people.json"), JSON.stringify(people, null, 2) + "\n");
fs.writeFileSync(path.join(DATA, "events.json"), JSON.stringify(events, null, 2) + "\n");

console.log(`\n✓ 剔除非法 relations ${stripped} 条，修 typo ${typoFixed} 处`);
