// 可复用图位：占位 / 选定图；编辑模式下带「垫图 + Prompt + 引擎 + 一键生成 + 多版本挑选」
import { artStore } from "./store.js";

const TYPE_LABEL = { portrait: "人物像", scene: "场景图", map: "地图", hero: "片头", texture: "纹理" };

export function ImageSlot(slotId, { aspect = "3 / 2", className = "" } = {}) {
  const root = document.createElement("div");
  root.className = "imgslot " + className;
  const slot = artStore.slot(slotId);

  const fig = document.createElement("div");
  fig.className = "imgslot-fig";
  fig.style.aspectRatio = aspect;
  root.append(fig);

  function paintImage() {
    const sel = artStore.selectedUrl(slotId);
    fig.innerHTML = "";
    if (sel) {
      const img = document.createElement("img");
      img.src = sel; img.alt = ""; img.loading = "lazy";
      fig.append(img);
    } else {
      const ph = document.createElement("div");
      ph.className = "imgslot-ph";
      ph.innerHTML = `<span>${TYPE_LABEL[slot?.type] || "配图"}</span><small>${slot ? "待生成" : "无此图位"}</small>`;
      fig.append(ph);
    }
  }
  paintImage();

  if (!slot || !artStore.edit) return root;

  // —— 编辑器 ——
  const ed = document.createElement("div");
  ed.className = "imgslot-ed";

  const ta = document.createElement("textarea");
  ta.className = "imgslot-prompt";
  ta.value = slot.prompt || "";
  ta.rows = 3;
  ta.spellcheck = false;
  ta.addEventListener("change", () => artStore.setPrompt(slotId, ta.value.trim()));

  const ctl = document.createElement("div");
  ctl.className = "imgslot-ctl";

  // 垫图开关（checkbox 与缩略图分离，缩略图独立可点开预览，不会误触开关）
  const refWrap = document.createElement("div");
  refWrap.className = "imgslot-ref";
  const lab = document.createElement("label");
  const refChk = document.createElement("input");
  refChk.type = "checkbox";
  refChk.checked = !!slot.ref;
  refChk.disabled = !slot.ref;
  lab.append(refChk, span(slot.ref ? "用垫图" : "无垫图"));
  refWrap.append(lab);
  if (slot.ref) {
    const thumb = document.createElement("img");
    thumb.className = "imgslot-ref-thumb";
    thumb.src = slot.ref; thumb.title = "点击预览垫图：" + slot.ref;
    refWrap.append(thumb);
  }

  // 引擎
  const eng = document.createElement("select");
  eng.className = "imgslot-eng";
  eng.innerHTML = `<option value="gemini">Gemini</option><option value="openai">OpenAI</option>`;
  eng.value = slot.engine || "gemini";

  // 一键生成
  const btn = document.createElement("button");
  btn.className = "imgslot-gen";
  btn.textContent = "一键生成";
  const status = document.createElement("span");
  status.className = "imgslot-status";

  btn.addEventListener("click", async () => {
    btn.disabled = true; const t0 = Date.now();
    status.textContent = "生成中…（首次较慢）";
    const tick = setInterval(() => (status.textContent = `生成中… ${((Date.now() - t0) / 1000) | 0}s`), 1000);
    try {
      await artStore.generate(slotId, { prompt: ta.value.trim(), engine: eng.value, useRef: refChk.checked });
      paintImage(); paintVersions();
      status.textContent = "✓ 完成";
    } catch (e) {
      status.textContent = "✗ " + e.message;
    } finally { clearInterval(tick); btn.disabled = false; }
  });

  ctl.append(refWrap, eng, btn, status);

  const vers = document.createElement("div");
  vers.className = "imgslot-versions";
  function paintVersions() {
    vers.innerHTML = "";
    const list = slot.versions || [];
    if (!list.length) return;
    const lab = document.createElement("small");
    lab.textContent = `版本（点选采用，共 ${list.length}）`;
    vers.append(lab);
    const strip = document.createElement("div");
    strip.className = "imgslot-strip";
    list.forEach((v, i) => {
      const c = document.createElement("button");
      c.className = "imgslot-v" + (v.file === slot.selected ? " on" : "");
      c.title = `v${i + 1} · ${v.engine}${v.usedRef ? " · 垫图" : ""}`;
      c.style.backgroundImage = `url(${v.file})`;
      c.addEventListener("click", async () => {
        await artStore.select(slotId, v.file);
        paintImage(); paintVersions();
      });
      strip.append(c);
    });
    vers.append(strip);
  }
  paintVersions();

  ed.append(ta, ctl, vers);
  root.append(ed);
  return root;
}

function span(t) { const s = document.createElement("span"); s.textContent = t; return s; }
