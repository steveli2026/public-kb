// 滚动叙事脊柱：封面 + 逐朝代区块 + IntersectionObserver 联动地图
import { linkify } from "../data/loader.js";
import { ImageSlot } from "../imageslot/ImageSlot.js";

export class Spine {
  constructor(container, db, hooks) {
    this.db = db;
    this.container = container;
    this.hooks = hooks; // { onActiveEra, onSelect, onHoverRegime, openEntity }
    this.sections = new Map();
  }

  render() {
    const frag = document.createDocumentFragment();
    frag.append(this._hero());
    for (const era of this.db.eras) frag.append(this._eraSection(era));
    frag.append(this._coda());
    this.container.append(frag);
    this._observe();
  }

  _hero() {
    const s = document.createElement("section");
    s.className = "hero";
    s.dataset.era = "__hero";
    s.innerHTML = `
      <div class="seal">华夏</div>
      <h1>青山依旧，几度兴亡</h1>
      <p class="lede">从三皇五帝到一九四九，<br>王朝更替，山河易色，<br>人物与命运在同一卷历史中相逢。</p>
      <p style="max-width:42ch;color:var(--ink-soft)">
        向下展开长卷：看天下如何分合，看制度如何生灭，看一个个名字如何改变时代。</p>
      <p class="hint">向下滚动，长卷展开</p>`;
    s.insertBefore(
      ImageSlot("hero", { aspect: "16 / 9", className: "hero-art" }),
      s.querySelector(".hint")
    );
    return s;
  }

  _eraSection(era) {
    const s = document.createElement("section");
    s.className = "era-section";
    s.dataset.era = era.id;
    s.id = "era-" + era.id;

    const head = document.createElement("div");
    const swColor = era.color || "var(--c-other)";
    head.innerHTML = `
      <div class="era-kicker">${era.kicker || ""} <span class="years">${era.years || ""}</span></div>
      <h2 class="era-title"><span class="swatch" style="background:${swColor}"></span>${era.name}</h2>
      <div class="tagrow">${(era.tags || []).map((t) => `<span class="era-tag">${t}</span>`).join("")}</div>`;
    s.append(head);

    const summary = document.createElement("p");
    summary.className = "era-summary";
    summary.append(linkify(era.summary || "", this.db, (id) => this.hooks.openEntity(id)));
    s.append(summary);

    if (era.story) {
      const st = document.createElement("div");
      st.className = "story";
      st.append(linkify(era.story, this.db, (id) => this.hooks.openEntity(id)));
      s.append(st);
    }

    if ((era.storylets || []).length) s.append(this._storylets(era.storylets));

    // 并立势力 chip
    if ((era.regimeIds || []).length) {
      const row = document.createElement("div");
      row.className = "regime-row";
      for (const rid of era.regimeIds) {
        const reg = this.db.regime(rid);
        if (!reg) continue;
        const chip = document.createElement("button");
        chip.className = "chip";
        chip.dataset.regime = rid;
        chip.innerHTML = `<span class="dot" style="background:${reg.color}"></span>${reg.name}`;
        chip.addEventListener("mouseenter", () => this.hooks.onHoverRegime(rid));
        chip.addEventListener("mouseleave", () => this.hooks.onHoverRegime(null));
        chip.addEventListener("click", () => this.hooks.openEntity(rid));
        row.append(chip);
      }
      s.append(row);
    }

    // 关键事件 / 关键人物
    const cols = document.createElement("div");
    cols.className = "cols";
    cols.append(
      this._list("关键事件", era.keyEventIds, (id) => {
        const e = this.db.event(id);
        return e && { name: e.title, meta: fmtYear(e.year), id };
      }),
      this._list("关键人物", era.keyPersonIds, (id) => {
        const p = this.db.person(id);
        return p && { name: p.name, meta: p.role || p.life, id };
      })
    );
    s.append(cols);
    this.sections.set(era.id, s);
    return s;
  }

  _storylets(items) {
    const wrap = document.createElement("div");
    wrap.className = "storylets";
    for (const item of items) {
      const card = document.createElement("article");
      card.className = "storylet";
      const title = document.createElement("h3");
      title.textContent = item.title;
      const body = document.createElement("p");
      body.append(linkify(item.body || "", this.db, (id) => this.hooks.openEntity(id)));
      card.append(title, body);
      wrap.append(card);
    }
    return wrap;
  }

  _list(title, ids, resolve) {
    const box = document.createElement("div");
    const h = document.createElement("h4");
    h.textContent = title;
    box.append(h);
    for (const id of ids || []) {
      const r = resolve(id);
      if (!r) continue;
      const d = document.createElement("div");
      d.className = "entry";
      d.innerHTML = `<b>${r.name}</b> <span class="meta">${r.meta || ""}</span>`;
      d.addEventListener("click", () => this.hooks.openEntity(r.id));
      box.append(d);
    }
    return box;
  }

  _coda() {
    const s = document.createElement("section");
    s.className = "hero";
    s.dataset.era = "prc";
    s.innerHTML = `
      <div class="seal" style="background:var(--c-prc)">长卷</div>
      <h1 style="font-size:var(--step-2)">历史不会重复，但它押韵</h1>
      <p class="lede">每一次分裂，都孕育更大的统一；<br>每一个盛世，都埋着衰亡的伏笔。</p>
      <p class="hint" style="cursor:pointer" id="back-top">回到开篇</p>`;
    s.querySelector("#back-top").addEventListener("click", () =>
      scrollTo({ top: 0, behavior: "smooth" }));
    return s;
  }

  _observe() {
    let current = null;
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (vis && vis.target.dataset.era !== current) {
          if (current) this.sections.get(current)?.classList.remove("is-active");
          current = vis.target.dataset.era;
          vis.target.classList.add("is-active");
          this.hooks.onActiveEra(current, vis.target);
        }
      },
      { threshold: [0.25, 0.5, 0.75], rootMargin: "-10% 0px -40% 0px" }
    );
    this.container.querySelectorAll("section[data-era]").forEach((s) => io.observe(s));
  }

  scrollToEra(eraId) {
    this.sections.get(eraId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function fmtYear(y) {
  if (y == null) return "";
  return y < 0 ? `前 ${-y}` : `公元 ${y}`;
}
