# Overnight Handover: `dsh-vault-memory`

**Status:** ready for autonomous overnight implementation  
**Date:** 2026-09-10  
**Owner experiment:** transfer Eris vault-memory ideas into DeepSeek Harness as a Cordis plugin  
**Human role:** architecture / acceptance  
**Implementer:** local small model (Qwen3.8 ~27B Q8) + harness  
**Human does NOT write production code in this run**

---

## 0. Instructions for the overnight agent (read first)

You are implementing an **out-of-tree DeepSeek Harness (DSH) Cordis plugin** in this directory:

```text
/Users/jandahlke/dev/hagbards_stuff/dsh-vault-memory/
```

### Mission

Build a **shared markdown vault memory** plugin so that:

1. User and agent share one markdown vault on disk.
2. The agent is sovereign curator of agent-writable areas.
3. A **single human command** summarizes recent conversation context and writes one durable memory note.
4. That note is **embedded** (nomic-embed-text via Ollama) and stored in a **local vector index**.
5. On each agent turn, **top-k matching memories are injected** into context.
6. The agent can also **search / read / write** memories via tools when it chooses.

### Non-negotiable constraints

1. **Do NOT fork or modify** `/Users/jandahlke/dev/hagbards_stuff/deepseek-harness` core packages for this feature. Out-of-tree plugin only; load via `--patch`.
2. **Do NOT port Eris’s promotion ladder** (Session → Scratch → Promote, scores, decay, demotion). One durability step only.
3. **Markdown is canonical.** The vector DB is derived and rebuildable from vault `.md` files.
4. **`00_Invariants/` is human-only.** Agent tools must refuse writes there.
5. Prefer **simple, working MVP** over Eris feature parity.
6. Do not invent session-event types for note bodies. Notes live as files.
7. Do not block the agent loop on embedding I/O longer than necessary; queue embeds asynchronously after write when possible.
8. Keep inject payload **budgeted** (default ~1500 chars). Never dump the whole vault into the prompt.
9. Match DeepSeek Harness plugin conventions (Cordis `apply`, `inject`, reversible `ctx.effect` / register disposers).
10. If stuck >30 minutes on a dependency, **downgrade** to the frozen fallback in §4 rather than redesigning.

### Success definition (must all pass by morning)

| # | Acceptance test |
|---|-----------------|
| A1 | Plugin loads: `dsh web --patch ./cordis.yml` (or equivalent) without crash |
| A2 | `/vault-remember` writes a new `.md` under `30_Memories/` with valid frontmatter + body |
| A3 | New note is indexed (embedding stored); boot or explicit reindex finds it |
| A4 | Next user turn with related wording shows injected `[RELEVANT_LEARNED_MEMORY]` content |
| A5 | Tool `vault_search` returns the note; `vault_read` returns file body |
| A6 | Attempted write under `00_Invariants/` is denied |
| A7 | `pnpm test` (or documented smoke script) passes for unit tests you add |

### Stop conditions (do not expand scope)

Stop when A1–A7 pass. Do **not** implement: promotion ladder, epistemic status enums, revisioned zettel `r0001.md`, document RAG collection, FS live-watch reindex, Obsidian sync UI, MCP wrapper, memvid, Qdrant, multi-workspace collections, or Eris TUI.

---

## 1. Why this exists (experiment intent)

This is a **self-improvement experiment**: can harness + a small local model write an elaborate memory subsystem for itself overnight?

Eris already proved the product shape (markdown vault + semantic index + prefetch). Eris also proved what to drop (promotion ladder overengineering). DeepSeek Harness has **no first-party vault/RAG**; its cookbook maps Memory → `section provider + tool`. You implement that map, plus per-turn retrieval inject.

Reference repos (read-only inspiration; do not copy blindly):

| Path | Use |
|------|-----|
| `/Users/jandahlke/dev/hagbards_stuff/eris/src/memory/` | Conceptual design only |
| `/Users/jandahlke/dev/hagbards_stuff/eris/docs/updated_architecture/13_MEMVID_AND_MEMORY_SIMPLIFICATION.md` | Why ladder dies |
| `/Users/jandahlke/dev/hagbards_stuff/deepseek-harness/docs/cookbook/extension-cookbook.md` | Feature → mechanism map |
| `/Users/jandahlke/dev/hagbards_stuff/deepseek-harness/docs/user/develop/basic/tool.md` | Tool plugin tutorial |
| `/Users/jandahlke/dev/hagbards_stuff/deepseek-harness/packages/compaction/command-compact/` | Slash-command pattern |
| `/Users/jandahlke/dev/hagbards_stuff/deepseek-harness/packages/context/time-context/` | `agent/pre-step` inject pattern |

---

## 2. Design transfer: Eris → DSH (keep / drop / adapt)

### Keep (good parts)

| Concept | Eris today | Your MVP |
|---------|------------|----------|
| Markdown vault as source of truth | Yes | Yes |
| Human-owned invariants | `00_Invariants/` | Same |
| Explicit durability gate | `memory:commit` | `/vault-remember` (+ optional `vault_write`) |
| Semantic embed + index | nomic 768 + Qdrant | nomic 768 via Ollama + **SQLite vector table** (§4) |
| Turn-start prefetch | `[RELEVANT_LEARNED_MEMORY]` | Same label + budget |
| Agent can query more | `memory:query` | `vault_search` |
| Rebuildable index | `ingest_vault_v2` | `reindexVault()` on boot + after write |

### Drop (bad / overnight-hostile)

| Drop | Why |
|------|-----|
| Session / Scratch / Promote ladder | Untuned, unused complexity |
| `promotion_score`, decay, demotion | No observer, no data |
| Ephemeral moka staging cache | One-step write replaces stage→commit |
| Revisioned Synthesis dirs | Flat `30_Memories/*.md` |
| EpistemicStatus enum | Skip |
| Separate DocumentStore RAG | Later |
| Live `notify` FS watcher | Boot + post-write reindex enough |
| Dual UUID strategies | One stable id = UUID v5 of relative vault path |

### Adapt to harness seams

| Need | DSH mechanism |
|------|----------------|
| Protocol text (“how to use memory”) | `ctx.systemPrompt.section({ name: 'vault-memory', … })` |
| Per-turn top-k | `ctx.on('agent/pre-step', …)` append/inject sourced user-role reminder |
| Human remember command | `ctx.commands.register({ name: 'vault-remember', … })` |
| Agent tools | `ctx.tools.register(defineTool(…))` |
| Summarize conversation | Prefer calling existing LLM/session APIs available on `ctx`; if too hard, use a **template extract** of last N user/assistant texts (see §7 fallback) |

Cookbook row: **Memory | section provider + tool** — you also add pre-step inject (required for automatic recall; MCP-only tools are insufficient).

---

## 3. Product behavior (exact)

### 3.1 Shared vault

Default vault root (configurable):

```text
$DSH_HOME/vault/
  00_Invariants/          # human-only; seed Identity.md if missing
  30_Memories/            # agent + /vault-remember writable
  .vault-index/           # derived: sqlite db + meta; gitignore-worthy
    vectors.sqlite
    meta.json             # embed model name, dim, schema version
```

On first load, create dirs if missing. Seed:

```markdown
# 00_Invariants/Identity.md
---
title: Identity
immutable: true
---

Operator-owned facts. The agent must not modify this folder.
```

### 3.2 Memory note format

Path: `30_Memories/<slug>-<yyyyMMdd-HHmmss>.md` (slug from title; ASCII; max 60 chars).

```markdown
---
title: "Short descriptive title"
tags: [tag1, tag2]
created_at: 2026-09-10T22:15:00Z
source: vault-remember
session_id: "<if available>"
node_id: "<uuid-v5-of-relative-path>"
---

<body: durable facts, decisions, preferences, project state — not chat transcript dump>
```

Body rules for summarizer:

- Prefer durable facts over ephemeral task noise.
- Prefer third-person / note style, not “User said…”.
- Max ~800 words; target 150–400 words.
- Include tags inferred from content.

### 3.3 One-step remember

Command: **`/vault-remember`** (optional free-text hint: `/vault-remember focus on the vault design decisions`).

Flow:

1. Gather recent conversation context (last N messages / last turn budget; see §7).
2. Call LLM (or fallback template) to produce `{ title, tags, body }`.
3. Write markdown under `30_Memories/`.
4. Embed `title + "\n" + body` with nomic; upsert into sqlite index.
5. Return human success text with path.

No staging. No promote. File write = durable.

### 3.4 Automatic inject

On `agent/pre-step` (when enabled):

1. Extract latest user text for the open turn (mirror time-context’s idea of turn messages; keep it simple: last user message text).
2. Skip if disabled, empty, or length < `minQueryChars` (default 12).
3. Embed query; cosine top-k against index (`topK` default 3, `minScore` default 0.35).
4. Format content-only block (no paths/scores in the model-facing text unless debugging flag on):

```text
[RELEVANT_LEARNED_MEMORY]
- <title>: <snippet>
- ...
```

5. Inject as a **sourced** durable/context message following harness patterns (`source: { kind: 'plugin', plugin: 'vault-memory' }` or whatever the current time-context / agent-instructions pattern uses — **copy the working pattern from time-context**, do not invent a new session event type).
6. Enforce `maxInjectChars` (default 1500). Truncate snippets.

### 3.5 Agent choice (tools)

| Tool | Purpose |
|------|---------|
| `vault_search` | Semantic search; returns titles, scores, paths, snippets |
| `vault_read` | Read one vault-relative path |
| `vault_write` | Write/overwrite under allowed dirs only (`30_Memories/`); then re-embed |
| `vault_list` | List `30_Memories/` filenames (optional if timeboxed; nice-to-have) |

Prompt section tells the model:

- Prefer auto-injected `[RELEVANT_LEARNED_MEMORY]` when present.
- Call `vault_search` when it needs more / filters / older facts.
- Call `vault_write` only for durable notes the user asked to keep, or clear lasting decisions.
- Never write under `00_Invariants/`.

### 3.6 Sovereignty model

- User may edit any markdown in a normal editor (Obsidian, VS Code).
- Index is rebuildable: on plugin start, if `meta.json` missing/mismatch **or** `reindexOnBoot: true`, walk `30_Memories/**/*.md` and rebuild vectors.
- Agent is curator of `30_Memories/`; human overrides by editing files.

---

## 4. Frozen technical stack (do not bikeshed overnight)

| Concern | Frozen choice | Fallback if blocked |
|---------|---------------|---------------------|
| Language | TypeScript ESM Cordis plugin | — |
| Package name | `@local/dsh-vault-memory` (private; not published) | — |
| Embeddings | Ollama HTTP `POST /api/embeddings` model `nomic-embed-text` (768-dim) | If Ollama down: skip inject/search with clear error; still allow write of markdown |
| Vector store | **better-sqlite3** table of `(path PRIMARY KEY, title, text, dim, embedding BLOB, updated_at)` + **brute-force cosine** in JS | JSONL of vectors if sqlite native build fails |
| Why not Qdrant overnight | Extra daemon; Eris pain point; vaults are small | Phase 2 |
| Why not LanceDB overnight | Extra API surface; fine later | Phase 2 |
| Summarizer | Prefer `ctx.llm` / available session APIs | Fallback: concatenate last user+assistant texts with a fixed instruction prefix and call whatever chat completion the harness exposes; if impossible, write a **manual heuristic note** from last 4k chars of transcript |
| Load method | `cordis.yml` + `dsh web --patch ./cordis.yml` from this directory | `dsh plugin add file:…` later |

### Embedding HTTP contract (Ollama)

```http
POST http://127.0.0.1:11434/api/embeddings
Content-Type: application/json

{ "model": "nomic-embed-text", "prompt": "..." }
```

Expect `embedding: number[]` length 768. Validate dimension; refuse upsert on mismatch.

Config defaults:

```yaml
vaultRoot: null          # null => $DSH_HOME/vault
ollamaBaseUrl: http://127.0.0.1:11434
embedModel: nomic-embed-text
embedDim: 768
topK: 3
minScore: 0.35
minQueryChars: 12
maxInjectChars: 1500
prefetchEnabled: true
reindexOnBoot: true
```

---

## 5. Target package layout

Create this tree under `/Users/jandahlke/dev/hagbards_stuff/dsh-vault-memory/`:

```text
dsh-vault-memory/
  OVERNIGHT_HANDOVER.md          # this file (do not delete)
  README.md                      # short how to run
  package.json
  tsconfig.json
  cordis.yml                     # patch to load the plugin
  src/
    index.ts                     # apply(ctx): wire everything
    config.ts                    # Config schema (schemastery if harness expects it)
    paths.ts                     # vault roots, invariants guard, slugify
    vaultFs.ts                   # read/write/list markdown; frontmatter parse
    frontmatter.ts               # minimal YAML frontmatter parse/serialize
    embed/
      ollama.ts                  # embed(text) -> Float32Array
    index/
      sqliteStore.ts             # open db, upsert, search cosine, reindex
      cosine.ts                  # pure functions + tests
    remember/
      command.ts                 # /vault-remember
      summarize.ts               # build prompt + parse model JSON
      contextCollect.ts          # pull recent messages from agent/session
    inject/
      prefetch.ts                # agent/pre-step handler
      format.ts                  # [RELEVANT_LEARNED_MEMORY] formatter
    tools/
      search.ts
      read.ts
      write.ts
      list.ts                    # optional
    prompt/
      section.ts                 # systemPrompt.section text
  tests/
    cosine.spec.ts
    frontmatter.spec.ts
    paths.spec.ts
    sqliteStore.spec.ts          # tempfile dir; no writes outside tmp
```

Follow the scratch-plugin tutorial packaging style from:

`/Users/jandahlke/dev/hagbards_stuff/deepseek-harness/docs/user/develop/basic/tool.md`

and package checklist:

`/Users/jandahlke/dev/hagbards_stuff/deepseek-harness/docs/cookbook/adding-a-package.md`

Peer-style deps (match versions used by local harness install; inspect nearby package.json files under the harness if needed):

- `@deepseek-ai/cordis`
- `@deepseek-ai/dsh-tools`
- `@deepseek-ai/dsh-system-prompt`
- `@deepseek-ai/dsh-commands`
- `@deepseek-ai/dsh-agent` (for pre-step types)
- `@deepseek-ai/dsh-llm` (createUserMessage etc.)
- `@deepseek-ai/dsh-home-paths` or equivalent for `$DSH_HOME`
- `better-sqlite3` (or fallback)
- `zod` / schemastery as required by harness plugins

---

## 6. Wiring sketch (behavioral, not copy-paste-complete)

```ts
export const name = 'vault-memory'
export const inject = ['tools', 'systemPrompt', 'commands', 'agents' /* + llm/session if needed */]

export function apply(ctx: Context, config: Config) {
  const vault = resolveVault(config)
  ensureLayout(vault)
  const store = openStore(vault)
  if (config.reindexOnBoot) void reindexVault(vault, store, embedder)

  ctx.systemPrompt.section({ name: 'vault-memory', order: /* pick mid */, text: PROTOCOL })

  ctx.commands.register({
    name: 'vault-remember',
    description: 'Summarize recent context into a durable vault memory note.',
    async handler(invocation) { /* summarize → write → upsert */ },
  })

  ctx.tools.register(defineTool({ name: 'vault_search', … }))
  ctx.tools.register(defineTool({ name: 'vault_read', … }))
  ctx.tools.register(defineTool({ name: 'vault_write', … }))

  ctx.on('agent/pre-step', async (agent, proposed, next) => {
    // retrieve + append inject message; then next()
  })
}
```

**Copy patterns from:**

- Commands: `packages/compaction/command-compact/src/index.ts`
- Pre-step inject: `packages/context/time-context/src/index.ts`
- Tools: cookbook `adding-a-tool.md` / basic `tool.md`

Do **not** patch `dsh-agent-loop`.

---

## 7. `/vault-remember` details

### Context collection (priority order)

1. If session projection / session query APIs are easy: last ~20 model-visible user/assistant messages, truncated to ~8k chars.
2. Else: walk `agent.session` events backward for `user/message` and `assistant/message` text deltas / settled text (inspect time-context + compaction for how they read sessions).
3. Else fallback: ask the command invocation for any attached agent handle fields; if still impossible, return error telling human to paste a note via `vault_write`.

### Summarizer prompt (use this)

System/instruction:

```text
You extract durable memory notes for a shared markdown vault.
Return ONLY JSON: {"title": string, "tags": string[], "body": string}
Rules:
- body is a standing note, not a chat transcript
- keep facts, decisions, preferences, project state
- omit transient debugging noise
- title <= 80 chars
- tags: 1-5 short lowercase tokens
```

User payload: optional hint + concatenated recent context.

### Parse robustness

- Strip markdown fences if model wraps JSON.
- On parse failure: retry once with “JSON only”; then write a degraded note titled `Remember snapshot <timestamp>` with raw truncated context (still durable).

---

## 8. Index algorithm (MVP)

### Schema

```sql
CREATE TABLE IF NOT EXISTS memories (
  path TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  text TEXT NOT NULL,
  dim INTEGER NOT NULL,
  embedding BLOB NOT NULL,
  updated_at INTEGER NOT NULL
);
```

Store `Float32Array` as little-endian blob (`dim * 4` bytes).

### Search

1. Embed query.
2. Load all rows (or iterate); cosine similarity.
3. Filter `score >= minScore`; sort desc; take `topK`.

Fine for hundreds/thousands of notes. Document that Qdrant/HNSW is Phase 2.

### Upsert key

Relative vault path string, e.g. `30_Memories/foo-20260910-221500.md`.

### Reindex

Delete rows whose path files vanished; upsert all current `30_Memories/**/*.md` (parse frontmatter; embed `title + body`).

---

## 9. Security / path rules

- Resolve all paths with `path.resolve(vaultRoot, rel)` and assert the result stays under `vaultRoot` (prevent `../` escape).
- Deny if relative path starts with `00_Invariants` (any case-normalization you implement must still deny).
- Only allow write extensions `.md`.
- Do not execute vault content.

---

## 10. Implementation phases (overnight schedule)

Work **in order**. After each phase, run whatever smoke you can.

### Phase 0 — Scaffold (45–90 min)

- `package.json`, `tsconfig`, `cordis.yml`, empty `apply` that logs via Cordis logger (not `console.log` spam if logger exists).
- Prove load with `--patch`.

### Phase 1 — Vault FS (60–90 min)

- ensure layout, frontmatter helpers, path guards.
- Unit tests for slugify, deny invariants, frontmatter roundtrip.

### Phase 2 — Tools read/write/list (60–90 min)

- Register tools; manual smoke via Web UI.

### Phase 3 — Embed + sqlite index (90–120 min)

- Ollama client; cosine; upsert/search/reindex.
- Unit tests for cosine with known vectors.
- If `better-sqlite3` fails to build: switch to JSONL fallback immediately.

### Phase 4 — Prefetch inject (60–90 min)

- `agent/pre-step` + formatter + budgets.
- Smoke: write a note about “project eris vault”, ask related question, confirm inject text appears in assembled context or observable reminder.

### Phase 5 — `/vault-remember` (90–120 min)

- Context collect + summarize + write + index.
- This is the crown jewel; if LLM call is hard, ship heuristic note writer first so A2 still passes, then improve summarizer.

### Phase 6 — Prompt section + polish (30–60 min)

- Protocol section; README; acceptance checklist self-run; fix obvious bugs.

**If time remains:** `vault_list`, better summarizer JSON schema, debug flag to include scores in inject.

---

## 11. Eris map (inspiration only — do not port code wholesale)

| Eris file | Idea to steal | Do not port |
|-----------|---------------|-------------|
| `src/memory/types.rs` | VaultKind mental model | EphemeralTier ladder |
| `src/memory/ephemeral.rs` | — | Entire promotion daemon |
| `src/memory/semantic.rs` | ingest/upsert/search payload mindset | Qdrant client as-is |
| `src/memory/prefetch.rs` | content-only format, guards | Exact Rust types |
| `src/tools/memory/commit.rs` | frontmatter fields | Revision directories |
| `src/orchestrator/context/assembler.rs` | prompt rules tone | Full assembler |

Eris simplification doc authority: ladder is overengineered; staged→committed is enough — and for DSH we collapse further to **direct write**.

---

## 12. DeepSeek Harness docs the implementer must open

1. `docs/architecture.md` — turn flow, extension points  
2. `docs/cordis-primer.md` + `docs/cordis-tutorial/01-first-plugin.md`  
3. `docs/cookbook/extension-cookbook.md` — Memory row  
4. `docs/cookbook/adding-a-tool.md`  
5. `docs/user/develop/basic/tool.md` + `index.md` + `config.md`  
6. `packages/context/time-context/src/index.ts` — pre-step pattern  
7. `packages/compaction/command-compact/src/index.ts` — command pattern  
8. `packages/core/system-prompt/README.md` — sections/contexts  

Harness root:

```text
/Users/jandahlke/dev/hagbards_stuff/deepseek-harness
```

---

## 13. Suggested `cordis.yml` shape

Adapt to whatever the scratch-plugin tutorial uses locally (names vary by version). Intent:

```yaml
# Load this out-of-tree plugin into the running composition
- id: vault-memory
  # path / package name / include form per tutorial
```

Put the exact working snippet from the first-plugin tutorial into `README.md` once verified.

---

## 14. Testing requirements

- Use **temp directories** for FS tests (Node `os.tmpdir()` / `fs.mkdtemp`). Never write test fixtures into the real `$DSH_HOME/vault` or the plugin source tree permanently.
- Cosine unit test: identical vectors → ~1.0; orthogonal → ~0.0.
- Path traversal test: `../00_Invariants/x.md` denied.
- Prefer Vitest/Jest if harness scratch plugins use one; otherwise a small `node --test` suite is fine.

---

## 15. Observability

- Use Cordis / harness logger (`ctx.logger` or package convention). Avoid raw `console.log` in hot pre-step paths.
- Log: reindex counts, embed failures, inject hit counts at debug level.

---

## 16. README the implementer must leave behind

`README.md` must include:

1. Prerequisites: Node 22+, pnpm, Ollama with `nomic-embed-text`, DeepSeek Harness checkout usable via `pnpm dsh`
2. Install/build steps for this package
3. Exact command to run with `--patch`
4. How to use `/vault-remember`
5. Config knobs
6. Acceptance checklist with pass/fail notes from the overnight run
7. Known limitations (brute-force search, no FS watcher, no Qdrant)

---

## 17. Morning review rubric (for the human)

| Grade | Meaning |
|-------|---------|
| A | A1–A7 green; code readable; README honest |
| B | Remember + inject work; tests thin or summarizer heuristic |
| C | Tools + vault FS only; no inject |
| F | Modified harness core / implemented ladder / unusable |

Human next steps after a B+: optionally swap sqlite brute-force for Qdrant/LanceDB; add FS watch; port richer Eris Synthesis if still desired.

---

## 18. Explicit non-goals (print this when tempted)

- No Eris Rust port  
- No promotion ladder / scores / decay  
- No stage cache  
- No Qdrant requirement for v1  
- No MCP-only solution without Cordis inject  
- No changes to `dsh-agent-loop`  
- No git commits unless the human asks later  
- No rewriting DeepSeek Harness docs  
- No UI settings card unless leftover time (not required)

---

## 19. Decision log (frozen by architect 2026-09-10)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Durability steps | **1** (write md = commit) | User request; Eris ladder dropped |
| Vector DB | SQLite + cosine | Overnight reliability; rebuildable |
| Embeddings | Ollama nomic-embed-text | Matches Eris mental model; local |
| Plugin home | `/Users/jandahlke/dev/hagbards_stuff/dsh-vault-memory` | Out-of-tree; overnight isolation |
| Inject seam | `agent/pre-step` | Auto recall; cookbook Memory alone is insufficient |
| Remember UX | Slash command `/vault-remember` | Human-gated like Eris explicit commit |
| Invariants | Deny agent writes | Sovereignty |

---

## 20. Kickoff checklist for the human before sleep

1. Ollama running; `ollama pull nomic-embed-text`
2. DeepSeek Harness builds / `pnpm dsh web` works on this machine
3. Point overnight agent at **this file** as the sole spec
4. Working directory: `/Users/jandahlke/dev/hagbards_stuff/dsh-vault-memory`
5. Allow network only as needed for local Ollama / local npm
6. In the morning: read `README.md` acceptance section + try `/vault-remember`

---

*End of handover. Implement phases 0→6. Ship the smallest thing that passes A1–A7.*
