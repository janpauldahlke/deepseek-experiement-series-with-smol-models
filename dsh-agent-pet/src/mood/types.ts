/**
 * Frozen L0 mood spine (PLAN §3). `Mood` is the presentation vocabulary; `PetSignal`
 * is the discrete observation the client derives from Session events. The reducer
 * is a pure function of (state, signal, now) — no React, DOM, or Three here.
 */

export type Mood =
  | 'idle'
  | 'think'
  | 'talk'
  | 'work'
  | 'happy'
  | 'sad'
  | 'surprised'
  | 'sneeze'

/**
 * One discrete observation of agent activity (L0). The client maps Session
 * events onto these; `tick` is the per-frame clock that auto-resolves transient
 * moods back to idle.
 */
export type PetSignal =
  | { readonly type: 'turn:start' }
  | { readonly type: 'assistant:stream' }
  | { readonly type: 'tool:call' }
  | { readonly type: 'tool:result-error' }
  | { readonly type: 'turn:end-ok' }
  | { readonly type: 'turn:end-error' }
  | { readonly type: 'idle' }
  | { readonly type: 'sneeze' }
  | { readonly type: 'tick' }

/** Current mood plus the timing metadata needed to auto-resolve transient moods. */
export interface MoodState {
  readonly mood: Mood
  /** Wall-clock ms the current mood began. */
  readonly since: number
  /**
   * Wall-clock ms at which a transient mood auto-resolves to idle. Absent for
   * persistent moods (idle/think/talk/work).
   */
  readonly resolveAt?: number
}

export const INITIAL_MOOD_STATE: MoodState = { mood: 'idle', since: 0 }

/** Hold durations (ms) for transient moods before they resolve to idle. */
export const MOOD_HOLD_MS = {
  happy: 1500,
  sad: 2500,
  sneeze: 1200,
} as const
