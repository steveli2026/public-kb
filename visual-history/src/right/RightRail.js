// 右栏「替换式」单卡片：默认 = 当期图位 + 上下文；点选实体 → 详情；可返回。
import { ImageSlot } from "../imageslot/ImageSlot.js";
import { DetailPanel } from "../detail/DetailPanel.js";

export class RightRail {
  constructor(container, db, hooks = {}) {
    this.db = db;
    this.container = container;
    this.hooks = hooks;                 // { onNavigate(id), onReturnToEra() }
    this.mode = "era";                  // "era" | "entity"
    this.activeEra = null;
  }

  render() {
    this.container.innerHTML = `
      <header class="rr-head" id="rr-head"></header>
      <div class="rr-body" id="rr-body"></div>`;
    this.head = this.container.querySelector("#rr-head");
    this.body = this.container.querySelector("#rr-body");
    this.detail = new DetailPanel(this.db, this.body, {
      onNavigate: (id) => this.hooks.onNavigate?.(id),
    });
    this._renderEra(null);             // 初始占位
  }

  setEra(era) {
    this.activeEra = era;
    if (this.mode === "era") this._renderEra(era);
    else this._setBackTo(era);         // 实体模式下，只更新顶栏「返回到当期」的标签
  }

  showEntity(id) {
    if (!this.db.entityKind(id)) return;
    this.mode = "entity";
    this._renderEntityHead(id);
    this.detail.render(id);
  }

  returnToEra() {
    this.mode = "era";
    this.detail.clear();
    this._renderEra(this.activeEra);
    this.hooks.onReturnToEra?.();
  }

  // —— 头部 ——
  _renderEra(era) {
    if (!era) {
      this.head.innerHTML = `<div class="rr-kicker">右栏 · 当期</div><h3 class="rr-title">中国历史长卷</h3>`;
      this._renderEraBody(null);
      return;
    }
    const segs = this.db.snapshots[era.snapshot] || [];
    const powers = [...new Set(segs.map((s) => s.r))]
      .map((r) => this.db.regime(r)?.name).filter(Boolean);
    this.head.innerHTML = `
      <div class="rr-kicker">${era.kicker || "时期"}</div>
      <h3 class="rr-title">${era.name}</h3>
      <div class="rr-meta"><span class="rr-yr">${era.years || ""}</span></div>
      ${powers.length > 1
        ? `<div class="rr-powers"><b>当时天下并立</b>${powers.join(" · ")}</div>`
        : ""}`;
    this._renderEraBody(era);
  }

  _renderEraBody(era) {
    this.body.innerHTML = "";
    const map = era ? this.db.eraMap(era.id) : null;
    if (map) this.body.append(this._mapCard(map));

    const slotId = era ? `era:${era.id}` : "map";
    this.body.append(ImageSlot(slotId, { aspect: "3 / 2", className: "rr-art" }));
    if (era?.tags?.length) {
      const row = document.createElement("div");
      row.className = "rr-tagrow";
      row.innerHTML = era.tags.map((t) => `<span class="era-tag">${t}</span>`).join("");
      this.body.append(row);
    }
  }

  _mapCard(map) {
    const fig = document.createElement("figure");
    fig.className = "era-map";

    const img = document.createElement("img");
    img.src = map.src;
    img.alt = map.title || "朝代地图";
    img.loading = "lazy";
    fig.append(img);

    const cap = document.createElement("figcaption");
    const title = document.createElement("b");
    title.textContent = map.title || "朝代地图";
    const text = document.createElement("span");
    text.textContent = map.caption ? ` ${map.caption}` : "";
    const source = document.createElement("a");
    source.href = map.sourceUrl;
    source.target = "_blank";
    source.rel = "noreferrer";
    source.textContent = `${map.attribution || "Source"} · ${map.license || "license"}`;
    cap.append(title, text, source);
    fig.append(cap);
    return fig;
  }

  _renderEntityHead(id) {
    const back = document.createElement("button");
    back.type = "button";
    back.className = "rr-back";
    back.textContent = `← 返回当期 · ${this.activeEra?.name || ""}`;
    back.addEventListener("click", () => this.returnToEra());
    this.head.innerHTML = "";
    this.head.append(back);
  }

  _setBackTo(era) {
    const back = this.head.querySelector(".rr-back");
    if (back && era) back.textContent = `← 返回当期 · ${era.name}`;
  }
}
