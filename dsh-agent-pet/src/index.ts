/**
 * Host face for dsh-agent-pet. Loaded by the CLI's loader from the host-only
 * `--patch` yml. Reads the raw `config:` block, resolves it against defaults,
 * and boot-injects the resolved config as a global for the client bundle to read.
 *
 * No value import of any `@deepseek-ai/*` workspace package: the out-of-tree
 * host cannot resolve them. Only `resolvePetConfig` (this package's own pure
 * module) and the injected `ctx` are used.
 */
import type { Context } from '@deepseek-ai/cordis'
import { resolvePetConfig } from './config.ts'

export const name = 'agent-pet'

/** A minimal structural view of a `webserver/index-inject` table row. */
interface IndexInjectionRow {
  readonly kind: string
  readonly name: string
  readonly value: unknown
}

export function apply(ctx: Context, config?: unknown): void {
  const resolved = resolvePetConfig(config)
  ctx.logger.info('agent-pet host plugin loaded', {
    speciesId: resolved.speciesId,
    corner: resolved.corner,
    sizePx: resolved.sizePx,
    reducedMotion: resolved.reducedMotion,
    enabled: resolved.enabled,
  })

  // Boot-inject the resolved config as a JSON global, evaluated before the client
  // bundle runs. Only lossless JSON crosses this boundary.
  ctx.on(
    'webserver/index-inject',
    (table: IndexInjectionRow[]) => {
      table.push({ kind: 'global', name: '__AGENT_PET_CONFIG__', value: resolved })
    },
  )
}
