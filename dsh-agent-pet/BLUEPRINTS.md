# Blueprints for overnight agents — Cordis + DeepSeek Harness

**Companion to:** [`PLAN.md`](./PLAN.md)  
**Harness clone (human-ready, build mode):** `/Users/jandahlke/dev/hagbards_stuff/deepseek-harness` (`master`)  
**Plugin workdir:** `/Users/jandahlke/dev/hagbards_stuff/FlexLLM_DeepSeek_Experiments/dsh-agent-pet`

Also read **`PLAN.md` §0.5** (gap closures G1–G7) before coding signals/packaging.

Use this file as the **reading map**. Do not invent Cordis APIs from memory when these docs exist.

---

## 0. How the human runs the harness

The operator develops from a **full clone** and uses build/run-from-source:

```text
/Users/jandahlke/dev/hagbards_stuff/deepseek-harness
```

Typical loop (confirm against root README if scripts differ):

```sh
cd /Users/jandahlke/dev/hagbards_stuff/deepseek-harness
pnpm install          # if needed
pnpm run build        # when built artifacts are required
pnpm dsh web --patch /Users/jandahlke/dev/hagbards_stuff/FlexLLM_DeepSeek_Experiments/dsh-agent-pet/cordis.yml
```

First-plugin tutorial run command (from harness root):

```sh
pnpm dsh web --patch ./scratch-plugin/cordis.yml
```

**Implication for you:** the harness repo is a **first-class reference and optional edit target**, not a black box. Prefer out-of-tree plugin files; touch the harness only under the rules in §2.

---

## 1. Reading order (do this before coding UI)

Read in this order. Prefer English `.md` (ignore `.zh.md` unless you need them).

### Tier A — must read (Cordis blueprints)

| # | Doc | What you learn |
|---|-----|----------------|
| A1 | `docs/cordis-tutorial/index.md` | Map of the tutorial |
| A2 | `docs/cordis-tutorial/01-first-plugin.md` | `apply(ctx)`, smallest plugin |
| A3 | `docs/cordis-tutorial/02-lifecycle-and-effects.md` | `ctx.effect`, cleanup / HMR |
| A4 | `docs/cordis-tutorial/03-services.md` | `inject`, services |
| A5 | `docs/cordis-tutorial/04-events.md` | Events / waterfalls |
| A6 | `docs/cordis-tutorial/05-config.md` | Plugin `Config` |
| A7 | `docs/cordis-tutorial/06-composition-and-hmr.md` | Patches, composition |
| A8 | `docs/cordis-tutorial/07-into-the-harness.md` | Bridging Cordis → DSH |

Absolute prefix:

```text
/Users/jandahlke/dev/hagbards_stuff/deepseek-harness/
```

### Tier B — must read (Harness plugin howtos)

| # | Doc | What you learn |
|---|-----|----------------|
| B1 | `docs/user/develop/basic/index.md` | **Your first plugin** + absolute path in `cordis.yml` + `pnpm dsh web --patch` |
| B2 | `docs/user/develop/basic/config.md` | Configurable plugins |
| B3 | `docs/user/develop/basic/tool.md` | Tool plugin shape (pattern; pet is UI-first) |
| B4 | `docs/cookbook/extension-cookbook.md` | Feature → mechanism map (UI / Memory / …) |
| B5 | `docs/cookbook/adding-a-settings-card.md` | Host settings + client card (options UI) |
| B6 | `docs/subsystems/slots.md` | Slots; **`shell.overlay`** |
| B7 | `docs/subsystems/web-client.md` | Client composition |
| B8 | `docs/architecture.md` | Turn flow / where behavior belongs |

### Tier C — read when stuck (API reference)

| Doc | When |
|-----|------|
| `docs/cordis-primer.md` | Need a short mental model |
| `docs/cordis-api/context.md` | `Context` surface |
| `docs/cordis-api/events.md` | Event contracts |
| `docs/cordis-api/fiber.md` | Lifecycle edge cases |
| `docs/cordis-api/service.md` | Service patterns |
| `docs/user/develop/framework/index.md` | Framework practice index |
| `docs/user/develop/practice/index.md` | Capability layering |

### Tier D — copy patterns from code (not docs)

| Path | Steal |
|------|-------|
| `packages/client/ui-layout/src/client/index.ts` | Declares `shell.overlay` |
| `packages/client/ui-theme/` | Host + `src/client` packaging |
| `packages/client/ui-settings-plugins/` | `settings.plugin.item` cards |
| `packages/experimental/inspector/` + `cordis.source.patch.yml` | In-tree experimental + `--patch` demo (`package.json` `demo:inspector`) |
| `apps/cli/config/examples/` | Overlay YAML examples |

---

## 2. Harness edit policy (updated)

The human **allows** harness changes when the out-of-tree plugin cannot land cleanly. Follow this ladder:

### Prefer (default)

1. Implement everything under  
   `FlexLLM_DeepSeek_Experiments/dsh-agent-pet/`
2. Load with `--patch` and an **absolute** plugin path in `cordis.yml` (see B1).

### Allowed in harness (if needed)

Document every harness touch in `dsh-agent-pet/README.md` → section **Harness deltas**.

| Allowed | Examples |
|---------|----------|
| Tiny experimental package under `packages/experimental/…` | Mirror inspector pattern |
| Example overlay under `apps/cli/config/examples/agent-pet/` | Convenience patch YAML |
| Docs-only note in an Agent Note under `.agents/notes/` | Optional |
| One-line bundle/patch include **only if** `--patch` cannot see client graph entries | Last resort; explain why |

### Forbidden without human approval

- Rewriting `dsh-agent-loop` / core turn machine for the pet
- Broad refactors unrelated to mounting/config
- Force-push / history rewrite
- Commits (human commits later)

### After any harness code change

```sh
cd /Users/jandahlke/dev/hagbards_stuff/deepseek-harness
pnpm run build
# then re-run web with patch
```

If you only add an out-of-tree TS plugin loaded by absolute path from source, you may not need a full rebuild — **but** client graph / built mode often does. When unsure, rebuild.

---

## 3. Minimal `cordis.yml` blueprint (inspector asymmetry)

From `packages/experimental/inspector/cordis.source.patch.yml` — insert **Host face only**. Client is **not** listed; it arrives via package `dsh.client` + built `exports["./client"]`.

```yaml
- insert:
    - id: agent-pet
      name: './src/index.ts'   # HOST only; path may be absolute (safe) or yml-anchored relative
```

Before launch: `pnpm install && pnpm build` in `dsh-agent-pet` so `lib/client.js` exists (even “source” demos serve a prebuilt client).

Tutorial “absolute paths” remains the safe superset; not a contradiction with inspector relatives.

**Do not guess client packaging.** Copy inspector + §G7 in `PLAN.md`.

---

## 4. Blueprint checklist before Phase 1 coding

- [ ] Read A2, A3, B1, B6
- [ ] Skim `ui-layout` `shell.overlay` comment block
- [ ] Decide: pure out-of-tree vs `packages/experimental/agent-pet`
- [ ] Write `cordis.yml` with absolute paths
- [ ] Run `pnpm dsh web --patch …` from harness root; confirm load log
- [ ] Only then start Three.js

---

## 5. If docs and code disagree

1. Trust **compiled types + a working in-tree example** over prose.
2. Prefer newer Agent Notes under `deepseek-harness/.agents/notes/implemented/` for contested behavior.
3. Note the discrepancy in README; do not silently invent a third API.

---

*Keep this file updated if you discover a better example package during the overnight run.*
