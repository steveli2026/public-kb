# 中国历史长卷 · 三皇五帝 → 1949

一卷可滚动的中国通史。左侧常驻矢量地图随时代演变，右侧故事化时间线把人物与事件彼此勾连——例如写下「我花开后百花杀」的**黄巢**，与亲手葬送大唐的降将**朱温**。

## 运行

```bash
npm run dev          # http://localhost:5173 （静态服务器，勿用 file://）
npm run validate     # 数据交叉引用完整性校验
```

部署：纯静态，`vercel deploy`（已带 `vercel.json`）或任意静态托管。

## 结构

| 路径 | 作用 |
|---|---|
| `index.html` `styles/` | 入口与设计系统（水墨·绢本） |
| `src/data/loader.js` | 加载 / 索引 / 交叉引用解析 / 完整性校验；`linkify` 解析 `[[id]]` |
| `src/map/` | `MapStage` 渲染地图，`effects` 辉光/都城脉冲，`projection` 几何 |
| `src/timeline/Spine.js` | 滚动脊柱 + IntersectionObserver 联动地图 |
| `src/detail/DetailPanel.js` | 详情抽屉，交叉链可点跳转 |
| `data/*.json` | 内容数据（见下） |
| `tools/geo-author.html` | 描多边形/导出 cell，渐进精修地图 |

## 数据模型（渐进填充）

- `eras.json` — 时期树（含 `summary` 故事化概览、`story` 用 `[[id]]` 串联实体）
- `regimes.json` `people.json` `events.json` — 政权 / 人物 / 事件；`people.relations` 即人物互链图（双向解析）
- `geo/base-china.json` — 风格化区域 `cell`（非精确地理）
- `geo/snapshots.json` — 每时期把 `cell` 指派给政权 → 着色渐变即「疆域演变」
- `art-manifest.json` — AI 配图占位（填 `src` 即自动显示）

**加内容**：编辑对应 JSON；id 交叉引用自动成链。`npm run validate` 守护完整性。

## 图位工具（每个需要图的位置 = 一个可复用图位）

`npm run dev`（= `node scripts/server.mjs`）启动后即「编辑模式」：每个图位旁有
**Prompt 框 + 垫图开关 + 引擎选择(OpenAI/Gemini) + 一键生成 + 多版本挑选**。
点「一键生成」由你触发；生成图存 `assets/art/<slot>/vN-*.png`，可生成多次挑一个采用。
分享出去（静态托管/无本地服务）则自动只读：朋友只看选定图或占位，无编辑器、不暴露密钥。

```bash
npm run art:manifest   # 由 eras/people/events/regimes 刷新 258 个图位与预填 prompt（保留已生成成果）
npm run art:refs       # 从 Wikimedia 拉取 curated 垫图到 assets/ref/，写入 manifest.ref
```

- 密钥放 `.env`（`openai_api_key` / `gemini_api_key`，已 gitignore，仅服务端读取）
- prompt 为「主体」，服务端按 `type` 追加统一风格后缀（`art-manifest.json` 的 `styleByType`）
- 路由：可在每个图位下拉里选 OpenAI（含 `/images/edits` 垫图）或 Gemini
- 底层管线 `scripts/imagegen/`（学自 `ancher/ancher-imagecraft`，原始 fetch 无 SDK）；
  API：`/api/health|manifest|generate|select|prompt`

地图按需求**已改为静态展示**（移除矢量高光/聚光/tooltip）：左侧随时代显示该时期的场景图位（无则回退整体底图），右侧叙事不变。

## v1 范围

- ✅ 全时间轴骨架（26 时期，含五代十国前/后期等冷门并存期）+ 故事化概览 + 关键事件/人物 + 人物互链 + 深链分享（`#person=huangchao`）
- ✅ 可复用「垫图+Prompt→一键生成」图位工具，258 个位置 prompt 预填、多版本本地保存、双引擎
- ⏳ 后续：你按需逐个/批量点生成、挑版本；详情逐步加厚；如需再做地图高光可另起
