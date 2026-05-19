// 详尽态左栏：Toggle 头 + 鸟瞰条 + 嵌套脊柱（族谱树 + 时长条 + 并立支线）。
// 由 RailModeStore 控制可见性与宽度；通过 hooks 与 Spine/App 联动。
import { OverviewBar } from "./OverviewBar.js";

const BAR_MAX_PX = 110;     // 时长条最大宽度
const PEER_BAR_PX = 60;     // Phase 1：并立支线时长条等宽
const SCROLL_DEBOUNCE = 60; // 避免主滚动联动时频繁 scrollIntoView

export class DetailedRail {
  constructor(container, db, store, hooks = {}) {
    this.db = db;
    this.store = store;
    this.hooks = hooks;        // { onJumpToEra(eraId), onToggleMode() }
    this.activeId = null;
    this.rowByEra = new Map();
    this._scrollTimer = 0;

    this.root = document.createElement("div");
    this.root.className = "detailed-rail";
    this.root.innerHTML = `
      <div class="rail-head">
        <div class="rail-title">时间线</div>
        <div class="rail-toggle" role="group" aria-label="左栏模式切换">
          <button type="button" data-mode="light" aria-pressed="false">简略</button>
          <button type="button" data-mode="full"  aria-pressed="true">详尽</button>
        </div>
      </div>
      <div class="overview-host"></div>
      <div class="spine-list"></div>`;
    container.append(this.root);

    this.list = this.root.querySelector(".spine-list");
    this.toggleBtns = this.root.querySelectorAll(".rail-toggle button");

    this.overview = new OverviewBar(
      this.root.querySelector(".overview-host"),
      db.eras,
      { onJumpToEra: (id) => this.hooks.onJumpToEra?.(id) }
    );

    this._renderSpine();
    this._bindToggle();
    this._syncToggleState();

    this._unsub = store.subscribe((s, reason) => {
      if (reason === "mode") this._syncToggleState();
    });
  }

  _syncToggleState() {
    for (const btn of this.toggleBtns) {
      const is = btn.dataset.mode === this.store.mode;
      btn.classList.toggle("on", is);
      btn.setAttribute("aria-pressed", String(is));
    }
  }

  _bindToggle() {
    this.toggleBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        this.store.setMode(btn.dataset.mode);
      });
    });
  }

  _renderSpine() {
    const items = this.db.hierarchy();
    const maxDur = Math.max(...this.db.eras.map((e) => e.end - e.start));

    // 把"父级 + 紧随的同 chain 子 era + 其 peer"包成 .parent-group
    let currentGroup = null;
    const closeGroup = () => { currentGroup = null; };

    items.forEach((item) => {
      if (item.kind === "parent") {
        if (item.depth === 0) {
          // 顶层父级开新组
          currentGroup = document.createElement("div");
          currentGroup.className = "parent-group";
          this.list.append(currentGroup);
        }
        // depth>0 的父级（如"东周"）也放入当前组
        this._renderParent(item, currentGroup || this.list);
      } else if (item.kind === "era") {
        if (item.depth === 0) closeGroup();
        const target = currentGroup || this.list;
        this._renderEraRow(item, maxDur, target);
      } else if (item.kind === "peer") {
        const target = currentGroup || this.list;
        this._renderPeerRow(item, target);
      }
    });
  }

  _renderParent(item, parent) {
    const row = document.createElement("div");
    row.className = "spine-row spine-row--parent";
    row.dataset.depth = item.depth;
    row.style.setProperty("--tree-color", item.eraColor);
    row.innerHTML = `
      <span class="tree-rail tree-rail--parent"></span>
      <span class="row-name">${item.label}</span>
      <span class="row-bar-slot"></span>`;
    parent.append(row);
  }

  _renderEraRow(item, maxDur, parent) {
    const e = item.era;
    const row = document.createElement("button");
    row.type = "button";
    row.className = "spine-row spine-row--era";
    row.dataset.depth = item.depth;
    row.dataset.era = e.id;
    row.style.setProperty("--tree-color", e.color || "var(--c-other)");
    row.style.setProperty("--bar-color", e.color || "var(--c-other)");
    const barW = ((e.end - e.start) / maxDur * BAR_MAX_PX).toFixed(1);

    if (item.depth === 0) {
      row.innerHTML = `
        <span class="row-dot" style="background:${e.color || "var(--c-other)"}"></span>
        <span class="row-name">${e.name}<span class="row-kicker">${e.kicker || ""}</span></span>
        <span class="duration-bar" style="width:${barW}px"></span>`;
    } else {
      row.innerHTML = `
        <span class="tree-rail tree-rail--branch"></span>
        <span class="row-name">${e.name}<span class="row-kicker">${e.kicker || ""}</span></span>
        <span class="duration-bar" style="width:${barW}px"></span>`;
    }
    row.addEventListener("click", () => this.hooks.onJumpToEra?.(e.id));
    parent.append(row);
    this.rowByEra.set(e.id, row);
  }

  _renderPeerRow(item, parent) {
    const r = item.regime;
    const row = document.createElement("div");
    row.className = "spine-row spine-row--peer";
    row.dataset.depth = item.depth;
    row.dataset.parentEra = item.parentEraId;
    row.style.setProperty("--swatch", r.color || "var(--c-other)");
    row.style.setProperty("--bar-color", r.color || "var(--c-other)");
    row.innerHTML = `
      <span class="peer-swatch"></span>
      <span class="row-name peer-name">${r.name}</span>
      <span class="duration-bar duration-bar--peer" style="width:${PEER_BAR_PX}px"></span>`;
    parent.append(row);
  }

  /** 主滚动触发：高亮新 era + 联动鸟瞰条 + 行可见性 */
  setActiveEra(eraId) {
    if (eraId === this.activeId) return;
    this.activeId = eraId;
    // 切高亮
    for (const [id, row] of this.rowByEra) row.classList.toggle("on", id === eraId);
    // 同步鸟瞰条
    this.overview.setActiveEra(eraId);
    // 主滚动联动时，把行滚到 nearest（不要 center 抢主滚动）
    clearTimeout(this._scrollTimer);
    this._scrollTimer = setTimeout(() => {
      const row = this.rowByEra.get(eraId);
      row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, SCROLL_DEBOUNCE);
  }

  /** 详尽态首次打开：把当前 era 滚到 center（不抢主滚动） */
  centerActive() {
    const row = this.rowByEra.get(this.activeId);
    row?.scrollIntoView({ block: "center", behavior: "instant" });
  }

  /** 切换主体（鸟瞰条 + 脊柱）的可见性；head/toggle 永远可见，提供模式切换入口 */
  setVisible(v) {
    const overview = this.root.querySelector(".overview-host");
    const list = this.list;
    if (overview) overview.style.display = v ? "" : "none";
    if (list) list.style.display = v ? "" : "none";
  }

  dispose() {
    this._unsub?.();
    clearTimeout(this._scrollTimer);
  }
}
