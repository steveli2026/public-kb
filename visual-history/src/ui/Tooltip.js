// 悬停提示：地图 cell 与时间线节点共用
export class Tooltip {
  constructor(elId = "tooltip") {
    this.el = document.getElementById(elId);
  }
  show(html, x, y) {
    this.el.innerHTML = html;
    this.el.classList.add("show");
    this.move(x, y);
  }
  move(x, y) {
    const pad = 16, w = this.el.offsetWidth, h = this.el.offsetHeight;
    let nx = x + pad, ny = y + pad;
    if (nx + w > innerWidth) nx = x - w - pad;
    if (ny + h > innerHeight) ny = y - h - pad;
    this.el.style.left = Math.max(8, nx) + "px";
    this.el.style.top = Math.max(8, ny) + "px";
  }
  hide() { this.el.classList.remove("show"); }

  // 地图 cell 悬停内容：当前势力 + 该区在此刻的归属 + 并存
  forCell(db, cell, regimeId, era, allOwners) {
    const reg = regimeId && db.regime(regimeId);
    const others = allOwners.filter((r) => r !== regimeId).map((r) => db.regime(r)?.name).filter(Boolean);
    return `
      <b>${cell.name}</b> <span class="sub">· ${era?.name ?? ""}</span><br>
      ${reg ? `此时属 <b>${reg.name}</b>` : `<span class="sub">化外 / 未统</span>`}
      ${reg?.summary ? `<br><span class="sub">${reg.summary}</span>` : ""}
      ${others.length ? `<br><span class="sub">当时并立：${others.join("、")}</span>` : ""}`;
  }
}
