// 风格化坐标系下的几何工具（非地理投影：base-china viewBox 即用户空间）
export function polyToPath(poly) {
  return "M" + poly.map((p) => p.join(",")).join("L") + "Z";
}

export function centroid(poly) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0, n = poly.length; i < n; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % n];
    const cross = x1 * y2 - x2 * y1;
    a += cross; cx += (x1 + x2) * cross; cy += (y1 + y2) * cross;
  }
  if (Math.abs(a) < 1e-6) {
    const m = poly.reduce((s, p) => [s[0] + p[0], s[1] + p[1]], [0, 0]);
    return [m[0] / poly.length, m[1] / poly.length];
  }
  a *= 0.5;
  return [cx / (6 * a), cy / (6 * a)];
}

// 一组 cell 的视觉中心（用于放置政权名 / 选取『首要 cell』）
export function groupCentroid(cells) {
  let X = 0, Y = 0, A = 0;
  for (const c of cells) {
    const [cx, cy] = centroid(c.poly);
    const area = Math.abs(polyArea(c.poly));
    X += cx * area; Y += cy * area; A += area;
  }
  return A ? [X / A, Y / A] : [500, 500];
}

export function polyArea(poly) {
  let a = 0;
  for (let i = 0, n = poly.length; i < n; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % n];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

export const NS = "http://www.w3.org/2000/svg";
export function el(name, attrs = {}) {
  const n = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
}
