// 左栏模式状态机：light / full + 详尽态宽度。
// localStorage 持久化；订阅式；视口断点决定 effective 值。
const LS_MODE  = "kbHistoryRail";       // "light" | "full"
const LS_WIDTH = "kbHistoryRailWidth";  // 420..560

const WIDTH_MIN = 420;
const WIDTH_MAX = 560;
const WIDTH_DEFAULT = 480;
const LIGHT_WIDTH = 230;       // simple-mode reference (clamp 在 layout.css 里也会卡)
const SNAP_THRESHOLD = 320;    // 拖到 ≤ 320 吸附到 light；> 320 吸附到 full(>=420)
const VIEWPORT_BREAKPOINT = 1100; // < 此值强制 light

export class RailModeStore {
  constructor() {
    this.mode  = readLS(LS_MODE) === "full" ? "full" : "light";
    this.width = clamp(parseInt(readLS(LS_WIDTH), 10) || WIDTH_DEFAULT, WIDTH_MIN, WIDTH_MAX);
    this._listeners = new Set();
    this._onResize = () => this._notify("viewport");
    addEventListener("resize", this._onResize, { passive: true });
  }

  /** effective mode 考虑视口断点：< 1100px 强制 light（不擦 localStorage） */
  get effective() {
    return innerWidth < VIEWPORT_BREAKPOINT ? "light" : this.mode;
  }

  /** 实际渲染宽度（px）：light 用 layout.css clamp 决定，这里返回详尽态宽度 */
  get effectiveWidth() {
    return this.effective === "full" ? this.width : LIGHT_WIDTH;
  }

  setMode(mode) {
    if (mode !== "light" && mode !== "full") return;
    if (mode === this.mode) return;
    this.mode = mode;
    writeLS(LS_MODE, mode);
    this._notify("mode");
  }

  toggle() {
    this.setMode(this.mode === "full" ? "light" : "full");
  }

  /** 拖拽过程中实时调用（不持久化） */
  setWidthTransient(px) {
    this.width = clamp(px, WIDTH_MIN, WIDTH_MAX);
    this._notify("width-transient");
  }

  /** 松手时调用：按阈值吸附到 light/full，并持久化 */
  commitDrag(px) {
    if (px <= SNAP_THRESHOLD) {
      this.setMode("light");
      // width 不变，下次切回 full 时仍是之前的 width
    } else if (px < WIDTH_MIN) {
      // 跨过 320–420 死区 → 吸到 full 下限
      this.width = WIDTH_MIN;
      writeLS(LS_WIDTH, String(this.width));
      this.setMode("full");
      this._notify("width");
    } else {
      this.width = clamp(px, WIDTH_MIN, WIDTH_MAX);
      writeLS(LS_WIDTH, String(this.width));
      this.setMode("full");
      this._notify("width");
    }
  }

  subscribe(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  _notify(reason) {
    for (const fn of this._listeners) fn(this, reason);
  }

  dispose() {
    removeEventListener("resize", this._onResize);
    this._listeners.clear();
  }
}

function readLS(k)        { try { return localStorage.getItem(k); } catch { return null; } }
function writeLS(k, v)    { try { localStorage.setItem(k, v); } catch {} }
function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }
