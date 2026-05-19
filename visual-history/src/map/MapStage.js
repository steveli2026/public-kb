// 左侧常驻画面：当前时期的静态配图（图位）+ 字幕（时期/年代/并立势力）。
// 已按需求移除矢量 cell / 高光 / 聚光 / 地图 tooltip —— 纯静态展示。
import { ImageSlot } from "../imageslot/ImageSlot.js";
import { artStore } from "../imageslot/store.js";

export class MapStage {
  constructor(container, db) {
    this.db = db;
    this.container = container;
    this.activeEra = null;
  }

  render() {
    // 顺序：Minimap(已由 app.js 在前面挂上) → header → 图位（左下大块）
    const cap = document.createElement("div");
    cap.className = "map-header";
    cap.innerHTML = `<div><div class="era" id="cap-era">中国历史长卷</div><div class="yr" id="cap-yr">三皇五帝 → 1949</div></div><div class="powers" id="cap-powers">向下滚动，长卷展开</div>`;
    this.stage = document.createElement("div");
    this.stage.className = "mapstage";
    this.container.append(cap, this.stage);
    this.cap = cap;
    this._mount("map");
  }

  _mount(slotId) {
    this.stage.replaceChildren(ImageSlot(slotId, { aspect: "3 / 2", className: "mapstage-slot" }));
  }

  // 滚动到某时期：优先用该时期专属配图，没有则回退整体底图
  setSnapshot(_snapshotId, era) {
    if (!era || era.id === this.activeEra) return;
    this.activeEra = era.id;

    const eraSlot = `era:${era.id}`;
    const useEra = artStore.selectedUrl(eraSlot);
    const fallback = artStore.selectedUrl("map");
    // 编辑模式下始终显示该时期图位（便于逐个生成）；只读模式无图则回退底图
    this._mount(artStore.edit ? eraSlot : (useEra ? eraSlot : (fallback ? "map" : eraSlot)));

    const segs = this.db.snapshots[era.snapshot] || [];
    const powers = [...new Set(segs.map((s) => s.r))]
      .map((r) => this.db.regime(r)?.name).filter(Boolean);
    this.cap.querySelector("#cap-era").textContent = era.name;
    this.cap.querySelector("#cap-yr").textContent = era.years || "";
    this.cap.querySelector("#cap-powers").innerHTML =
      powers.length > 1 ? `当时天下并立：${powers.join(" · ")}` : (era.kicker || "");
  }
}
