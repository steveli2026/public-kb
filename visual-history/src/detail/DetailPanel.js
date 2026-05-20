// 实体详情渲染：人物 / 事件 / 政权。
// 由 RightRail 等容器宿主，自身不再管开关/抽屉。交叉链（黄巢↔朱温）保留。
import { linkify } from "../data/loader.js";
import { ImageSlot } from "../imageslot/ImageSlot.js";

export class DetailPanel {
  constructor(db, target, hooks = {}) {
    this.db = db;
    this.target = target;            // 任意 host 容器；由调用方提供
    this.hooks = hooks;              // { onNavigate(id), onClose() }
    this.current = null;
  }

  render(id) {
    const kind = this.db.entityKind(id);
    if (!kind) return;
    this.target.innerHTML = "";
    if (kind === "person") this._person(id);
    else if (kind === "event") this._event(id);
    else if (kind === "regime") this._regime(id);
    this.target.scrollTop = 0;
    this.current = id;
    this.hooks.onNavigate?.(id);
  }

  clear() {
    this.target.innerHTML = "";
    this.current = null;
    this.hooks.onClose?.();
  }

  _head(kicker, title, meta) {
    const h = document.createElement("div");
    h.innerHTML =
      `<div class="d-kicker">${kicker}</div><h2>${title}</h2><div class="d-meta">${meta || ""}</div>`;
    return h;
  }

  _section(title) {
    const h = document.createElement("h3");
    h.textContent = title;
    return h;
  }

  _para(text) {
    const p = document.createElement("p");
    p.append(linkify(text, this.db, (id) => this.go(id)));
    return p;
  }

  _art(id) {
    const kind = this.db.entityKind(id);
    const aspect = kind === "person" ? "3 / 4" : "3 / 2";
    return ImageSlot(`${kind}:${id}`, { aspect, className: "detail-art" });
  }

  go(id) {
    if (this.db.entityKind(id)) this.render(id);
  }

  _relList(items) {
    const ul = document.createElement("ul");
    ul.className = "relations";
    for (const it of items) {
      const li = document.createElement("li");
      const tag = document.createElement("span");
      tag.className = "rel-type"; tag.textContent = it.type;
      const lk = document.createElement("span");
      lk.className = "lk"; lk.textContent = it.name; lk.tabIndex = 0;
      lk.addEventListener("click", () => this.go(it.id));
      lk.addEventListener("keydown", (e) => { if (e.key === "Enter") this.go(it.id); });
      li.append(tag, lk);
      if (it.note) {
        const n = document.createElement("span");
        n.className = "note"; n.textContent = "— " + it.note;
        li.append(n);
      }
      ul.append(li);
    }
    return ul;
  }

  _person(id) {
    const p = this.db.person(id);
    this.target.append(this._head("人物", p.name, [p.life, p.role].filter(Boolean).join(" · ")));
    this.target.append(this._art(id));
    this.target.append(this._section("生平"));
    this.target.append(this._para(p.bio || "（详情待补充）"));

    // 出向：本人在 relations 里主动提到的他人
    const outbound = [];
    for (const r of p.relations || []) {
      const o = this.db.person(r.personId);
      if (o) outbound.push({ id: o.id, name: o.name, type: r.type, note: r.note });
    }
    // 入向：他人在 relations 里提到本人（loader 自动注入 _backrefs）
    const inbound = [];
    for (const r of p._backrefs || []) {
      const o = this.db.person(r.personId);
      if (o) inbound.push({ id: o.id, name: o.name, type: r.type, note: r.note });
    }

    if (outbound.length) {
      this.target.append(this._section("人物关联"));
      this.target.append(this._relList(outbound));
    }
    if (inbound.length) {
      this.target.append(this._section(`被这些人提到 · ${inbound.length}`));
      this.target.append(this._relList(inbound));
    }

    const evs = [...this.db.events.values()].filter((e) => (e.involvedPersonIds || []).includes(id));
    if (evs.length) {
      this.target.append(this._section(`相关事件 · ${evs.length}`));
      this.target.append(this._relList(evs.map((e) => ({ id: e.id, name: e.title, type: fmtYear(e.year) }))));
    }
  }

  _event(id) {
    const e = this.db.event(id);
    this.target.append(this._head("事件", e.title, fmtYear(e.year)));
    this.target.append(this._art(id));
    this.target.append(this._section("始末"));
    this.target.append(this._para(e.narrative || "（详情待补充）"));
    const ppl = (e.involvedPersonIds || []).map((pid) => this.db.person(pid)).filter(Boolean);
    if (ppl.length) {
      this.target.append(this._section("关涉人物"));
      this.target.append(this._relList(ppl.map((p) => ({ id: p.id, name: p.name, type: p.role || "" }))));
    }
  }

  _regime(id) {
    const r = this.db.regime(id);
    this.target.append(this._head("政权 / 国", r.name, ""));
    this.target.append(this._art(id));
    this.target.append(this._section("概述"));
    this.target.append(this._para(r.summary || "（详情待补充）"));
    const links = [];
    if (r.founderPersonId) {
      const f = this.db.person(r.founderPersonId);
      if (f) links.push({ id: f.id, name: f.name, type: "奠基 / 开国" });
    }
    for (const pid of r.relatedPersonIds || []) {
      const p = this.db.person(pid);
      if (p) links.push({ id: p.id, name: p.name, type: "关键人物" });
    }
    if (links.length) {
      this.target.append(this._section("关键人物"));
      this.target.append(this._relList(links));
    }
    const evs = (r.relatedEventIds || []).map((eid) => this.db.event(eid)).filter(Boolean);
    if (evs.length) {
      this.target.append(this._section("相关事件"));
      this.target.append(this._relList(evs.map((e) => ({ id: e.id, name: e.title, type: fmtYear(e.year) }))));
    }
  }
}

function fmtYear(y) {
  if (y == null) return "";
  return y < 0 ? `前 ${-y}` : `公元 ${y}`;
}
