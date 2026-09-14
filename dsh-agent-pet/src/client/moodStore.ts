import { reduceMood } from '../mood/reduceMood.ts'
import { INITIAL_MOOD_STATE } from '../mood/types.ts'
import type { MoodState, PetSignal } from '../mood/types.ts'

/**
 * Module-level mood store: the single source of truth the overlay reads and the
 * signal wiring writes. It is a plain object with a subscribe/dispatch surface
 * (no React, no framework) so it can be unit-reasoned about and reused by any
 * number of canvas instances.
 */

let state: MoodState = INITIAL_MOOD_STATE
const listeners = new Set<() => void>()

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

/** Read the current mood state (stable reference until the next real change). */
export function getMoodState(): MoodState {
  return state
}

/** Subscribe to mood changes. Returns an unsubscribe function. */
export function subscribeMood(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Feed one L0 signal through the reducer. No-op (no notify) when unchanged. */
export function dispatchSignal(signal: PetSignal, atMs?: number): void {
  const next = reduceMood(state, signal, atMs ?? now())
  if (next === state) return
  state = next
  const subs = [...listeners]
  for (const listener of subs) listener()
}

/** Per-frame clock: auto-resolves transient moods once their hold elapses. */
export function tickMood(atMs?: number): void {
  dispatchSignal({ type: 'tick' }, atMs)
}
