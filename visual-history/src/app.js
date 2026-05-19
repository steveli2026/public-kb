// 装配：左缩略图 · 中叙事脊柱 · 右图位/详情；进度条；深链；全局图片预览。
import { loadAll } from "./data/loader.js";
import { Spine } from "./timeline/Spine.js";
import { artStore } from "./imageslot/store.js";
import { Minimap } from "./ui/Minimap.js";
import { lightbox } from "./ui/Lightbox.js";
import { RightRail } from "./right/RightRail.js";

const $ = (s) => document.querySelector(s);

(async function main() {
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

  const minimap = new Minimap($("#left-rail"), db, {
    onJump: (id) => spine.scrollToEra(id),
  });
  minimap.render();

  const right = new RightRail($("#right-rail"), db, {
    onNavigate: (id) => setHash(db.entityKind(id), id),
    onReturnToEra: () => { if (activeEra) replaceHash("era", activeEra); },
  });
  right.render();

  let activeEra = null;
  let activeEraObj = null;

  const spine = new Spine($("#spine"), db, {
    onActiveEra(eraId) {
      if (eraId === "__hero") return;
      const era = db.eras.find((e) => e.id === eraId);
      if (!era) return;
      activeEra = eraId;
      activeEraObj = era;
      minimap.setActive(eraId);
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
