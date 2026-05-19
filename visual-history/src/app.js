// 装配：数据 → 静态画面 + 脊柱 + 详情 + 进度 + 哈希深链
import { loadAll } from "./data/loader.js";
import { MapStage } from "./map/MapStage.js";
import { Spine } from "./timeline/Spine.js";
import { DetailPanel } from "./detail/DetailPanel.js";
import { artStore } from "./imageslot/store.js";
import { Minimap } from "./ui/Minimap.js";
import { lightbox } from "./ui/Lightbox.js";

const $ = (s) => document.querySelector(s);

(async function main() {
  let db;
  try {
    [db] = await Promise.all([loadAll(), artStore.init()]);
  } catch (err) {
    $("#spine").innerHTML =
      `<section class="hero"><h1>载入失败</h1>
       <p class="lede">请通过本地服务器打开（非 file://）：<br><code>npm run dev</code> 然后访问 http://localhost:5173</p>
       <p style="color:var(--ink-faint)">${err.message}</p></section>`;
    console.error(err);
    return;
  }

  // 实体 → 所属 era（用于深链滚动定位）
  const entityEra = new Map();
  for (const era of db.eras) {
    for (const id of [...(era.keyPersonIds || []), ...(era.keyEventIds || []), ...(era.regimeIds || [])])
      if (!entityEra.has(id)) entityEra.set(id, era.id);
  }

  lightbox.init();

  const minimap = new Minimap($("#map-pane"), db, {
    onJump: (id) => spine.scrollToEra(id),
  });
  minimap.render();

  const map = new MapStage($("#map-pane"), db);
  map.render();

  const detail = new DetailPanel(db, {
    onNavigate: (id) => setHash(db.entityKind(id), id),
    onClose: () => { if (activeEra) setHash("era", activeEra); },
  });

  let activeEra = null;

  const spine = new Spine($("#spine"), db, {
    onActiveEra(eraId, elSec) {
      if (eraId === "__hero") return;
      const era = db.eras.find((e) => e.id === eraId);
      if (era) {
        activeEra = eraId;
        if (era.snapshot) map.setSnapshot(era.snapshot, era);
        minimap.setActive(eraId);
        if (!detail.current) replaceHash("era", eraId);
      }
    },
    onHoverRegime: () => {},
    openEntity: (id) => detail.open(id),
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
  function replaceHash(kind, id) {
    history.replaceState(null, "", `#${kind}=${id}`);
  }
  function applyHash() {
    const m = /^#(\w+)=([\w-]+)$/.exec(location.hash);
    if (!m) return;
    const [, kind, id] = m;
    if (kind === "era") {
      spine.scrollToEra(id);
    } else if (db.entityKind(id)) {
      const eid = entityEra.get(id);
      if (eid) spine.scrollToEra(eid);
      setTimeout(() => detail.open(id), 420);
    }
  }
  addEventListener("hashchange", () => { if (!detail.current) applyHash(); });
  if (location.hash) setTimeout(applyHash, 300);

  console.info("%c中国历史长卷 已就绪", "color:#b23a2f;font-weight:bold",
    `· ${db.eras.length} 个时期 · ${db.people.size} 人物 · ${db.events.size} 事件`);
})();
