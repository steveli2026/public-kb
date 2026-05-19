// 复用视觉特效：辉光滤镜、都城脉冲信标、行军蚁边界
import { el } from "./projection.js";

// 注入一次：bloom 辉光 + 纸纹
export function injectDefs(svg) {
  const defs = el("defs");
  defs.innerHTML = `
    <filter id="bloom" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="6" result="b"/>
      <feFlood flood-color="#ffdf8e" flood-opacity="0.9" result="c"/>
      <feComposite in="c" in2="b" operator="in" result="g"/>
      <feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="paper">
      <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="2" seed="7" result="n"/>
      <feColorMatrix in="n" type="matrix"
        values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.06 0.06"/>
      <feComposite operator="over" in2="SourceGraphic"/>
    </filter>
    <radialGradient id="capGlow">
      <stop offset="0%" stop-color="#b23a2f" stop-opacity="0.55"/>
      <stop offset="70%" stop-color="#b23a2f" stop-opacity="0"/>
    </radialGradient>`;
  svg.append(defs);
}

// 都城信标：外环呼吸 + 实心点
export function makeCapital(x, y) {
  const g = el("g", { class: "capital", transform: `translate(${x} ${y})` });
  const halo = el("circle", { r: 26, fill: "url(#capGlow)" });
  const ring = el("circle", { class: "ring", r: 7, "stroke-width": 1.6, opacity: 0.9 });
  const core = el("circle", { class: "core", r: 3.4 });
  const pulse = el("circle", { class: "ring", r: 7, "stroke-width": 1.4 });
  const anim = `
    <animate attributeName="r" values="7;20" dur="2.4s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0.7;0" dur="2.4s" repeatCount="indefinite"/>`;
  pulse.innerHTML = anim;
  g.append(halo, pulse, ring, core);
  return g;
}

// 行军蚁高亮边界（hover/选中政权时叠加）
export function marchingBorder(d) {
  const p = el("path", {
    d, fill: "none", stroke: "#fff7df", "stroke-width": 2.4,
    "stroke-dasharray": "10 7", "stroke-linecap": "round",
    "pointer-events": "none", filter: "url(#bloom)",
  });
  p.innerHTML = `<animate attributeName="stroke-dashoffset" from="34" to="0" dur="0.9s" repeatCount="indefinite"/>`;
  return p;
}
