# Overnight Handover: `dsh-agent-pet`

**Status:** ready for autonomous overnight implementation (gaps 1–7 closed 2026-09-10)  
**Date:** 2026-09-10  
**Experiment root:** `/Users/jandahlke/dev/hagbards_stuff/FlexLLM_DeepSeek_Experiments`  
**Plugin home (implement here):** `/Users/jandahlke/dev/hagbards_stuff/FlexLLM_DeepSeek_Experiments/dsh-agent-pet/`  
**Harness clone (reference + limited edits OK):** `/Users/jandahlke/dev/hagbards_stuff/deepseek-harness` (`master`, `pnpm run build` / `pnpm dsh web`)  
**Cordis + howto map:** [`BLUEPRINTS.md`](./BLUEPRINTS.md) — read Tier A/B before coding  
**Human role:** architecture / spec; morning review of what the overnight agent produced  
**Implementer:** Qwen3.8 ~27B Q8 (or similar) running **agentic coding** via DeepSeek Harness against a **company server-cluster local model** — long-running, minimally supervised  
**Human does NOT write production code in this run**

**Related (parked):** vault-memory lives at `../dsh-vault-memory/` — do **not** implement it in this run.

**Meta:** This is a **long-running agentic coding behavior experiment**. A colleague hosts the weights on a cluster; the harness drives multi-hour tool use with near-zero human-in-the-loop. The pet plugin is a **concrete deliverable** that also forces real DSH client packaging (`--patch` → `dsh.client` → visible UI). Dual outcome: (1) observe how a ~27B local coder behaves overnight; (2) leave a working cute artifact + learned plugin path. L0/L1/L2 spine stays frozen.

---

## 0. Instructions for the overnight agent (read first)

You are implementing an **out-of-tree DeepSeek Harness Web Client plugin**: a VS Code Pets–style companion — a cute Kirby-like blob in a small Three.js canvas — whose emotions react to agent activity.

### Mission

1. **Primary — long-running local agentic coding:** Work autonomously from this plan for many hours with **minimal human intervention**. Do not stop to ask the operator for product decisions already frozen here. The scientific question is how a cluster-hosted ~27B model + DeepSeek Harness behaves on a real multi-phase plugin task (stuck loops, packaging walls, recovery, honesty in README).
2. **Deliverable — ship the pet:** Prove `--patch` → client plugin → visible UI end-to-end; one adorable species with several emotion states; extensible registry for a later second species.
3. **Observability of success:** Humans may glance at the Web UI / logs in the morning; they are **not** in the loop to click through wizards, approve each step, or babysit. Design the pet itself with **no required clicks** (`pointer-events: none`) so the artifact matches that low-HITL posture — but “no pet clicks” is a **UI constraint**, not the definition of HITL≈0.
4. Prefer frozen decisions in this plan over inventing new scope. When blocked, use the escape hatches already written (canvas2d, experimental relocate) instead of waiting for a human.

### Non-negotiable constraints

1. Prefer implementing under `FlexLLM_DeepSeek_Experiments/dsh-agent-pet/`. Harness edits allowed only under [`BLUEPRINTS.md`](./BLUEPRINTS.md) §2 (experimental package / example overlay / last-resort). **Never modify** `@deepseek-ai/dsh-client-*` / `packages/client/*` internals to “make the pet work” — consume them as peers/APIs only.
2. Target **`dsh web` only** (not Electron desktop, not ACP).
3. Mount the pet in **`shell.overlay`** (list slot; floating; layer is click-through by default).
4. **No pointer interaction** on the pet UI: `pointer-events: none`; **no** click/drag handlers. (UI constraint aligned with low-HITL observation — separate from “do not ask the human for help.”)
5. Ship **one species** (`kirby-blob`) but structure code so a second species is a new module + registry entry, not a rewrite.
6. **Observe-only** emotion for v0: derive mood from harness/session/UI signals. Do **not** require a model tool like `pet_emote` for the demo to work.
7. **Do not implement full RPG needs/meters** overnight (hunger, affection decay, “must pet”). Leave a **stub interface + TODO** only (§3.1 L2).
8. Prefer **simple Three.js** (or R3F if the client bundler already likes React). If R3F fights the client purity gate, fall back to vanilla `three` + a canvas ref in React.
9. No vault/memory/RAG work in this package.
10. **Top risk = out-of-tree client-graph resolve** (§G7). Mechanism is pinned (host-only patch + own `pnpm build` + `dsh.client` + inline `three`). If stuck >30 minutes on Loader/baseUrl, relocate to `packages/experimental/agent-pet`. Canvas2d is a render fallback, not a packaging bypass.
11. **Acceptance runtime = second `dsh web` on another `--port`** (§G6). Do not restart the operator’s primary session to self-test.

### Success definition (must all pass by morning)

| # | Acceptance |
|---|------------|
| A1 | After `pnpm install && pnpm build` in `dsh-agent-pet`, Host-only `--patch` insert loads without crashing Web UI; client half appears in boot graph (overlay can mount) |
| A2 | Pet canvas visible in a screen corner (default bottom-right), ~140–180px |
| A3 | Idle animation loops (bob / breathe) without user input |
| A4 | At least **4** distinct moods visibly change during a real chat turn (e.g. idle → think → talk → happy) |
| A5 | Settings (or Cordis config) can toggle **enabled**, pick **corner**, and select **species id** (even if only one species exists) |
| A6 | Registry pattern: adding a fake second species stub compiles / is documented in README as “drop file here” |
| A7 | README with run steps + emotion mapping table; `pnpm test` (or `node --test`) covers pure mood reducer |

### Stop conditions

Stop when A1–A7 pass. Do **not** implement: click-to-pet, drag, multiple simultaneous pets, physics, lip-sync phonemes, voice, needs meters gameplay, model tools, desktop Electron, vault memory.

---

## 0.5 Gap closures (iteration 2026-09-10)

Ground-checked against harness. These freeze architecture so overnight does not thrash.

### G1 — Client signal channel (pinned + Phase-0 fine-tuning)

**Pinned mechanism (do not invent a parallel bus):**

1. Resolve the **focused / current session** via the sessions client domain (`useSessions` standard hook / `SessionsService` selection — see `packages/api/session-controller/src/client/contract/sessions.ts` and `packages/client/ui-session`).
2. Obtain that session’s **`SessionBinding`** (or session object exposing the same face).
3. Subscribe to **`binding.eventSource`** (`getSnapshot` / `subscribe`) from `@deepseek-ai/dsh-api-session-controller/client`.
4. Map **window entries** → L0 signals. Event types already used by `ui-chat` nodes include:
   - `turn/start`
   - `assistant/live-chunk` (streaming)
   - `tool/call`, `tool/result` (incl. `surfaceOp === 'append'`)
   - `turn/end` (inspect `data.reason`; `reason.kind === 'error'` is turn-level failure — see `turn-tail.ts`)

**Import rule:** client plugins may depend on `@deepseek-ai/dsh-client-*` and `@deepseek-ai/dsh-api-session-controller` as **peers / type imports** per client purity conventions. **Never modify those packages** for the pet.

**Phase-0 discovery (authorized, timebox ≤45 min):** exact `inject` list and how an overlay occupant reaches `current` session binding (slot inject face vs `ctx` service). Write findings into README “Signal wiring”. If `eventSource` is awkward from overlay scope, authorized fallback: a tiny `ConversationNodeDefinition` that only dispatches L0 signals (no visible chat chrome) — still observe-only.

**Do not** scan `snapshot.chat.nodes` every frame; subscribe once and reduce.

### G2 — `listen` semantics (frozen)

**Confirmed:** `listen` is a short **“user just spoke / turn began” blip**, not composer typing detection (no access to the input field required).

On `turn/start` → enter `listen` for **~400ms**, then transition to `think` unless a higher-priority signal already arrived.

### G3 — Hold vs priority (frozen)

| Rule | Behavior |
|------|----------|
| Higher-priority signal arrives during a hold | **Breaks the hold immediately**; apply new mood |
| Lower-or-equal priority during a hold | **Swallowed**; hold continues until expiry or a higher signal |

Priority (high → low): `shock` > `sad` > `work` > `talk` > `think` > `listen` > `idle`  
(`happy` is a success hold after turn end; treat as mid-high: breaks `listen/think/talk/work` idle falls, but is broken by `shock/sad/work` if a new turn starts oddly — practical rule: `happy` hold breaks on any new `turn/start`.)

### G4 — `sad` vs `shock` (frozen)

| Failure class | Mood |
|---------------|------|
| Tool-level failure (`tool/result` error / isError) | `sad` |
| Turn-level failure (`turn/end` with `reason.kind === 'error'`, or equivalent turn error surface) | `shock` |

If ambiguous, prefer `shock` only when the whole turn is marked failed; otherwise `sad`.

### G5 — Config → client delivery (pinned + fallback)

**Preferred (stretch):** Host settings namespace + client `ctx.settingsScope.bind({ namespace: 'agent-pet' })` like `ui-theme` / settings-card cookbook — client reads `enabled/corner/speciesId/sizePx/reducedMotion` live.

**Phase-0 check:** confirm settingsScope reaches an out-of-tree / experimental client entry.

**Frozen fallback (A5 still passes):** if settings cannot reach the client half overnight, ship Cordis Host `Config` defaults + values in `cordis.yml`; client uses **bundled defaults** (or a one-shot boot injection if trivial). Document “live settings card = morning follow-up”. A5 = knobs exist and change behavior after reload, not necessarily a pretty Plugins card.

### G6 — Acceptance runtime (frozen)

**Pick (a): second `dsh web` instance on a different `--port`.**

- Default product UI may already be on `3080`.
- Acceptance: from harness root, e.g.  
  `pnpm dsh web --port 3090 --no-open --patch <absolute-path-to>/dsh-agent-pet/cordis.yml`
- Self-verify A4 by sending a test prompt on **3090** without killing the operator’s primary conversation.
- Do **not** choose restart-and-resume of the planning session for acceptance.

Absolute paths in the patch YAML are mandatory (tutorial); README must spell them.

### G7 — Dependency / packaging boundary (top risk — **mechanism pinned**)

Grounded on `packages/experimental/inspector` patch YAMLs + `package.json` `dsh.client` / `exports["./client"]`.

**Asymmetry (frozen):** `cordis.yml` inserts the **Host face only**. The client half **never** appears in the patch YAML. Inserting the host entry makes the Loader resolve the **owning package manifest**; that manifest’s `dsh.client` + `exports["./client"]` is what `ctx.clientModules` scans into the boot graph. Even the inspector “source” demo serves the client from a **prebuilt** `lib/client.js` bundle.

`dsh-agent-pet` sits **outside** the harness pnpm workspace, but must still be a **real package** with that same shape.

| Concern | Frozen rule |
|---------|-------------|
| Own build | **Required.** `pnpm install && pnpm build` inside `dsh-agent-pet` before any A1 launch. Emit `lib/index.js` (host) + `lib/client.js` (browser). Mirror inspector: `tsdown.config.ts`, host/client tsconfigs, `lib/` output. |
| Patch insert | Host face only, e.g. `name: './src/index.ts'` (yml-anchored) or absolute path to host entry. **Do not** list the client in `cordis.yml`. |
| `dsh.client` | Mirror inspector **verbatim**: `{ "platform": "web", "immediately": true, "inject": [] }` so the overlay mounts at shell boot, not lazily. |
| `exports["./client"]` | Points at **built** `lib/client.js` (one browser-consumed file). |
| `three` as dependency | **Yes** — declare in **this** `package.json`, install under `dsh-agent-pet/node_modules`. Never add `three` to harness root. |
| `three` at runtime | Browser cannot resolve bare `import 'three'` from `/plugins` combo. tsdown **must bundle (inline) `three` into `lib/client.js`**. Do **not** externalize `three`. Contrast: `@deepseek-ai/*` stay external (harness module graph provides them). This is a **Phase-0/1 build setting**, not a discovery. |
| Out-of-tree unknown | Whether Loader “owning-tree baseUrl” resolves a package in a **different repo**. Prove in Phase 0; if balks within **30 min**, relocate to `deepseek-harness/packages/experimental/agent-pet`. |
| Escape hatches (ordered) | (1) canvas2d still on `shell.overlay` but keep build/`dsh.client` shape; (2) experimental in-tree package; (3) `file:` profile install — last resort. |

Treat slots as **solved in docs**. Budget time for **build + client graph**, not inventing a second load path.

---

### G-minor — Mood store (adopted)

Mood state lives in a tiny **module-singleton** store (`getState` / `subscribe` / `dispatch`). `signals.ts` dispatches; `PetCanvas` RAF reads latest mood **without** React re-render per frame. React re-renders only for config/layout (corner, size, enabled, species).

---

## 1. Why this experiment exists

We are testing **long-running agentic coding** with a **locally hosted** mid-size model (Qwen3.8-class ~27B Q8) on a **company server cluster**, driven by DeepSeek Harness. A human colleague keeps the inference box alive; the **coding agent** should run overnight with **near-zero HITL** — no step-by-step babysitting, no “please click approve,” no waiting on the architect for choices already frozen in this plan.

Vault-memory is a later product idea; it needs more human judgment (embeddings, remember UX, retrieval quality). The pet is a **better first overnight probe**: real harness client packaging + visible output + bounded scope, so we can watch how the agent handles Phase 0 walls, rebuild loops, and honest stop conditions.

Questions this run answers:

1. How does a ~27B local agentic coder behave across multi-hour phases (progress, thrash, recovery)?
2. Can that stack author a **real DSH client plugin** (`dsh.client`, host-only patch, built `lib/client.js`) without continuous human steering?
3. Is a visual Three.js task a good overnight workload (lots of concrete code, clear A1–A7)?

If pets ships at grade B+, vault-memory overnight becomes a better-informed next experiment — still under the same low-HITL cluster setup.

---

## 2. Product sketch

### Look

- Soft Kirby-like **blob**: round body, simple eyes, tiny feet optional.
- Low-poly / stylized; pastel colors; squash-and-stretch on state changes.
- Small fixed viewport; does not cover chat input; does not steal focus.
- `shell.overlay` is **click-through**; pet must remain non-interactive (constraint #4).

### Feel

The companion is the agent’s mascot. Watching a long local-model run should feel less like a dead log and more like a tiny creature “living” beside the session.

### Configurability (human asked for options)

Expose at least:

| Setting | Type | Default |
|---------|------|---------|
| `enabled` | boolean | `true` |
| `speciesId` | string | `"kirby-blob"` |
| `corner` | enum: `bottom-right` \| `bottom-left` \| `top-right` \| `top-left` | `bottom-right` |
| `sizePx` | number 96–240 | `160` |
| `reducedMotion` | boolean | `false` (when true: crossfade colors, no bob) |

Prefer Host settings namespace + Plugins settings card if feasible in overnight time (§7). Minimum bar: Cordis `Config` schema read at load; settings card is Phase 1b if time allows.

---

## 3. Architecture (important — read carefully)

This section freezes the **emotion / RPG contract** the human was unsure about.

### 3.1 Three layers (do not collapse them)

```text
┌─────────────────────────────────────────────────────────┐
│  L0  Harness signals   (facts: streaming, tool, error)  │  observe
├─────────────────────────────────────────────────────────┤
│  L1  Mood              (display FSM for the mesh)       │  overnight
├─────────────────────────────────────────────────────────┤
│  L2  Needs / RPG       (meters, decay, “care”)          │  STUB ONLY
└─────────────────────────────────────────────────────────┘
```

**L0 — Signals**  
Raw, boring facts from the Web Client / session stream. Examples:

- `turn/start`
- assistant live chunks / streaming
- tool start / tool end
- turn error
- agent idle / turn end success

These are **not** emotions. They are inputs.

**L1 — Mood**  
A small finite set of presentation states the renderer knows how to animate:

`idle | listen | think | talk | work | happy | sad | shock`

Mood is derived by a **pure reducer**:

```ts
mood' = reduceMood(mood, signal, now)
```

Plus short **hold timers** (e.g. stay `happy` 1.5s after turn success, then fall back to `idle`).

Overnight: **implement L0→L1 fully.**

**L2 — Needs (RPG) — intentionally deferred**  
Human intuition: “for the agent it’s an RPG; maybe meters; maybe you must pet it” — but also “maybe too far,” and **no click** is frozen.

So overnight:

- Define TypeScript interfaces only, e.g. `NeedsState`, `NeedsEngine` with `tick(dt)`, `onSignal(signal)`.
- Implement `NoopNeedsEngine` that always returns neutral multipliers `(1,1,1)`.
- Document in README: Phase 2 could add hunger/affection that **tint** mood or change idle animation — still without clicks (meters driven only by agent activity), or later with opt-in interaction.

**Do not** let L2 design block L1 shipping.

### 3.2 Why not a model tool overnight?

A `pet_emote` tool would make the **LLM** the RPG director. That is architecturally interesting later (agent chooses to express), but:

- Requires tool registration + prompt text + model cooperation (extra verification surface during a low-HITL overnight run).
- Breaks the “agent works alone; humans only observe later” posture if the demo depends on the model remembering to call `pet_emote`.
- Can be added later as an **optional L0 signal source** (`signal.kind = 'emote', mood = 'happy'`) without changing the renderer.

Frozen: **observe-only L0** for v0. Leave a comment hook `ingestManualEmote(mood)` for future tools.

### 3.3 Species extensibility (one pet now, easy add later)

```ts
interface PetSpecies {
  id: string
  displayName: string
  /** Build / update the Three.js object graph for this species */
  createView(ctx: PetViewContext): PetView
}

interface PetView {
  root: THREE.Object3D
  setMood(mood: Mood, opts: { reducedMotion: boolean }): void
  dispose(): void
}
```

Registry:

```ts
const speciesRegistry = new Map<string, PetSpecies>()
registerSpecies(kirbyBlob)
// later: registerSpecies(catBlob)
```

Settings `speciesId` selects from registry; unknown id → fallback `kirby-blob` + warn log.

**Kirby-blob** is the only real implementation overnight. Optionally add `species/placeholder-box.ts` as a second registered species (colored cube) to prove A6 without art time.

### 3.4 Package split (Host vs Client) — inspector shape

| Half | Path | Role |
|------|------|------|
| Host | `src/index.ts` → `lib/index.js` | Cordis `apply`, Config; **only** face named in `--patch` |
| Client | `src/client/index.ts` → `lib/client.js` | `shell.overlay` registration, React+Three, signals |

**`package.json` must include** (mirror inspector):

```json
{
  "exports": {
    ".": { "default": "./lib/index.js" },
    "./client": { "default": "./lib/client.js" }
  },
  "dsh": {
    "client": {
      "platform": "web",
      "immediately": true,
      "inject": []
    }
  },
  "dependencies": {
    "three": "<pin a current stable>"
  }
}
```

Peer `@deepseek-ai/*` as required; build with tsdown so **`three` is inlined** into `lib/client.js` while `@deepseek-ai/*` remain external.

Reference: `packages/experimental/inspector/` (`cordis.source.patch.yml`, `package.json` `dsh.client`, `tsdown.config.ts`).

If Host+Client packaging blocks overnight after the experimental relocate: canvas2d client still via same `dsh.client` path — do not fall back to a Host-only hello-plugin with no client graph row.

---

## 4. L0 signal → L1 mood mapping (implement this table)

| Signal (approx) | Mood | Hold |
|-----------------|------|------|
| Agent idle / no open turn | `idle` | — |
| `turn/start` | `listen` → then `think` | listen **400ms** (G2), then think |
| Waiting for first assistant token | `think` | until stream / higher signal |
| `assistant/live-chunk` text | `talk` | while streaming |
| `tool/call` active | `work` | while tools active |
| `turn/end` success | `happy` | 1500ms → idle (broken by new `turn/start`) |
| Tool-level failure | `sad` | 2000ms → idle (G4) |
| Turn-level failure | `shock` | 2000ms → idle (G4) |

**Hold vs priority:** G3 (higher breaks immediately; lower swallowed).

Priority when multiple true: `shock > sad > work > talk > think > listen > idle` (+ `happy` hold rules in G3).

Exact binding/subscribe wiring: **G1**. Phase-0 may refine event field names; do not change this table’s meaning.

---

## 5. Mount point (frozen)

**Slot:** `shell.overlay`  
**Declared in:** `packages/client/ui-layout/src/client/index.ts`  
**Kind:** `list`, `scope: 'root'`  
**Semantics:** frame-wide floating layer; additive; click-through; occupants order among themselves.

Register something like:

```ts
ctx.slots.inject('shell.overlay', () =>
  ctx.slots.register({
    name: 'shell.overlay',
    key: 'agent-pet',
    // order: pick a high number so it sits above toasts if needed
  }, AgentPetOverlay),
)
```

CSS: position fixed to configured corner; z-index appropriate; **`pointer-events: none`**.

Docs: `docs/subsystems/slots.md` (slot tree includes `shell.overlay`).

---

## 6. Three.js guidance (overnight-friendly)

### Preferred approach

1. React component registered in the slot.
2. `useEffect` creates `THREE.Scene`, `PerspectiveCamera` or `OrthographicCamera`, `WebGLRenderer` with alpha.
3. Kirby = `SphereGeometry` body + two eye meshes + optional blush; materials `MeshStandardMaterial` or unlit.
4. `setMood`:
   - `idle`: slow Y bob + scale breathe
   - `think`: eyes look up / slight lean; slower bob
   - `talk`: scale pulse synced to a simple timer (not real audio)
   - `work`: faster bob / sweat drop sprite optional
   - `happy`: squash jump once + smile (eye shape)
   - `sad`: flatten + look down
   - `shock`: scale punch + wide eyes
5. `requestAnimationFrame` loop; dispose on unmount (cancel RAF, `renderer.dispose()`, geometries/materials).

### Dependencies

- `three` **required** as a **package dependency** of `dsh-agent-pet` (G7).
- Build **must inline** `three` into `lib/client.js` (browser has no `node_modules`).
- `@react-three/fiber` **optional** — only if it also gets inlined cleanly; else vanilla `three` + canvas ref.
- Never expect harness PLATFORM_MODULES to provide `three`.

### Performance

- One small canvas; DPR capped at `2`.
- Pause RAF when `document.hidden` or `enabled === false`.
- No postprocessing stacks.

### Fallback

If WebGL fails: 2D canvas drawing the same moods with circles. Still counts for A2–A4.

---

## 7. Settings / options

See **G5**. Summary:

### Minimum (must — A5)

Cordis plugin `Config` + `cordis.yml` values; client reads via settingsScope **or** bundled defaults after reload.

### Stretch

Settings card per `docs/cookbook/adding-a-settings-card.md` (namespace `agent-pet`).

### Patch + launch (G6 + G7)

`cordis.yml` inserts **host only** (inspector asymmetry). Absolute path is the safe superset; yml-anchored relative (inspector style) is fine when the patch file lives beside the package:

```yaml
# cordis.yml — HOST face only; client comes from package.json dsh.client + lib/client.js
- insert:
    - id: agent-pet
      name: './src/index.ts'
```

Acceptance launch:

```sh
cd /Users/jandahlke/dev/hagbards_stuff/FlexLLM_DeepSeek_Experiments/dsh-agent-pet
pnpm install && pnpm build

cd /Users/jandahlke/dev/hagbards_stuff/deepseek-harness
pnpm dsh web --port 3090 --no-open --patch /Users/jandahlke/dev/hagbards_stuff/FlexLLM_DeepSeek_Experiments/dsh-agent-pet/cordis.yml
```

Rebuild `dsh-agent-pet` after every client source change before expecting UI updates (unless you later wire HMR the inspector way).

---

## 8. Target package layout

```text
dsh-agent-pet/
  PLAN.md
  BLUEPRINTS.md
  README.md
  package.json                 # dsh.client + exports["./client"] + dep "three"
  tsconfig.json
  tsconfig.host.json
  tsconfig.client.json
  tsdown.config.ts             # host + client; INLINE three; externalize @deepseek-ai/*
  cordis.yml                   # HOST insert only
  lib/                         # build output (gitignored OK)
    index.js
    client.js
  src/
    index.ts                   # Host apply + Config
    config.ts
    mood/
      types.ts
      reduceMood.ts
      reduceMood.test.ts
    needs/
      types.ts
      noop.ts
    species/
      types.ts
      registry.ts
      kirbyBlob.ts
      placeholderBox.ts
  src/client/
    index.ts                   # shell.overlay
    AgentPetOverlay.tsx
    PetCanvas.tsx
    signals.ts
    moodStore.ts
    settingsCard.tsx           # stretch
  tests/
    reduceMood.spec.ts
```

---

## 9. Implementation phases

### Phase 0 — Spike (45–90 min) — **start here**

1. Read [`BLUEPRINTS.md`](./BLUEPRINTS.md) Tier A2/A3 + B1/B6 + client-modules skim; skim **inspector** `cordis.source.patch.yml` + `package.json` `dsh` block.
2. Scaffold `package.json` (`dsh.client` verbatim), tsdown (inline `three`), empty Host+Client `apply`, `cordis.yml` host-only insert.
3. `pnpm install && pnpm build` here; prove Host `--patch` on **3090**.
4. **G7 open unknown:** confirm `lib/client.js` appears in `__DSH_BOOT__` / boot graph from out-of-tree package. If Loader balks → relocate to `packages/experimental/agent-pet` within 30 min.
5. **G1:** debug log moods from `eventSource` (no Three yet).

### Phase 1 — Scaffold polish (30–60 min)

- Solidify build scripts, Config schema, overlay colored box (proves A1/A2 without WebGL).
- Document run-steps in README (`install` → `build` → `dsh web --port 3090 --patch …`).

### Phase 2 — Overlay shell (30–60 min)

- Fixed corner box with solid color; no Three yet.
- Prove A1 visually.

### Phase 3 — Mood reducer (45–60 min)

- Implement `reduceMood` + unit tests (A7 core).
- Fake signal pump in dev to flip moods.

### Phase 4 — Wire real signals (60–120 min)

- Connect to live assistant / tool / turn events.
- Log mood transitions at debug level.

### Phase 5 — Kirby Three.js (90–150 min)

- Mesh + idle bob + mood switches (A2–A4).

### Phase 6 — Config + registry + README (45–90 min)

- Config knobs; species registry; placeholder second species; README; self-run A1–A7.

**Stretch:** settings card, happier eye morphs, happy jump polish.

---

## 10. Must-read harness docs / files

| Path | Why |
|------|-----|
| `docs/subsystems/slots.md` | Slot model; `shell.overlay` |
| `docs/subsystems/web-client.md` | Client composition |
| `docs/cookbook/extension-cookbook.md` | UI plugin row |
| `docs/cookbook/adding-a-settings-card.md` | Options UI |
| `docs/user/develop/basic/index.md` + `tool.md` | `--patch` workflow (adapt for client) |
| `packages/client/ui-layout/src/client/index.ts` | Declares `shell.overlay` |
| `packages/experimental/inspector/` | **Canonical** host-only patch + `dsh.client` + built `./client` |
| `packages/client/ui-theme/` | SettingsScope / Host+client packaging alternate |
| `packages/client/ui-chat/` | Where live turn/stream UI interprets events |
| `docs/subsystems/client-modules.md` | Why client is scanned from manifest, not cordis.yml |

Harness root: `/Users/jandahlke/dev/hagbards_stuff/deepseek-harness`

---

## 11. Testing

- Pure tests for `reduceMood` (no WebGL in CI unit tests).
- Manual: start web → send a prompt to local model → watch mood cycle.
- Do not require screenshots files in repo; describe what you saw in README “Overnight run notes”.

---

## 12. Observability

- Use Cordis/client logger conventions; avoid `console.log` spam in RAF.
- Debug: mood transition `idle→think→talk→happy`.

---

## 13. README requirements (leave behind)

1. Prerequisites (`dsh web`, Node, Ollama-not-needed)
2. **Build:** `pnpm install && pnpm build` inside `dsh-agent-pet` (client is always prebuilt)
3. Exact acceptance launch: `pnpm dsh web --port 3090 --no-open --patch <path-to>/cordis.yml` from harness root
4. Note: patch inserts **host only**; `three` is a dep and is **inlined** into `lib/client.js`
5. Emotion mapping table (copy §4 / G2–G4)
6. Config knobs
7. How to add a species (3 bullets)
8. Acceptance checklist + overnight notes
9. Explicit: Needs/RPG deferred; no click; vault parked; out-of-tree vs experimental outcome

---

## 14. Morning review rubric (human)

| Grade | Meaning |
|-------|---------|
| A | A1–A7; Kirby cute; settings or solid Config; clean registry |
| B | Visible pet + ≥4 moods on real turns; tests for reducer; packaging rough |
| C | Overlay + color moods only (no Three) but wired to signals |
| F | Modified harness core / click required / nothing visible |

---

## 15. Decision log (frozen 2026-09-10; gaps closed same day)

| Topic | Decision |
|-------|----------|
| Work root | `FlexLLM_DeepSeek_Experiments/dsh-agent-pet` (+ experimental harness fallback) |
| Mount | `shell.overlay`, corner configurable |
| Species | One real (`kirby-blob`) + registry for easy add |
| Interaction | **No click** / no pointer handlers |
| Emotion contract | L0 → L1 reducer; L2 needs **stub only** |
| Signals | `SessionBinding.eventSource` (G1); Phase-0 for inject details |
| listen | 400ms turn-start blip (G2) |
| Hold/priority | Higher breaks; lower swallowed (G3) |
| sad/shock | tool fail → sad; turn fail → shock (G4) |
| Config→client | settingsScope preferred; cordis.yml+defaults fallback (G5) |
| Acceptance | **Second** `dsh web --port 3090` (G6) |
| Packaging risk | #1 = out-of-tree manifest resolve; **mechanism** = host-only patch + `dsh.client` + built client (G7) |
| Own build | **Required** (`tsdown` → `lib/`); README: install+build before A1 |
| `three` | Dep in `dsh-agent-pet` package.json; **inlined** into `lib/client.js` (not harness-provided) |
| `dsh.client` | `{ platform: 'web', immediately: true, inject: [] }` (inspector verbatim) |
| Patch YAML | Host face only; client never listed |
| Mood store | Module singleton; RAF reads without React/frame (G-minor) |
| Model tool emote | Deferred (hook only) |
| Target app | `dsh web` only |
| Blueprints | `BLUEPRINTS.md` + harness clone |
| Vault memory | **Parked** |
| Overnight model | Qwen3.8 ~27B Q8 (cluster-hosted) writes this plugin via harness |
| HITL≈0 meaning | Long-running agentic coding with minimal human babysitting — **not** “pet has no clicks” (that is only a UI constraint) |

---

## 16. Kickoff checklist (human before sleep)

1. `dsh web` already works on this machine against FlexLLM / local model
2. Point overnight agent at **`PLAN.md` + `BLUEPRINTS.md`** as sole specs
3. CWD: `/Users/jandahlke/dev/hagbards_stuff/FlexLLM_DeepSeek_Experiments/dsh-agent-pet`
4. Allow reading (+ limited experimental edits to) `deepseek-harness`
5. Reserve port **3090** for acceptance instance
6. Morning: open `http://127.0.0.1:3090`, run one chat, watch the blob

---

*End of handover. Implement phases 0→6. Ship the smallest adorable thing that passes A1–A7.*
