// 装配：左缩略图（简略 / 详尽两态）· 中叙事脊柱 · 右图位/详情；进度条；深链；全局图片预览。
import { loadAll } from "./data/loader.js";
import { Spine } from "./timeline/Spine.js";
import { DetailedRail } from "./timeline/DetailedRail.js";
import { RailModeStore } from "./timeline/RailModeStore.js";
import { artStore } from "./imageslot/store.js";
import { Minimap } from "./ui/Minimap.js";
import { lightbox } from "./ui/Lightbox.js";
import { RightRail } from "./right/RightRail.js";

const $ = (s) => document.querySelector(s);

const ERA_THEMES = {
  sanhuang: ["#97876a", "#ece3d2", "#d9ccb1", "#c7b78e"],
  xia: ["#6f835f", "#e8e2cc", "#d7d3b7", "#b8c09b"],
  shang: ["#8a6f4a", "#efe0c6", "#dcc29a", "#a98555"],
  "western-zhou": ["#9c7b3f", "#eee2c8", "#d8c49d", "#b89556"],
  chunqiu: ["#667d52", "#e8e7cf", "#cad6b3", "#88a06a"],
  zhanguo: ["#8b4e3e", "#ece0d3", "#d9b8a8", "#b86b53"],
  qin: ["#3f4a5a", "#dfe2df", "#b9c1c4", "#596675"],
  chuhan: ["#8a5a8a", "#e8dce4", "#d2b6ca", "#8f6590"],
  "western-han": ["#b23a2f", "#eee0d3", "#ddb5a5", "#c65b45"],
  "eastern-han": ["#9f4b36", "#eadfd1", "#d7baa7", "#b76249"],
  sanguo: ["#4b6b8a", "#dfe6e7", "#b8c8d3", "#5e7f9c"],
  "western-jin": ["#6a5a8a", "#e5deea", "#c8bbd5", "#79699b"],
  shiliuguo: ["#7a5a45", "#e6ddd2", "#cdb8a2", "#8a684d"],
  nanbeichao: ["#5f6f83", "#e0e4e5", "#bac7cd", "#718399"],
  sui: ["#8a7a3f", "#eee6cb", "#d8ca92", "#9f8c48"],
  tang: ["#c0392b", "#f0ded0", "#dfb096", "#cf6047"],
  "tang-late": ["#9d3f2f", "#eadbd2", "#cfaa9b", "#a84a37"],
  "wudai-front": ["#6d5a42", "#e5ddd0", "#c8b9a0", "#7b664a"],
  "wudai-late": ["#5d6b58", "#e0e4d8", "#bcc9b6", "#6f8068"],
  "northern-song": ["#2f6b6b", "#dce9e6", "#a9c9c5", "#43827f"],
  "southern-song": ["#3f786a", "#dce9e2", "#accabe", "#4f8a7a"],
  yuan: ["#3f5a7a", "#dfe5eb", "#b5c4d2", "#536f90"],
  ming: ["#b23a4a", "#efe0df", "#dfb4ba", "#c75666"],
  qing: ["#5a7a8a", "#dfe8e8", "#b8cdd1", "#6a8e9f"],
  roc: ["#7a6b9a", "#e5e0ea", "#c7bed8", "#8878aa"],
  prc: ["#b22f2f", "#efe0d8", "#dfb0a0", "#c94f42"],
};

(async function main() {
  registerServiceWorker();

  let db;
  try {
    [db] = await Promise.all([loadAll(), artStore.init()]);
  } catch (err) {
    $("#spine").innerHTML =
      `<section class="hero"><h1>载入失败</h1>
       <p class="lede">请通过本地服务器打开（非 file://）：<br><code>npm run dev</code></p>
       <p style="color:var(--ink-faint)">${err.message}</p></section>`;
    console.error(err);
    return;
  }

  // 实体 → 所属 era（深链滚动定位）
  const entityEra = new Map();
  for (const era of db.eras) {
    for (const id of [...(era.keyPersonIds || []), ...(era.keyEventIds || []), ...(era.regimeIds || [])])
      if (!entityEra.has(id)) entityEra.set(id, era.id);
  }

  lightbox.init();

  let activeEra = null;

  // —— 左栏两态：简略 Minimap / 详尽 DetailedRail —— 由 RailModeStore 控制可见 + 宽度
  // DOM 顺序：DetailedRail (head 永远可见) → Minimap (作为简略态的列表 body)
  const railStore = new RailModeStore();

  const detailedRail = new DetailedRail($("#left-rail"), db, railStore, {
    onJumpToEra: (id) => spine.scrollToEra(id),
  });

  const minimap = new Minimap($("#left-rail"), db, {
    onJump: (id) => spine.scrollToEra(id),
  });
  minimap.render();

  // 同步 DOM 可见性 + grid 列宽 + 拖拽手柄状态
  function syncRailMode() {
    const eff = railStore.effective;
    document.body.dataset.railMode = eff;
    document.documentElement.style.setProperty("--rail-full-width", railStore.width + "px");
    minimap.setVisible(eff === "light");
    detailedRail.setVisible(eff === "full");
    // 详尽态首次进入时把当前 era 滚到 center
    if (eff === "full" && activeEra) {
      requestAnimationFrame(() => detailedRail.centerActive());
    }
  }
  railStore.subscribe(() => syncRailMode());
  syncRailMode();

  // —— 左边界拖拽（仅 ≥ 1100px） ——
  const railEl = $("#left-rail");
  const handle = document.createElement("div");
  handle.className = "rail-drag-handle";
  handle.title = "拖拽调整宽度";
  railEl.append(handle);
  bindDrag(handle, railStore, railEl);

  const right = new RightRail($("#right-rail"), db, {
    onNavigate: (id) => setHash(db.entityKind(id), id),
    onReturnToEra: () => { if (activeEra) replaceHash("era", activeEra); },
  });
  right.render();

  const spine = new Spine($("#spine"), db, {
    onActiveEra(eraId) {
      if (eraId === "__hero") return;
      const era = db.eras.find((e) => e.id === eraId);
      if (!era) return;
      activeEra = eraId;
      applyEraTheme(era);
      minimap.setActive(eraId);
      detailedRail.setActiveEra(eraId);
      right.setEra(era);
      if (right.mode === "era") replaceHash("era", eraId);
    },
    onHoverRegime: () => {},
    openEntity: (id) => right.showEntity(id),
  });
  spine.render();

  // 进度条
  const pbar = $(".progress > i");
  addEventListener("scroll", () => {
    const h = document.documentElement;
    const p = h.scrollTop / (h.scrollHeight - h.clientHeight || 1);
    pbar.style.setProperty("--p", (p * 100).toFixed(1) + "%");
  }, { passive: true });

  // 哈希深链：#person=huangchao / #event=anshi-zhiluan / #regime=houliang / #era=tang
  function setHash(kind, id) { location.hash = `${kind}=${id}`; }
  function replaceHash(kind, id) { history.replaceState(null, "", `#${kind}=${id}`); }

  function applyHash() {
    const m = /^#(\w+)=([\w-]+)$/.exec(location.hash);
    if (!m) return;
    const [, kind, id] = m;
    if (kind === "era") {
      spine.scrollToEra(id);
      if (right.mode === "entity") right.returnToEra();
    } else if (db.entityKind(id)) {
      const eid = entityEra.get(id);
      if (eid) spine.scrollToEra(eid);
      setTimeout(() => right.showEntity(id), 360);
    }
  }
  addEventListener("hashchange", () => applyHash());
  if (location.hash) setTimeout(applyHash, 280);

  // Esc：实体模式下退回当期
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && right.mode === "entity") right.returnToEra();
  });

  console.info("%c中国历史长卷 已就绪", "color:#b23a2f;font-weight:bold",
    `· ${db.eras.length} 个时期 · ${db.people.size} 人物 · ${db.events.size} 事件`);
})();

// 左栏右边界拖拽：实时 setWidthTransient，松手时 commitDrag 触发吸附 + 持久化
function bindDrag(handle, store, railEl) {
  let dragging = false;
  let startX = 0;
  let startW = 0;
  const onPointerDown = (e) => {
    if (innerWidth < 1100) return; // 移动端禁用
    dragging = true;
    startX = e.clientX;
    startW = railEl.getBoundingClientRect().width;
    handle.classList.add("on");
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
    handle.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!dragging) return;
    const w = startW + (e.clientX - startX);
    store.setWidthTransient(w);
    document.documentElement.style.setProperty("--rail-full-width", store.width + "px");
  };
  const onPointerUp = (e) => {
    if (!dragging) return;
    dragging = false;
    handle.classList.remove("on");
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    const w = startW + (e.clientX - startX);
    store.commitDrag(w);
  };
  handle.addEventListener("pointerdown", onPointerDown);
  handle.addEventListener("pointermove", onPointerMove);
  handle.addEventListener("pointerup", onPointerUp);
  handle.addEventListener("pointercancel", onPointerUp);
}

function applyEraTheme(era) {
  const [accent, paper, paper2, edge] = ERA_THEMES[era.id] || [era.color || "#b23a2f", "#ece3d2", "#e3d7bf", "#d8c8a6"];
  const root = document.documentElement;
  root.style.setProperty("--era-accent", accent);
  root.style.setProperty("--era-paper", paper);
  root.style.setProperty("--era-paper-2", paper2);
  root.style.setProperty("--era-edge", edge);
  document.body.dataset.era = era.id;
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  const isLocalhost = ["localhost", "127.0.0.1", "::1"].includes(location.hostname);
  if (location.protocol !== "https:" && !isLocalhost) return;

  addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("Service worker registration failed", err);
    });
  });
}
