# 别再让 Claude Code 猜了，这份 `CLAUDE.md` 模板你可以直接用

## 备选标题

- 如果你总觉得 Claude Code 不稳定，先把这份 `CLAUDE.md` 写进去
- 一个可以直接复制的 `CLAUDE.md` 模板，让 Claude Code 少走很多弯路
- 先别急着提需求，把这份项目说明交给 Claude Code 再说

## 正文

如果你平时用 Claude Code，经常出现下面这些情况：

- 它老是选错技术方案
- 它总爱去改你不想动的地方
- 你每次都要重新解释项目背景
- 明明说过很多次的规范，它还是记不稳

那问题很可能不是你不会写 prompt。

而是你缺了一份真正有用的 `CLAUDE.md`。

你可以把它理解成什么？

很简单：

**它就是你给 Claude Code 的项目入职手册。**

你不给，它就只能猜。

它一猜，稳定性就会下降。

所以这篇我不讲大道理，直接给你一份能复制的版本。

---

## 一份通用版 `CLAUDE.md` 模板

下面这份，你可以直接复制到项目根目录，再按自己的情况改。

```markdown
# Project Guide

## Project Goal
- This project exists to solve:
- The most important user outcome is:
- When making tradeoffs, prioritize:

## Tech Stack
- Framework:
- Language:
- State management:
- Styling/UI:
- Testing:
- Package manager:

## Architecture Rules
- Follow the existing project structure unless there is a clear reason to change it.
- Reuse existing patterns before introducing new abstractions.
- Keep functions and components small and easy to read.
- Prefer minimal, targeted changes over broad refactors.

## Coding Rules
- Do not use `any` unless explicitly approved.
- Keep naming consistent with the existing codebase.
- Add error handling for user-facing and network-related logic.
- Avoid adding new dependencies unless necessary.
- Preserve existing comments and do not rewrite unrelated code.

## File Safety Rules
- Ask before changing dependency versions, build config, or environment files.
- Do not modify deployment, CI, or infrastructure files unless the task requires it.
- Do not rename files or move directories unless necessary for the task.
- Ignore unrelated dirty changes in the repo.

## Testing Rules
- Add or update tests when changing behavior.
- Run the smallest relevant test scope first.
- If tests cannot be run, explain why clearly.
- Do not claim success without verification.

## Communication Rules
- Explain important tradeoffs briefly before large changes.
- Surface risks or assumptions clearly.
- Keep summaries concise and action-oriented.

## Preferred Workflow
- First understand the relevant files before editing.
- Then propose or execute the smallest correct change.
- After edits, verify with tests, lint, or a focused check when possible.
- Summarize what changed and any remaining risks.

## Hard Constraints
- Never delete large sections of code unless necessary.
- Never overwrite user changes without confirming.
- Never make destructive git operations.

## Project-Specific Notes
- Put important domain rules here.
- Put naming conventions here.
- Put API or data constraints here.
- Put UX/content tone requirements here.
```

---

## 这份模板，最少要改哪几块

如果你不想一下子改很多，我建议你先把下面 5 个地方补上。

### 1. 项目目标

很多人写规则只写“怎么做”，不写“为什么做”。

但 Claude Code 真正容易跑偏的时候，往往不是写法问题，而是目标理解错了。

所以一定要补一句：

- 这个项目最重要的目标是什么
- 发生冲突时优先保什么

比如：

```markdown
## Project Goal
- This project exists to help content teams manage and publish internal knowledge faster.
- The most important user outcome is fast and accurate publishing.
- When making tradeoffs, prioritize clarity and stability over clever abstractions.
```

### 2. 技术栈和禁区

不要只告诉它“我们用 React”。

你要更具体一点：

- 用哪个框架版本
- 状态管理用什么
- 不希望引入什么依赖
- 哪些文件不要乱动

你写得越具体，它猜的空间就越小。

### 3. 测试标准

很多人抱怨 AI 改完就跑，其实是因为你根本没给出测试标准。

你至少要明确：

- 什么情况必须加测试
- 优先跑哪些测试
- 跑不了时要怎么说明

### 4. 沟通方式

这个特别容易被忽略，但很好用。

你完全可以在 `CLAUDE.md` 里规定它的协作方式，比如：

- 先理解相关文件，再动手
- 大改前先说明权衡
- 改完要总结风险和剩余问题

这会明显改善“上来就改、改完不交代”的体验。

### 5. 项目特有规则

模板再通用，也替代不了你项目自己的约束。

比如：

- 命名规则
- 接口约束
- 内容风格
- 目录约定
- 发布流程

这些才是让 Claude Code 从“通用助手”变成“懂你项目的人”的关键。

---

## 一个更贴近真实项目的中文示例

如果你想更快进入状态，也可以直接参考这个中文版。

```markdown
# 项目协作说明

## 项目目标
- 这是一个知识库与内容发布项目。
- 所有改动优先保证内容结构清晰、可维护、方便发布。
- 当速度和稳定性冲突时，优先稳定性。

## 技术栈
- 使用现有项目结构，不随意新增目录层级。
- 优先沿用当前 Markdown 内容组织方式。
- 除非明确要求，不新增依赖。

## 代码与内容规则
- 改动要小而准，不做无关重构。
- 不修改与当前任务无关的文件。
- 文案表达优先清晰、易读、适合公众号传播。
- 避免过度技术化表达，尽量把术语翻译成读者容易理解的话。

## 文件安全规则
- 不修改构建配置、部署配置和依赖版本，除非任务明确要求。
- 不覆盖已有人工内容，发现冲突先说明。
- 不删除大段内容，除非有明确理由。

## 测试与校验
- 修改完成后，至少做一轮结构自检。
- 检查标题、开头、节奏、结尾互动性是否成立。
- 如果无法验证，明确说明原因。

## 协作方式
- 先理解上下文，再开始修改。
- 重要改动前先说明要改什么。
- 改完后总结：改了什么、为什么这么改、还剩什么可继续优化。
```

---

## 很多人把 `CLAUDE.md` 写废，通常是这 3 种情况

### 1. 写得太空

只有一句“请帮我高质量完成任务”。

这种基本没有约束力。

### 2. 写得太满

恨不得把所有历史决策、所有背景资料、所有想法都塞进去。

这样会让重点变模糊。

真正有效的 `CLAUDE.md` 不是越长越好，而是越清晰越好。

### 3. 只写规范，不写边界

很多人写“代码要优雅”“结构要清晰”，但不写：

- 什么不能动
- 什么需要先确认
- 什么优先级更高

AI 最怕的不是要求高，而是边界模糊。

---

## 最后给一个最实用的建议

如果你今天只做一件事，就去把项目根目录里的 `CLAUDE.md` 补起来。

不用追求一步到位。

你哪怕先补这 4 行，都会比空白强很多：

```markdown
- 项目目标是什么
- 当前技术栈是什么
- 哪些文件不要动
- 改动后至少要做什么验证
```

很多人以为 Claude Code 的上限，取决于你会不会写很厉害的 prompt。

但我越来越觉得，真正决定下限的，反而是你有没有给它一份像样的项目说明。

如果你愿意，我下一版还能继续帮你补两套现成模板：

- 前端项目版 `CLAUDE.md`
- 后端/API 项目版 `CLAUDE.md`

你如果要，我可以直接继续往下写。
