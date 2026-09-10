# dsh-agent-pet

DeepSeek Harness Web Client plugin: Kirby companion on `shell.overlay`.

**Experiment:** long-running **agentic coding** with a cluster-hosted ~27B local model (Qwen3.8-class) + DeepSeek Harness — **HITL≈0** means minimal human babysitting overnight, not “the pet has no buttons.”

**Specs:** [`PLAN.md`](./PLAN.md) (§0.5 gaps) · [`BLUEPRINTS.md`](./BLUEPRINTS.md)

**Load shape (pinned):** own `pnpm build` → patch inserts **host only** → `dsh.client` pulls built `lib/client.js`. `three` is a local dep **inlined** into that client bundle.

**Acceptance:** `dsh web --port 3090` (do not kill the operator’s main session).

Vault memory parked at `../dsh-vault-memory/`.
