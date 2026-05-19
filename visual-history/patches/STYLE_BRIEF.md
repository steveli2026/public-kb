# Visual-History 深挖 · Agent 工作 Brief（所有 A1–A8 共用）

> 这是中国通史长卷可视化项目的一次集中内容深挖。你的任务不是「写一遍维基」，而是**用故事和人物把每个朝代撑厚到有质感**。

---

## 0. 你的产出 = 唯一一个 JSON 文件

把所有产出写入 **`patches/<你的 agentId>.json`**（如 `patches/A3.json`），格式见 §4。
**不要直接修改** `data/eras.json` / `data/people.json` / `data/events.json` —— 主 agent 合并时会处理。

---

## 1. 风格守则（硬性约束，每一句都按这个写）

1. **中文**。
2. **每句话信息密度高**，不啰嗦，不堆砌「丰功伟绩」式的官方语言。
3. **「耐人寻味」优先于平铺史实**：反讽、因果、命运、错位、悖论是首选钩子。
   - 反例：「李斯，秦丞相，参与统一文字、制定郡县。」
   - 正例：「李斯助统一、定郡县、主焚书；却在沙丘之谋拥立胡亥，最终被赵高腰斩咸阳——制造帝国制度的人，死于他亲手扶起的帝国。」
4. **用人物命运串联宏观**。不要罗列事件——把人物的选择、错位、报应当成读者的钩子。
5. **长度上限（务必遵守）**：
   - 单条 `bio` ≤ 3 句，每句 ≤ 35 字
   - 单条 `narrative` ≤ 2 句
   - 单条 `storylet.body` ≤ 4 句，每句 ≤ 40 字
6. **优先使用 `[[id]]` 互链**：在 bio / narrative / storylet.body 中，凡是提到本项目已有或你新增的人物/事件/政权，**一律写成 `[[id]]`**（loader 会自动渲染为可点链接）。
7. **避免现代政治判断**。只讲故事和因果，不下"好坏"结论。
8. **「耳熟能详」优先**（用户硬要求）：storylet / 新人物 / 新事件，**优先选择中小学历史课本、影视剧、成语典故里大家都听过的**——卧薪尝胆、负荆请罪、空城计、淝水之战、玄武门、马嵬坡、靖康北狩、土木堡、扬州十日、戊戌六君子……这种。不要为了凑数塞冷门的（如不要写"贺若弼麦铁杖"而宁可只写"晋王夺嫡"）。判断标准：一个读过中学历史的人，看到标题应该能立刻"哦，这个我听过"。
9. **WebSearch 校事实**（强烈推荐）：在写每个朝代之前，先用 WebSearch 搜一下"<朝代>+著名人物/故事"或者直接搜"<朝代> 维基百科"，对照确认人物姓名、关键事件年份、著名引言（如"风声鹤唳"、"莫须有"、"我花开后百花杀"）——避免凭记忆写错的史实硬伤。

### 1.1 风格样本（必读）

**era.story（已有样本）：**
> 渔阳鼙鼓动地来，[[anshi-zhiluan]] 把盛世拦腰斩断。此后一百五十年，唐朝是『带着伤口活着』——直到一个落第书生写下『我花开后百花杀』。

**storylet（已有样本）：**
```json
{
  "title": "长平之后无赵",
  "body": "赵国胡服骑射，本来是东方六国中最能打的国家之一。但 [[changping]] 一败，四十万降卒被坑杀的记忆成为战国最黑暗的节点。此后六国仍在，却已经很难组织起真正有效的抗秦力量。"
}
```

**person.bio（已有样本）：**
> 商鞅把秦国从西陲诸侯改造成可持续动员的战争国家。立木为信只是开场，真正的核心是废井田、开阡陌、奖耕战、行县制、什伍连坐，用法令替代贵族习惯。商鞅本人后来被车裂，说明变法者未必能逃过旧政治反噬；但他设计的制度活了下来，并最终成就秦统一。

**person.relations note（已有样本）：**
> 「曹操挟汉，司马氏挟曹——同一剧本，原样翻演。」

**event.narrative（已有样本）：**
> 『苍天已死』，朝廷放权地方平乱——中央饮鸩，豪强坐大。

---

## 2. 每个朝代你必须交付的「最低分量」

| 项 | 数量 | 备注 |
|---|---|---|
| 新增人物 | **8–15** | 重要遗漏的关键人物，每人有 `bio`、`relations`（≥ 1） |
| 新增事件 | **5–10** | `narrative` 故事化、`involvedPersonIds` 完整 |
| 新增 storylets | **6–12** | 横向故事卡，每张点出一个"耐人寻味"的瞬间 |

如果一个朝代已经有 storylets（春秋、战国、秦末），**不要重复你已有的卡**，做**补充**。

---

## 3. ID 命名规范（防冲突）

新人物 / 新事件 id **必须以朝代前缀开头**，用 kebab-case。

| 朝代 | 前缀 | 示例 |
|---|---|---|
| 三皇五帝 | `legend-` | `legend-suiren`, `legend-shennong` |
| 夏 | `xia-` | `xia-houyi` |
| 商 | `shang-` | `shang-fuhao`, `shang-yiyin` |
| 西周 | `zhou-` | `zhou-zhaogong`, `zhou-baosi` |
| 春秋 | `cq-` | `cq-guanzhong`, `cq-fuchai` |
| 战国 | `zg-` | `zg-lvbuwei-pre`, `zg-xinlingjun` |
| 秦 | `qin-` | `qin-lvbuwei`, `qin-husai`, `qin-zhaogao` |
| 楚汉 | `ch-` | `ch-fankuai` |
| 西汉 | `wh-` | `wh-weiqing`, `wh-huoqubing` |
| 东汉 | `eh-` | `eh-banchao`, `eh-caoton` |
| 三国 | `sg-` | `sg-zhouyu`, `sg-luxun` |
| 西晋 | `wj-` | `wj-jianan` |
| 东晋十六国 | `dj-` | `dj-tao` |
| 南北朝 | `nbc-` | `nbc-lianglu` |
| 隋 | `sui-` | `sui-yangsu` |
| 唐 | `tang-` | `tang-weicheng`, `tang-shangguan` |
| 唐末 | `tl-` | `tl-likemeng` |
| 五代前 | `wd1-` | `wd1-feng` |
| 五代后 | `wd2-` | `wd2-chaikui` |
| 北宋 | `bs-` | `bs-fanzhongyan`, `bs-sushi` |
| 南宋 | `ss-` | `ss-hanshizhong` |
| 元 | `yuan-` | `yuan-baoyan` |
| 明 | `ming-` | `ming-zhangjuzheng`, `ming-weizhongxian` |
| 清 | `qing-` | `qing-zengguofan`, `qing-zuozongtang` |
| 民国 | `roc-` | `roc-jiangjieshi`, `roc-zhouenlai-pre` |
| PRC | `prc-` | (PRC 只到 1949 开国大典，按需) |

**⚠ 已有 id 千万不能重复**。下面是已存在的关键 id，绝不能再新建：
```
huangdi yao shun yu qi jie tang wuding zhouwang zhou-wu jiangziya zhougong youwang
qihuan jinwen confucius laozi shangyang sumin-zhang baiqi zhao-kuo
qinshihuang lisi chensheng xiangyu liubang hanxin zhangliang xiaohe yuji
hanwu zhangqian simaqian wangmang liuxiu caiLun banchao
caocao liubei sunjian sunquan zhugeliang simayi guanyu
simayan huidi liuyuan simarui wangdao fujian xiexuan zuti
liuyu xiaowendi houjing yangjian-pre yangjian suiyang ligong-pre
litang litaizong wuzetian tangxuanzong anlushan libai
huangchao zhuwen likeyong tang-zhaozong licunxu yelvabaoji
shijingtang guowei zhouhshizong zhaokuangyin songshenzong wanganshi songhuizong
zhaogou yuefei qinhui wentianxiang luxiufu
chinggis kublai zhuyuanzhang-pre zhuyuanzhang yongle zhenghe chongzhen lizicheng
nuerhachi kangxi qianlong cixi linzexu sunyatsen-pre sunyatsen yuanshikai
junfa kangri-junmin
```

如果你想引用某个已有人物，直接用其 id 写 `[[xiangyu]]` 即可。

---

## 4. patches/<agentId>.json 格式 spec

```json
{
  "agentGroup": "A3",
  "eras": [
    "qin", "chuhan", "western-han", "eastern-han"
  ],
  "eraPatches": {
    "qin": {
      "storyAppend": "可选。要追加到现有 story 末尾的一段（前面自动加 \\n\\n）。如无需追加，省略此字段。",
      "addedKeyPersonIds": ["qin-lvbuwei", "qin-zhaoji", "qin-husai", "qin-zhaogao", "qin-fusu", "qin-mengtian"],
      "addedKeyEventIds": ["qin-shaqiu-zhimo", "qin-fusu-zisha", "qin-changcheng"],
      "addedStorylets": [
        {
          "title": "奇货可居",
          "body": "[[qin-lvbuwei]] 看到落魄秦质子异人，下注的不是钱，而是一国宗庙。他用全部商业资本运作异人回国继位，再把怀孕的爱姬 [[qin-zhaoji]] 献给他——[[qinshihuang]] 的身世之谜，从这里开始。"
        }
      ]
    }
  },
  "people": [
    {
      "id": "qin-lvbuwei",
      "name": "吕不韦",
      "life": "?—前 235",
      "role": "秦相·奇货可居",
      "bio": "商人出身，看准落难秦质子异人是『奇货可居』，倾家荡产运作其继位。其门客千人编《吕氏春秋》立于咸阳市悬赏一字千金。后被 [[qinshihuang]] 逼令饮鸩——投资秦国一生，最终被秦国清算。",
      "relations": [
        { "personId": "qinshihuang", "type": "其拥立者（疑为生父）", "note": "把怀孕的爱姬献给秦庄襄王，使始皇身世千年成谜。" },
        { "personId": "qin-zhaoji", "type": "曾献其于秦王", "note": "投资链条的关键一环——也是后来杀身之祸的源头。" }
      ]
    }
  ],
  "events": [
    {
      "id": "qin-shaqiu-zhimo",
      "title": "沙丘之谋",
      "year": -210,
      "narrative": "[[qinshihuang]] 暴卒沙丘，[[lisi]] 与 [[qin-zhaogao]] 篡改诏书，赐死扶苏蒙恬、拥立胡亥——帝国从此驶向悬崖。",
      "involvedPersonIds": ["qinshihuang", "lisi", "qin-zhaogao", "qin-husai", "qin-fusu", "qin-mengtian"]
    }
  ]
}
```

### 字段说明：

- `agentGroup`：你的 agent id（如 `A3`）。
- `eras`：你负责的 era id 列表。
- `eraPatches[eraId]`：可选字段：
  - `storyAppend`：要追加到现有 `era.story` 后面的一段文字。**只追加，不替换**。如果觉得原 story 已经够好就不要写。
  - `addedKeyPersonIds`：要加入 `era.keyPersonIds` 的新人物（按重要性排序）。可以重复引用已有人物 id，但建议只写你新加的。
  - `addedKeyEventIds`：同上，要加入 `era.keyEventIds` 的事件。
  - `addedStorylets`：你新加的 storylet 卡，**只追加，不替换**。
- `people`：你新增的人物对象（完整 schema），id 必须带朝代前缀。
- `events`：你新增的事件对象（完整 schema），id 必须带朝代前缀。

### 字段必填规则：

- 人物 `id` `name` `life` `role` `bio` **必填**；`relations` 强烈建议 ≥ 1 条。
- 事件 `id` `title` `year` `narrative` **必填**；`involvedPersonIds` 强烈建议 ≥ 1。
- `year` 公元后用正数，公元前用负数（如前 210 写 -210）。年份是粗略时间，不必精确到月。

---

## 5. 工作步骤

1. **读取现状**：
   - `data/eras.json` —— 找到你负责的 era，看现有 summary/story/storylets/keyPersonIds 是什么
   - `data/people.json` —— 看你负责朝代下已有哪些人物，**避免重复**
   - `data/events.json` —— 同上
   - `data/regimes.json` —— 看政权信息，可在 bio/storylet 里引用
2. **构思**：先在脑中列出你负责的每个朝代要补的 8–15 个人物 + 5–10 个事件 + 6–12 个 storylets，确保覆盖该朝代最"耐人寻味"的几个面（如：奠基者、改革者、悲剧人物、反派、关键事件链、文化代表）。
3. **写 patch**：按 §4 格式写到 `patches/<你的 id>.json`。
4. **自检**：
   - 所有新 id 都带朝代前缀
   - 所有 `[[id]]` 引用要么是已有 id，要么是你这个 patch 里新增的 id
   - JSON 合法（用 `python3 -m json.tool patches/<你的 id>.json` 验证）
5. **结束语**：在你的 final message 中报告：每个朝代各新增了多少人/事件/storylets，以及你最得意的 1–2 个故事钩子。

---

## 6. 关于"互链网"的特别要求

这是项目的灵魂。每个新人物的 `relations` 一定要至少 1 条有 `note` 的关系，并且 `note` 要点出**为什么这条关系耐人寻味**（反讽、宿命、师徒、宿敌、骨肉相残等）。

样本：
```json
"relations": [
  { "personId": "zhuyuanzhang", "type": "受其制度之苦", "note": "废相二百年，国事系于宦官——这债最后由崇祯还。" }
]
```

不要写「师从某某」「曾任某官」这种平铺关系。要写**带钩子的关系**。

---

## 7. 范围红线

- ❌ 不要修改 `regimes.json`、`data/maps.json`、`art-manifest.json` —— 由主 agent 统一处理
- ❌ 不要写 era 的全新 `summary` 或全替换 `story` —— 只允许 `storyAppend`
- ❌ 不要假装做了：如果一个 era 你想不出新 storylet，宁可少写也别水
- ❌ 不要把外文/英文塞进 bio 或 storylet
- ✅ 一切以 patch JSON 为唯一交付物
