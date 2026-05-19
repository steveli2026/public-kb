// 统一图片放大预览 + 保存。document 级事件代理，点任何 <img> 即开。
//  - 关闭：Esc / 背景 / ✕
//  - 保存：原图同源直接下载（保留生成图原始文件名）
const HTML = `
<div class="lb-scrim"></div>
<div class="lb-frame">
  <img class="lb-img" alt="">
  <div class="lb-tools">
    <span class="lb-name"></span>
    <button class="lb-save" type="button">↓ 保存</button>
    <button class="lb-close" type="button" aria-label="关闭">✕</button>
  </div>
</div>`;

class Lightbox {
  init() {
    if (this._mounted) return;
    this._mounted = true;
    const root = document.createElement("div");
    root.className = "lightbox";
    root.innerHTML = HTML;
    document.body.append(root);
    this.root = root;
    this.img = root.querySelector(".lb-img");
    this.name = root.querySelector(".lb-name");
    const close = () => this.hide();
    root.querySelector(".lb-scrim").addEventListener("click", close);
    root.querySelector(".lb-close").addEventListener("click", close);
    root.querySelector(".lb-save").addEventListener("click", () => this._save());

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && root.classList.contains("on")) close();
    });
    // 全局图片点击：放大预览
    document.addEventListener("click", (e) => {
      const img = e.target.closest("img");
      if (!img) return;
      if (img.closest(".lightbox")) return;          // 别套娃
      if (img.dataset.noPreview === "1") return;     // 显式禁用
      const src = img.currentSrc || img.src;
      if (!src) return;
      e.preventDefault();
      this.show(src);
    }, true);
  }

  show(src) {
    if (!this._mounted) this.init();
    this.img.src = src;
    this.name.textContent = src.split("/").pop().split("?")[0];
    this.root.classList.add("on");
    document.documentElement.style.overflow = "hidden";
  }

  hide() {
    this.root.classList.remove("on");
    document.documentElement.style.overflow = "";
    this.img.src = "";
  }

  async _save() {
    const src = this.img.src;
    if (!src) return;
    try {
      const resp = await fetch(src);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = src.split("/").pop().split("?")[0] || "image.png";
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      // 兜底：直接以 href 触发下载
      const a = document.createElement("a");
      a.href = src; a.download = src.split("/").pop() || "image.png";
      document.body.append(a); a.click(); a.remove();
    }
  }
}

export const lightbox = new Lightbox();
