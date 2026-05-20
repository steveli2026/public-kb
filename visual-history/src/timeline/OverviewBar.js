// 鸟瞰条：按公元年份线性映射所有 era；hover 出辅助线 + tooltip；当前 era 游标 pulse。
const SVG_W = 456, SVG_H = 50;
const Y_MIN = -2700, Y_MAX = 2026;     // 涵盖三皇五帝起到 PRC 至今的安全范围
const RANGE = Y_MAX - Y_MIN;

const SVG_NS = "http://www.w3.org/2000/svg";

export class OverviewBar {
  constructor(container, eras, hooks = {}) {
    this.eras = eras;
    this.hooks = hooks;          // { onJumpToEra(eraId) }
    this.activeId = null;

    const root = document.createElement("div");
    root.className = "overview-bar";
    root.innerHTML = `
      <svg class="overview-svg" viewBox="0 0 ${SVG_W} ${SVG_H}" preserveAspectRatio="none" aria-label="鸟瞰时间线"></svg>
      <div class="overview-hint">公元 前 2700  —  1949</div>
      <div class="overview-tooltip" role="status" aria-live="polite"></div>`;
    container.append(root);

    this.root = root;
    this.svg = root.querySelector(".overview-svg");
    this.tooltip = root.querySelector(".overview-tooltip");

    this._renderSegments();
    this._bindHover();
    this._bindClick();
  }

  _x(year) { return ((year - Y_MIN) / RANGE) * SVG_W; }

  _renderSegments() {
    // 主 era 色段
    for (const era of this.eras) {
      const x0 = this._x(era.start);
      const w = Math.max(1, this._x(era.end) - x0);
      const r = document.createElementNS(SVG_NS, "rect");
      r.setAttribute("x", x0);
      r.setAttribute("y", 8);
      r.setAttribute("width", w);
      r.setAttribute("height", 30);
      r.setAttribute("class", "ov-seg");
      r.style.fill = era.color || "var(--c-other)";
      r.dataset.era = era.id;
      this.svg.append(r);
    }

    // 游标层（始终最上）
    this.cursorLayer = document.createElementNS(SVG_NS, "g");
    this.cursorLayer.setAttribute("class", "ov-cursor-layer");
    this.svg.append(this.cursorLayer);

    // hover 辅助线层
    this.hoverLine = document.createElementNS(SVG_NS, "line");
    this.hoverLine.setAttribute("class", "ov-hover-line");
    this.hoverLine.setAttribute("y1", 0);
    this.hoverLine.setAttribute("y2", SVG_H);
    this.hoverLine.style.display = "none";
    this.svg.append(this.hoverLine);
  }

  setActiveEra(eraId) {
    if (eraId === this.activeId) return;
    this.activeId = eraId;
    this.cursorLayer.innerHTML = "";
    const era = this.eras.find((e) => e.id === eraId);
    if (!era) return;

    const x0 = this._x(era.start);
    const w = this._x(era.end) - x0;
    const cx = x0 + w / 2;

    // 顶部贯穿金条
    const top = document.createElementNS(SVG_NS, "rect");
    top.setAttribute("class", "ov-cursor-top");
    top.setAttribute("x", x0);
    top.setAttribute("y", 5);
    top.setAttribute("width", w);
    top.setAttribute("height", 2);
    top.setAttribute("rx", 1);
    this.cursorLayer.append(top);

    // 中心竖向游标
    const line = document.createElementNS(SVG_NS, "line");
    line.setAttribute("class", "ov-cursor-line");
    line.setAttribute("x1", cx);
    line.setAttribute("x2", cx);
    line.setAttribute("y1", 2);
    line.setAttribute("y2", SVG_H - 4);
    this.cursorLayer.append(line);

    // 顶/底小三角
    for (const [y, dy] of [[0, 4], [SVG_H - 2, -4]]) {
      const tri = document.createElementNS(SVG_NS, "polygon");
      tri.setAttribute("class", "ov-cursor-tri");
      tri.setAttribute("points", `${cx - 3},${y} ${cx + 3},${y} ${cx},${y + dy}`);
      this.cursorLayer.append(tri);
    }
  }

  _bindHover() {
    this.root.addEventListener("mousemove", (e) => {
      const rect = this.svg.getBoundingClientRect();
      const relX = e.clientX - rect.left;
      const pct = Math.max(0, Math.min(1, relX / rect.width));
      const sx = pct * SVG_W;
      const year = Math.round(Y_MIN + pct * RANGE);
      const inEra = this.eras.find((er) => year >= er.start && year <= er.end);

      this.hoverLine.style.display = "";
      this.hoverLine.setAttribute("x1", sx);
      this.hoverLine.setAttribute("x2", sx);

      const yLabel = year < 0 ? `前 ${-year}`
        : year > 1949 ? "1949 —"
        : `公元 ${year}`;
      this.tooltip.classList.add("on");
      this.tooltip.style.left = relX + "px";
      this.tooltip.textContent = inEra ? `${yLabel} · ${inEra.name}` : yLabel;
    });
    this.root.addEventListener("mouseleave", () => {
      this.hoverLine.style.display = "none";
      this.tooltip.classList.remove("on");
    });
  }

  _bindClick() {
    this.root.addEventListener("click", (e) => {
      const rect = this.svg.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const year = Y_MIN + pct * RANGE;
      const era = this.eras.find((er) => year >= er.start && year <= er.end);
      if (era) this.hooks.onJumpToEra?.(era.id);
    });
  }
}
