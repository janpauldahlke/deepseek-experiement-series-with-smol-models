# dsh-agent-pet

DeepSeek Harness Web Client plugin: a Kirby-like companion blob on `shell.overlay` whose
moods react to agent (session) activity. Observe-only, no pointer interaction
(`pointer-events: none` on both the overlay root and the canvas, because the overlay
layer re-enables pointer events on its direct children).

**Experiment:** long-running **agentic coding** with a cluster-hosted ~27B local model
(Qwen3.8-class) + DeepSeek Harness — **HITL≈0** means minimal human babysitting overnight,
not “the pet has no buttons.”

**Specs:** [`PLAN.md`](./PLAN.md) (§0.5 gaps) · [`BLUEPRINTS.md`](./BLUEPRINTS.md)

---

## The load shape (proven end-to-end)

Own `pnpm build` → a **host-only** `--patch` inserts one row → the **`dsh.client`
declaration in `package.json`** is what makes the built `lib/client.js` enter the
`window.__DSH_BOOT__` graph → served at `/plugins/??dsh-agent-pet/client.js` → the
browser registers it and mounts `AgentPetOverlay` into `shell.overlay`. `three` is a local
dep **inlined** into that client bundle (only `react`, `react/jsx-runtime` stay external).

### Build

```sh
pnpm build          # = tsdown (host → lib/index.js) && tsdown -c tsdown.client.config.ts (client → lib/client.js)
pnpm test           # node --test tests/**/*.test.ts  (pure reduceMood, 12 cases)
pnpm typecheck
```

The two `tsdown` invocations are **required**: an array `export default [host, client]`
builds only the first config.

### Load (throwaway instance — do NOT restart the operator’s 3090 session)

```sh
# from the harness checkout:
dsh web --patch <abs>/dsh-agent-pet/cordis.yml --port 3091 --no-open
# → prints a token URL; open it in a browser to see the blob bottom-right.
```

`cordis.yml` is **host-only**: it inserts one row whose `name` is the resolvable package
name (`dsh-agent-pet`) plus a `config:` block (species/corner/size/reducedMotion) that the
host `apply(ctx, config)` boot-injects as `globalThis.__AGENT_PET_CONFIG__`. The client half
is **not** listed in the yml.

---

## The two gotchas that block an out-of-tree client bundle

Both were hit and fixed; they are the whole story of why the row was absent from
`__DSH_BOOT__` with no error.

1. **`package.json` must carry the `dsh.client` declaration.** The Node half
   (`@deepseek-ai/dsh-client-modules`, `ClientModuleRegistry`) reads
   `pkg.dsh.client`; if it is absent, `parseDshClient` returns `undefined` and the entry is
   dropped **silently** (no graph row, no log). This was the actual blocker — the host half
   loaded and injected config fine while the client row never appeared.

   ```jsonc
   "dsh": { "client": { "platform": "web", "immediately": true, "inject": [] } }
   ```

   alongside `exports["./client"]` (the built bundle path).

2. **The entry `name` must resolve from the *profile* dir, not this repo.** The scan calls
   `internal.resolveSync(entry.parent.tree.ctx.baseUrl, name)` and `baseUrl` is
   `~/.dsh/profiles/web/`. So an out-of-tree package must be **linked into the profile’s own
   node_modules** for the bare name to resolve:

   ```sh
   ln -sfn <abs>/dsh-agent-pet "$HOME/.dsh/profiles/web/node_modules/dsh-agent-pet"
   ```

   What does **not** work: a relative `./lib/index.js` (re-resolves against the profile base,
   missing), a `file:` dir specifier (tsx directory resolution looks for `index.json` and
   crashes the tree), and a name linked only into the harness checkout’s node_modules
   (the scan resolves from the profile dir, not the checkout).

---

## Acceptance status

| # | Criterion | Status |
|---|-----------|--------|
| A1 | Client row in `__DSH_BOOT__`, served at its combo URL, in a preload batch, registration intact | ✅ proven |
| A2 | Blob visible in the configured corner | ✅ code-verified (`position:fixed` + corner offset + `zIndex:9999`, sized canvas, `kirby-blob` `species.create`); visual render needs a live browser |
| A3 | Click-through — `pointer-events: none` on **both** overlay root and canvas | ✅ proven |
| A4 | Moods react to a real agent turn | ⏳ needs a live browser with an active session |
| A7 | `reduceMood` is pure (12 test cases) | ✅ proven |

## Harness deltas

- **No harness source was edited.** The only external touch is a local symlink
  `~/.dsh/profiles/web/node_modules/dsh-agent-pet` → this package (a transient, gitignored
  profile install, exactly what the profile’s hoisted pnpm linker is for out-of-tree
  plugins). It is created/removed by the `ln -sfn` above and does not modify the harness
  checkout.
- To make the pet appear in the operator’s **existing** session (not a throwaway), add the
  same row to the profile’s own `cordis.patch.yml` (a persistent user patch layer) — do this
  only with the operator’s sign-off, since it changes every web session and may live-reload
  a running one.
