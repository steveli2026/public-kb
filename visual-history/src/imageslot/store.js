// 图位数据单一来源。编辑模式（本地服务在跑）→ 走 /api，可生成/挑版本/改 prompt；
// 否则（静态分享）→ 读 data/art-manifest.json，只读展示。
const MANIFEST_URL = new URL("../../data/art-manifest.json", import.meta.url);

class ArtStore {
  constructor() { this.edit = false; this.m = { slots: {}, styleByType: {} }; }

  async init() {
    if (isLocalEditorHost()) {
      try {
        const h = await fetch("/api/health", { signal: AbortSignal.timeout(1500) });
        this.edit = h.ok;
      } catch { this.edit = false; }
    }
    try {
      const r = await fetch(this.edit ? "/api/manifest" : MANIFEST_URL, { cache: "no-store" });
      this.m = await r.json();
    } catch { this.m = { slots: {}, styleByType: {} }; }
    return this;
  }

  slot(id) { return this.m.slots?.[id] || null; }
  selectedUrl(id) {
    const s = this.slot(id);
    return s?.selected || null;
  }

  async setPrompt(id, prompt) {
    const s = this.slot(id); if (s) { s.prompt = prompt; s.userEdited = true; }
    if (this.edit) await fetch("/api/prompt", post({ id, prompt }));
  }
  async select(id, file) {
    const s = this.slot(id); if (s) s.selected = file;
    if (this.edit) await fetch("/api/select", post({ id, file }));
  }
  async generate(id, { prompt, engine, useRef }) {
    const r = await fetch("/api/generate", post({ id, prompt, engine, useRef }));
    const d = await r.json();
    if (!r.ok || d.error) throw new Error(d.error || "生成失败");
    const s = this.slot(id);
    if (s) { s.versions = d.versions; s.selected = d.selected; }
    return d;
  }
}
function post(obj) {
  return { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(obj) };
}
function isLocalEditorHost() {
  return ["localhost", "127.0.0.1", "::1"].includes(location.hostname);
}
export const artStore = new ArtStore();
