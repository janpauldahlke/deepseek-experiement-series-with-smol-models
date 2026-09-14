import type { MoodState, PetSignal } from './types.ts'
import { MOOD_HOLD_MS } from './types.ts'

/**
 * The pure mood reducer (A7). `(state, signal, now) -> next state` with no
 * React, DOM, Three, timers, or globals — it runs under plain `node --test`.
 * Transient moods (happy/sad/sneeze) carry a `resolveAt`; the per-frame `tick`
 * signal collapses them back to idle once that instant passes.
 */
export function reduceMood(state: MoodState, signal: PetSignal, nowMs: number): MoodState {
  switch (signal.type) {
    case 'turn:start':
      return { mood: 'think', since: nowMs }
    case 'assistant:stream':
      return { mood: 'talk', since: nowMs }
    case 'tool:call':
      return { mood: 'work', since: nowMs }
    case 'tool:result-error':
      return { mood: 'sad', since: nowMs, resolveAt: nowMs + MOOD_HOLD_MS.sad }
    case 'turn:end-ok':
      return { mood: 'happy', since: nowMs, resolveAt: nowMs + MOOD_HOLD_MS.happy }
    case 'turn:end-error':
      return { mood: 'sad', since: nowMs, resolveAt: nowMs + MOOD_HOLD_MS.sad }
    case 'idle':
      return { mood: 'idle', since: nowMs }
    case 'sneeze':
      return { mood: 'sneeze', since: nowMs, resolveAt: nowMs + MOOD_HOLD_MS.sneeze }
    case 'tick':
      if (state.resolveAt !== undefined && nowMs >= state.resolveAt) {
        return { mood: 'idle', since: nowMs }
      }
      return state
    default:
      return state
  }
}
