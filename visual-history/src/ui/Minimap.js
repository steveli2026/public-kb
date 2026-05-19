// 时间线缩略图（Sublime-style "你在这里"）：垂直列出全部时期，当前高亮，点击跳转。
export class Minimap {
  constructor(container, db, hooks) {
    this.db = db; this.container = container; this.hooks = hooks;
    this.rows = new Map();
    this.activeId = null;
  }

  render() {
    const wrap = document.createElement("aside");
    wrap.className = "minimap";

    const head = document.createElement("div");
    head.className = "minimap-head";
    head.innerHTML = `<small>时间线</small><span class="minimap-pos" id="mm-pos">— / ${this.db.eras.length}</span>`;
    wrap.append(head);

    const list = document.createElement("div");
    list.className = "minimap-list";
    this.db.eras.forEach((era, i) => {
      const r = document.createElement("button");
      r.className = "mm-row";
      r.dataset.era = era.id;
      r.title = `${era.name}（${era.years || ""}）`;
      r.innerHTML = `
        <span class="mm-swatch" style="background:${era.color || "var(--c-other)"}"></span>
        <span class="mm-num">${String(i + 1).padStart(2, "0")}</span>
        <span class="mm-name">${era.name}</span>`;
      r.addEventListener("click", () => this.hooks.onJump?.(era.id));
      list.append(r);
      this.rows.set(era.id, r);
    });
    wrap.append(list);
    this.list = list;
    this.posEl = head.querySelector("#mm-pos");
    this.container.append(wrap);
  }

  setActive(eraId) {
    if (eraId === this.activeId || eraId === "__hero") return;
    this.activeId = eraId;
    for (const [id, el] of this.rows) el.classList.toggle("on", id === eraId);
    const idx = this.db.eras.findIndex((e) => e.id === eraId);
    if (idx >= 0 && this.posEl) this.posEl.textContent = `${String(idx + 1).padStart(2, "0")} / ${this.db.eras.length}`;
    // 滚动到当前行，使其保持可见
    const row = this.rows.get(eraId);
    if (row) row.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
}
