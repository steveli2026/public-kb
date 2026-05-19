// 详情抽屉：人物 / 事件 / 政权；交叉链可点跳转（黄巢 ↔ 朱温）
import { linkify } from "../data/loader.js";
import { ImageSlot } from "../imageslot/ImageSlot.js";

export class DetailPanel {
  constructor(db, hooks) {
    this.db = db;
    this.hooks = hooks; // { onNavigate(id), onClose() }
    this.drawer = document.getElementById("drawer");
    this.scrim = document.getElementById("scrim");
    this.scrim.addEventListener("click", () => this.close());
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") this.close(); });
  }

  open(id) {
    const kind = this.db.entityKind(id);
    if (!kind) return;
    this.drawer.innerHTML = "";
    this.drawer.append(this._closeBtn());
    if (kind === "person") this._person(id);
    else if (kind === "event") this._event(id);
    else if (kind === "regime") this._regime(id);
    this.drawer.classList.add("open");
    this.scrim.classList.add("open");
    this.drawer.scrollTop = 0;
    this.current = id;
    this.hooks.onNavigate?.(id);
  }

  close() {
    this.drawer.classList.remove("open");
    this.scrim.classList.remove("open");
    this.current = null;
    this.hooks.onClose?.();
  }

  _closeBtn() {
    const b = document.createElement("button");
    b.className = "close"; b.textContent = "✕"; b.setAttribute("aria-label", "关闭");
    b.addEventListener("click", () => this.close());
    return b;
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
    const kind = this.db.entityKind(id); // person | event | regime
    const aspect = kind === "person" ? "3 / 4" : "3 / 2";
    return ImageSlot(`${kind}:${id}`, { aspect, className: "detail-art" });
  }

  go(id) {
    if (this.db.entityKind(id)) this.open(id);
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
    this.drawer.append(this._head("人物", p.name, [p.life, p.role].filter(Boolean).join(" · ")));
    this.drawer.append(this._art(id));
    this.drawer.append(this._section("生平"));
    this.drawer.append(this._para(p.bio || "（详情待补充）"));

    const rels = [];
    for (const r of p.relations || []) {
      const o = this.db.person(r.personId);
      if (o) rels.push({ id: o.id, name: o.name, type: r.type, note: r.note });
    }
    for (const r of p._backrefs || []) {
      const o = this.db.person(r.personId);
      if (o) rels.push({ id: o.id, name: o.name, type: "↩ " + r.type, note: r.note });
    }
    if (rels.length) {
      this.drawer.append(this._section("人物关联"));
      this.drawer.append(this._relList(rels));
    }

    // 相关事件
    const evs = [...this.db.events.values()].filter((e) => (e.involvedPersonIds || []).includes(id));
    if (evs.length) {
      this.drawer.append(this._section("相关事件"));
      this.drawer.append(this._relList(evs.map((e) => ({ id: e.id, name: e.title, type: fmtYear(e.year) }))));
    }
  }

  _event(id) {
    const e = this.db.event(id);
    this.drawer.append(this._head("事件", e.title, fmtYear(e.year)));
    this.drawer.append(this._art(id));
    this.drawer.append(this._section("始末"));
    this.drawer.append(this._para(e.narrative || "（详情待补充）"));
    const ppl = (e.involvedPersonIds || []).map((pid) => this.db.person(pid)).filter(Boolean);
    if (ppl.length) {
      this.drawer.append(this._section("关涉人物"));
      this.drawer.append(this._relList(ppl.map((p) => ({ id: p.id, name: p.name, type: p.role || "" }))));
    }
  }

  _regime(id) {
    const r = this.db.regime(id);
    this.drawer.append(this._head("政权 / 国", r.name, ""));
    this.drawer.append(this._art(id));
    this.drawer.append(this._section("概述"));
    this.drawer.append(this._para(r.summary || "（详情待补充）"));
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
      this.drawer.append(this._section("关键人物"));
      this.drawer.append(this._relList(links));
    }
    const evs = (r.relatedEventIds || []).map((eid) => this.db.event(eid)).filter(Boolean);
    if (evs.length) {
      this.drawer.append(this._section("相关事件"));
      this.drawer.append(this._relList(evs.map((e) => ({ id: e.id, name: e.title, type: fmtYear(e.year) }))));
    }
  }
}

function fmtYear(y) {
  if (y == null) return "";
  return y < 0 ? `前 ${-y}` : `公元 ${y}`;
}
