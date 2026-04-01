# i studied the architecture of claude code so u dont have to

> Source: https://x.com/mal_shaik/article/2039198750275461198

![](https://pbs.twimg.com/media/HEywLGCakAAp_rQ?format=jpg&name=large)

## i studied the architecture of claude code so u dont have to

not how to USE it. how its BUILT.

if ur building AI products, the engineering decisions anthropic made are a masterclass in agent design.

heres what i learned and what u can steal for ur own products.

reposts appreciated if u find this useful.

most people look at claude code and see a chat interface in the terminal.

i looked at the source code and saw an 11-layer agent orchestration platform that solves almost every hard problem in AI product development.

every layer has a design decision that u can apply to ur own AI product. whether ur building a coding agent, a support bot, or an AI workflow tool.

lets break it down.

# 

1\. the entry point is ruthlessly optimized for speed

claude code boots in milliseconds. how?

fast-path routing. simple commands like --version and --daemon get intercepted before the full app even loads. no unnecessary initialization.

parallel prefetching. while the CLI parses ur command, its already loading settings, checking auth, establishing TLS connections, and preconnecting to the API. all at the same time.

memoized initialization. expensive setup operations run once and get cached.

what u can steal: if ur AI product has a CLI or startup sequence, dont load everything upfront. fast-path the common cases. prefetch in parallel. memoize expensive ops. users notice startup time more than u think.

# 

2\. they built a custom terminal renderer from scratch

claude code doesnt use a standard terminal UI library. they built their own React-based renderer using Ink with:

a Yoga flexbox layout engine for the terminal

virtual scrolling with height caching

incremental ANSI diff output via interned screen buffers

CSI u input parsing for mouse support and text selection

they literally brought web rendering concepts to the terminal.

what u can steal: dont assume the default UI framework is good enough. if ur AI product has a unique interaction pattern (streaming responses, tool outputs, multi-agent views), invest in the rendering layer. a custom UI that handles streaming well is a massive UX advantage. most AI products have janky streaming because they didnt invest here.

# 

3\. the conversation loop is an async generator state machine

this is the core of the product. the REPL loads tools, builds the system prompt, loads context, then enters an async generator loop:

for await (event of query({messages, systemPrompt, tools}))

every event gets processed and rendered in real time. tool calls, text deltas, errors — all flowing through one unified stream.

the query engine itself is a while(true) loop that:

1\. normalizes messages + compacts context

2\. builds the system prompt (static + dynamic)

3\. calls the model with streaming

4\. collects tool\_use blocks

5\. executes tools

6\. appends results

7\. loops until end\_turn

what u can steal: if ur building any AI product with tool use, this is the pattern. async generators for the event stream. a state machine loop for the agent cycle. separate "normalize context" from "call model" from "execute tools." most AI products mash these together and end up with spaghetti. anthropic separated them cleanly and it shows.

# 

4\. tool execution has smart concurrency

claude code has 60+ tools. but the clever part is how it runs them.

when the model returns multiple tool calls, the system partitions them:

concurrent batch — read-only tools (file reads, searches, globs) run in parallel

serial batch — mutating tools (edits, writes, bash) run sequentially

each tool goes through: input validation (Zod) → pre-hooks → permission check → execution → post-hooks → result truncation

what u can steal: if ur AI product uses tools, think about concurrency. read operations can parallelize safely. write operations need ordering. most AI products run everything serially and its unnecessarily slow. also: validate inputs with a schema. truncate outputs. ur model doesnt need a 50KB file in its context when 8KB would do.

5\. the permission system is a multi-layer race

this is genuinely clever engineering.

when claude code needs permission for an action, it doesnt just ask the user. it races multiple resolvers in parallel:

user click (the dialog)

hook classifier (automated rules)

bash security classifier (LLM-based safety check)

bridge/web UI (external approval)

first one to respond wins. createResolveOnce pattern.

on top of that, theres a 5-level rule cascade: policy > flag > local > project > user. rules at higher levels cant be overridden by lower levels.

what u can steal: if ur AI product does anything risky (file access, API calls, data modification), build a layered permission system. dont just prompt the user every time. have configurable rules, auto-classifiers, and interactive fallbacks. the race pattern is especially smart — it means the fastest safe path always wins.

# 

6\. context management has 5 compression strategies

this is where u can tell the engineers spent months.

200K token default window. 1M opt-in. and FIVE strategies to manage overflow:

microcompact — clears old tool results based on time

context collapse — summarizes spans of conversation into shorter versions

session memory — extracts structured context (task spec, files, learnings) to a file

full compact — summarizes entire conversation history

PTL truncation — drops oldest message groups as last resort

the system tries them in order from least lossy to most lossy. and it does it automatically when context pressure hits.

what u can steal: if ur AI product has conversations longer than a few turns, u NEED a context management strategy. most products just truncate from the top. thats the dumbest possible approach. build tiered compression. save important context to external storage. summarize before u truncate. the difference between a product that "loses context" and one that "remembers everything" is this engineering.

# 

7\. the system prompt is split into cacheable and dynamic sections

anthropic splits the system prompt into two parts:

static (cacheable): role instructions, tool guidelines, coding rules, style rules. these rarely change between turns.

dynamic (per-request): CLAUDE.md files, environment info, git status, current date, memory. these change every turn.

theres an explicit cache boundary between them. the static part gets cached by the API (1 hour TTL). the dynamic part gets rebuilt every turn.

what u can steal: if ur sending system prompts to an LLM API, split them the same way. put stable instructions first (cacheable). put dynamic context after. this dramatically reduces API costs because the cached prefix doesnt get re-processed. most AI products rebuild the entire system prompt every turn and pay full price every time.

# 

8\. subagents are designed for cache sharing

when claude code forks a subagent, it creates a byte-identical copy of the parent context. this means the forked agent hits the same prompt cache as the parent.

5 parallel agents cost barely more than 1 sequential agent.

three execution models:

fork — same process, shared cache, no recursive forking allowed

teammate — separate tmux/iterm pane, file-based mailbox communication

worktree — git worktree per agent, isolated branches

what u can steal: if ur building a multi-agent system, think about cache topology. agents that share context prefixes can share API caches. design ur agent spawning to maximize cache hits. also: file-based communication between agents is simple and robust. dont over-engineer with message queues when a JSON file in a known directory works.

# 

9\. the hook system makes it extensible without forking

25+ lifecycle events. 5 hook types (command, prompt, agent, HTTP, function). hooks can come from settings, plugins, agent frontmatter, or SDK callbacks.

PreToolUse can block or modify actions before they happen. PostToolUse can transform results. UserPromptSubmit can inject context into every message.

what u can steal: build hooks into ur AI product from day one. even if u dont use them immediately. the ability to run custom logic before/after every tool call, every message, every session — thats what turns a product into a platform. ur power users will build things on top of ur hooks that u never imagined.

# 

10\. everything is persistent and resumable

conversations saved as JSONL. session memory extracted to files. sessions can be continued, resumed, or forked.

what u can steal: persist everything. conversations, tool results, agent state. make it resumable. the cost of storage is nothing compared to the cost of lost context. most AI products treat every session as ephemeral and it kills the user experience for long-running tasks.

# 

the bigger picture

what this architecture reveals about building AI products:

• separate ur rendering layer from ur agent logic. claude code uses React for UI and async generators for the agent loop. theyre completely decoupled. this is why they can support terminal, web bridge, and SDK interfaces from the same core.

• treat context like a managed resource. not a dump. 5 compaction strategies exist because "just send everything to the model" doesnt scale. every serious AI product will need context management eventually. build it early.

• design for parallelism from day one. tool batching, subagent forking, cache sharing. the architecture assumes multiple things happening at once. single-threaded agent loops are a dead end.

• make permissions configurable, not binary. a 5-level cascade with auto-classifiers is way more sophisticated than "allow all" or "ask every time." ur users have different risk tolerances. let them configure it.

• hooks > plugins > hardcoded features. the most extensible part of claude code isnt any single feature. its the hook system that lets anyone add features without touching the core.

• cache-aware architecture saves money. splitting system prompts into static/dynamic, sharing caches across subagents, using ephemeral markers. these are cost optimizations baked into the architecture. at scale this is the difference between profitable and bankrupt.

tldr for builders:

• fast-path ur entry points. dont load what u dont need.

• invest in ur streaming/rendering layer. its the UX.

• async generator state machines for agent loops.

• partition tool execution: parallel reads, serial writes.

• race multiple permission resolvers. first safe answer wins.

• 5 tiers of context compression, not just truncation.

• split system prompts: static (cached) + dynamic (per-turn).

• design subagent spawning around cache sharing.

• build hooks from day one. hooks turn products into platforms.

• persist everything. make sessions resumable.

claude code isnt just a good product. its a blueprint for how to build AI-native software.

the source code is open. go read it. steal these patterns. build something better.

rt if u found helpful. also shameless plug for

[spreadjam.com](https://spreadjam.com/)

where we built claude code for gtm using a similar architecture :)

created by

[@mal\_shaik](https://x.com/@mal_shaik)
