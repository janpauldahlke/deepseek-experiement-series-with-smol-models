import type { Context } from '@deepseek-ai/cordis'
import { AgentPetOverlay } from './AgentPetOverlay.tsx'
import { wirePetSignals } from './signals.ts'

/**
 * Client Cordis face for dsh-agent-pet. The browser module table loads this as
 * a Cordis plugin; `inject` requests the slots service (to register the overlay)
 * and the sessions service (to observe the current session's activity). All
 * observation happens through those injected services — no value import of the
 * session package, so the bundle stays within the browser module table.
 */
export const name = 'agent-pet'

export const inject = ['slots', 'sessions']

export function apply(ctx: Context): void {
  // Wire Session activity -> L0 mood signals. Auto-disposed with the plugin.
  ctx.effect(() => wirePetSignals(ctx), 'agent-pet: signals')

  // Register the click-through overlay in the root-scope shell.overlay list.
  // `inject` defers the registration until the slot is declared by ui-layout.
  ctx.slots.inject(
    'shell.overlay',
    () =>
      ctx.slots.register(
        { name: 'shell.overlay', id: 'agent-pet', order: 100 },
        AgentPetOverlay,
      ),
  )
}
