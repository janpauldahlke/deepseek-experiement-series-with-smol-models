import type { MoodState } from '../mood/types.ts'

/**
 * A v1 need is a 0–1 level that can NUDGE mood but never override it. v0 ships
 * `NoopNeeds` (a single always-zero need) so the mood is still a pure f(signal,
 * now) — no drift, A7-safe. The level is read at render time, never mutated.
 */
export interface Need {
  readonly id: string
  /** Compute this need's current 0–1 level from the mood state. */
  readonly level(state: MoodState): number
}
