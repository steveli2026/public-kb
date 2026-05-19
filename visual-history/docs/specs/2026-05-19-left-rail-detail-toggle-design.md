# 左栏可切换详尽态设计

**日期：** 2026-05-19
**作者：** Claude + steveli
**状态：** 设计已确认，待写实施计划

---

## 0. 问题与目标

当前左栏（[`src/ui/Minimap.js`](../../src/ui/Minimap.js)）是扁平等高的时期列表——色块 + 序号 + 名字，每个 era 占一行，与实际时长无关。它扮演"目录索引"，没有承载时间维度的视觉信息。

升级目标：在保留现有索引功能的前提下，**新增一个详尽态**，把以下三个维度可视化：

1. **时间比例感** — 朝代实际时长一目了然（夏 470 年 vs 秦 14 年）
2. **同期并立感** — 三国、南北朝、五代十国/辽、宋/辽/西夏/金 等并立期能横向看到"同时谁还在"
3. **嵌套层级感** — 周→西周/东周→春秋/战国 这种父子结构

明确**不**追加的：kicker、tags、人物缩略等元信息——保持视觉清爽，符合项目"文字轻"的调性。

## 1. 核心设计决策

| 决策点 | 结论 | 反直觉/取舍说明 |
|---|---|---|
| 详尽态骨架 | **章节式脊柱 + 顶部鸟瞰条**（双组件） | 拒绝维基那种密集格子表——"宏观比例感"和"微观导航对齐"是两件事，应该分两个组件做 |
| 脊柱高度对齐 | **章节式均匀**（每个 era 行高近似） | 不严格按公元年份对齐；严格对齐会导致左栏与 spine 主滚动双向拉扯 |
| 比例感的载体 | ①顶部鸟瞰条（公元年份线性） + ②每行小时长条（归一化） | 两层比例尺：一把客观（年份），一把相对（章节内） |
| 交互模式 | **Toggle 离散两态 + 拖拽无极微调**，两者共存 | Toggle 给意图，拖拽给自由；中间宽度（230–420）不存在，自动吸附 |
| 右栏在详尽态的命运 | **跟随左栏点击自动 reset 为 era 预览**（保持现有行为） | 不收成薄边；右栏是任何模式下都跟随的预览器，不仅服务于"沉浸阅读" |
| 移动端 | **强制简略态**，Toggle/拖拽手柄隐藏 | 详尽态价值在横向比例，<420px 宽时无法表达 |

## 2. 两态规格

### 2.1 简略态（Light，默认）

- 沿用现状，零改动到视觉
- 宽度：`clamp(180px, 16vw, 230px)`
- 内容：垂直列表，色块 + 序号 + 名字（[`Minimap.js`](../../src/ui/Minimap.js)）
- 当前 era 高亮 + 自动 `scrollIntoView`

### 2.2 详尽态（Full）

- 宽度：`clamp(420px, 32vw, 560px)`，默认 480px
- 从上到下三个组件：
  1. **顶部工具区**（高 ~44px）：Toggle 胶囊开关 `简略 │ 详尽` + 拖拽手柄提示
  2. **鸟瞰条**（高 36px）：公元年份线性映射，详见 §4
  3. **嵌套脊柱**（撑满剩余高度，自动滚动）：详见 §3

### 2.3 切换交互

- **Toggle 点击**：宽度过渡到对面态（280ms cubic-bezier）
- **拖拽右边界**：3px 命中区 + 8px hover 手柄，pointer events
- **吸附逻辑**（三段阈值）：
  - 松手时 ≤ 320px → 吸附到简略（230px）
  - 松手时 320–420px → 吸附到详尽下限（420px，跨过"死区"）
  - 松手时 420–560px → 保留实际拖拽宽度
  - 松手时 > 560px → 吸附到详尽上限（560px）
  - "死区"230–420 之间没有稳定态，避免半生不熟的中间宽度
- **持久化**：`localStorage.kbHistoryRail = "light" | "full"`，详尽态宽度单独存 `kbHistoryRailWidth`
- **同步联动**：宽度变化时，中栏和右栏自动按 §5 表格的比例响应

## 3. 详尽态脊柱（族谱视觉）

### 3.1 视觉模型

```
┌────────────────────────────────────────┐
│ [时间线 · 中国通史]      [简略│详尽]  │
├────────────────────────────────────────┤
│ ▰▱▱▰▰▱▰▰▰▱▱▱▰▰▱▱▱▰▰▰▰▰▰▰▰  │ 鸟瞰条
├────────────────────────────────────────┤
│ ● 三皇五帝 · 传说时代          ▬▬     │
│ ● 夏                           ▬▬▬▬   │
│ ● 商                           ▬▬▬▬▬  │
│ ┃                                      │
│ ┣ 西周                         ▬▬▬    │
│ ┃ ┃ 东周                              │
│ ┃ ┣ 春秋                       ▬▬     │
│ ┃ ┗ 战国                       ▬▬     │
│ ● 秦                           ▎       │
│ ● 楚汉相争                     ·       │
│ ┃ 汉                                   │
│ ┣ 西汉·新莽                    ▬▬▬    │
│ ┗ 东汉                         ▬▬     │
│ ┃ 三国 (220–280)                       │
│ ┣ 曹魏                         ▬       │ ← 并立支线
│ ┣ 蜀汉                         ▎       │
│ ┗ 孙吴                         ▬▬      │
│ ...                                    │
└────────────────────────────────────────┘
```

### 3.2 三个视觉机制

1. **族谱竖条**（`┃┣┗`）= 嵌套层级
   - 单独 era 用 `●` 圆点起头
   - 有父级的用竖条挂在父级标签下方
   - 最深 3 层（周→东周→春秋/战国）
   - 用 CSS Grid + 伪元素画，不用 SVG

2. **并立支线**（三国/南北朝/五代十国-辽/宋-辽-西夏-金）
   - 触发条件：`era.regimeIds.length >= 2`
   - 该 era 行下展开 N 个并排小支线，每行 = 一个政权
   - 数据来源：`regimes.json`（已有 start/end/color）
   - 未点亮支线：35% alpha 灰度；hover 上色

3. **小时长条** = 章节内比例提示
   - 宽度 = `(era.end - era.start) / maxDuration × 120px`
   - 最长（夏 470 年）撑满；最短（楚汉 4 年）退成圆点
   - 颜色 = era 自己的颜色 60% alpha

### 3.3 当前 era 高亮

- 行底色 `var(--paper-2)` + 字色加深
- 族谱竖条左侧加一根 2px 金色辅助线
- 同步：spine 滚动触发 `IntersectionObserver` → 当前 era 行自动 `scrollIntoView({ block: "nearest" })`

## 4. 鸟瞰条（顶部 36px）

### 4.1 数据映射

- X 轴：`x = (year − (−2700)) / (1949 − (−2700)) × width` ≈ 4649 年线性
- 每个 era 一段，颜色 = `era.color` 80% alpha
- 相邻段之间 1px 间隙（paper-edge 色）
- 并立期在 era 段**上方**叠加 2–4px 高的小段（每个 regime 一条）

### 4.2 交互

- Hover 任意位置 → tooltip 显示该位置对应的年份 + 所在 era
- 点击/拖动 → 跳转 spine 到对应 era（`spine.scrollToEra(eraId)`）
- 当前 era 游标：1.5px 宽金色竖线 + 6px 发光，覆盖在对应 era 段顶端
- 游标位置随主滚动联动（消费同一个 `onActiveEra` 事件）

### 4.3 技术选型

- 用 **SVG**（不用 canvas）：~26 个 era 段 + 若干 regime 子段 + 游标，元素数 < 100，SVG 更易做 hover/click/tooltip 且无需 ResizeObserver 重绘

## 5. 三栏宽度联动

按 1440px 视口测算（其他视口同比例缩放）：

| 模式 | 左栏 | 中栏 spine | 右栏 |
|---|---|---|---|
| 简略 | 230 | ~810 | 400 |
| 详尽 | 480 | ~640 | 320 |

**变化分配**（左栏+250）：
- 右栏小幅收紧 400→320（`26vw → 22vw`）：地图缩略 + 配图 + tag 仍能装下
- 中栏让 170：cols 区域两列在 640 仍稳（塌成单列阈值约 560）

**为什么不是只缩中栏**：250px 全压到中栏会让叙事 spine 的 chip 行频繁换行；让右栏分担一点，三栏一起"呼吸"，过渡视觉更连贯。

**为什么不是收成薄边**：右栏是 era 预览器（地图 + 图位 + tag），跟随左栏/spine 切换而 reset。把它收掉等于在用户最依赖预览来决定下一站时把灯关掉，破坏导航三角的一致性。

## 6. 数据层补丁

### 6.1 eras.json 新增字段

```json
{
  "id": "western-zhou",
  "parentLabel": "周",
  "parentDepth": 1,
  ...
}
```

- `parentLabel` 字符串 | null：父级朝代名，顶层为 null
- `parentDepth` number：嵌套层数（0/1/2）

### 6.2 全表父级映射

| 顶层 (0) | 二层 (1) | 三层 (2) |
|---|---|---|
| sanhuang, xia, shang | — | — |
| zhou (虚拟父，无对应 era 行) | western-zhou | — |
| zhou | dongzhou (虚拟父) | chunqiu, zhanguo |
| qin, chuhan | — | — |
| han (虚拟父) | western-han, eastern-han | — |
| sanguo (auto-expand regimes) | — | — |
| jin (虚拟父) | western-jin, shiliuguo | — |
| nanbeichao (auto-expand), sui | — | — |
| tang (虚拟父) | tang, tang-late | — |
| wudai (虚拟父, auto-expand) | wudai-front, wudai-late | — |
| song (虚拟父) | northern-song, southern-song | — |
| yuan, ming, qing, roc, prc | — | — |

**关于"虚拟父"：** 周/汉/晋/唐/宋这些没有对应 era 行的父级，由前端从 eras 推导生成（凡有 ≥2 个 era 共享相同 `parentLabel`，就生成一个不可点击的父级标签行）。这样数据保持纯净，不引入新的"伪 era"。

### 6.3 并立支线

无需新字段——脊柱组件直接读 `era.regimeIds`，长度 ≥ 2 即展开为并立支线。

## 7. 视觉/技术细节

### 7.1 配色（沿用 styles/tokens.css）

- 族谱竖条：父级 era 颜色 30% alpha
- 时长条：era 自身颜色 60% alpha，圆角
- 鸟瞰条段：原色 80% alpha
- 当前游标：`var(--gold)` + 6px 发光
- 未点亮并立支线：grayscale + 35% alpha，hover 复原

### 7.2 动画

- Toggle 切换：`grid-template-columns` 过渡 280ms `cubic-bezier(.4,0,.2,1)`
- 左栏内组件 cross-fade 200ms（鸟瞰条淡入 + Minimap 列表淡出）
- 鸟瞰条游标：`transform: translateX()` + `transition: transform 180ms ease-out`
- 拖拽手柄：拖动时**不**用 transition（实时跟手），松手吸附用 transition

### 7.3 性能与可访问性

- Toggle 用 `<button aria-pressed>`，键盘可达
- 拖拽手柄用 pointer events（鼠标 + 触控板 + 触控笔统一）
- 鸟瞰条点击区域用 `<rect>` 元素，每个 era 一个，避免坐标计算
- `prefers-reduced-motion` 时取消所有过渡动画（沿用 layout.css 既有规则）

### 7.4 移动端断点

- `< 1100px`：强制简略态，Toggle 和拖拽手柄都隐藏
- 沿用现有的"三栏 → 单列堆叠"布局，无新规则

## 8. 文件清单

**新建：**
- `src/timeline/RailModeStore.js` — 状态机：mode + width + localStorage
- `src/timeline/DetailedRail.js` — 详尽态主组件（脊柱）
- `src/timeline/OverviewBar.js` — 鸟瞰条 SVG 组件

**改动：**
- `src/ui/Minimap.js` — 加 `_onModeChange()` 在 mode=full 时隐藏自身
- `src/app.js` — 装配 RailModeStore，联动右栏宽度
- `src/data/loader.js` — 解析 parentLabel/parentDepth，生成 `db.hierarchy`
- `data/eras.json` — 给 26 条记录加 parentLabel/parentDepth
- `styles/layout.css` — 详尽态 `grid-template-columns` + 拖拽手柄 + 移动端隐藏
- `styles/components.css` — 详尽态所有视觉（脊柱族谱条、时长条、鸟瞰条、Toggle）

## 9. 测试与验收

**可视化验证：**
- [ ] 简略态视觉与改造前一致（回归保护）
- [ ] Toggle 切换 280ms 平滑，无布局跳动
- [ ] 拖拽至 ≤320 自动吸附到简略；>320 进入详尽
- [ ] 详尽态鸟瞰条：上古段宽（夏/商）一眼可见，秦/楚汉是细线
- [ ] 详尽态脊柱：周/汉/晋/唐/宋有父级标签 + 族谱竖条；三国/南北朝/五代展开并立支线
- [ ] 当前 era 在脊柱和鸟瞰条上都有视觉标记，随 spine 滚动联动
- [ ] 右栏在详尽态下跟随左栏点击自动 reset 到 era 预览（保持现有行为）
- [ ] 刷新页面：localStorage 记住的 mode 和宽度恢复

**响应式：**
- [ ] < 1100px：Toggle/拖拽隐藏，强制简略态
- [ ] 1100–1440px：详尽态宽度自动收敛到 420–480 区间
- [ ] ≥ 1440px：详尽态可拖到 560 上限

**可访问性：**
- [ ] Toggle 键盘可达，`aria-pressed` 状态正确
- [ ] `prefers-reduced-motion` 下所有过渡动画被禁用
- [ ] 鸟瞰条 tooltip 在键盘焦点下也出现（focus + hover 等价）
