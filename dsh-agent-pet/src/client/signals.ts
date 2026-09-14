import type { Context } from '@deepseek-ai/cordis'
import { dispatchSignal, getMoodState } from './moodStore.ts'
import type { PetSignal } from '../mood/types.ts'

/**
 * Wire Session activity to L0 mood signals. Runs in the Client Cordis face
 * (`apply`). Subscribes to the sessions list to track the current session, then
 * to that session's event source for fine-grained turn signals. Observation
 * only: this never writes to the session.
 *
 * The event source is reached through the Cordis `sessions` service (DI) — no
 * value import of the session package, so the client bundle stays within the
 * browser module table.
 */

/**
 * Narrow structural view of a Session event. Only the fields the signal map
 * reads are declared, so this file never imports the session package.
 */
interface SessionEventLike {
  readonly type: string
  readonly seq?: number
  readonly data: {
    readonly reason?: { readonly kind?: string }
    readonly error?: { readonly name?: string; readonly code?: string }
  }
}

interface EventEntryLike {
  readonly type: 'event' | 'transient'
  readonly event: SessionEventLike
}

/** Map one event-window entry to an L0 signal (or nothing). */
function signalForEntry(entry: EventEntryLike): PetSignal | undefined {
  const e = entry.event
  if (entry.type === 'transient' && e.type === 'assistant/live-chunk') {
    return { type: 'assistant:stream' }
  }
  if (entry.type !== 'event') return undefined
  switch (e.type) {
    case 'turn/start':
      return { type: 'turn:start' }
    case 'assistant/message':
      return { type: 'assistant:stream' }
    case 'tool/call':
      return { type: 'tool:call' }
    case 'tool/result':
      return e.data.error !== undefined ? { type: 'tool:result-error' } : undefined
    case 'turn/end': {
      const kind = e.data.reason?.kind
      if (kind === 'error') return { type: 'turn:end-error' }
      if (kind === 'completed') return { type: 'turn:end-ok' }
      return { type: 'idle' }
    }
    default:
      return undefined
  }
}

/**
 * Install the signal wiring.
 * @returns dispose function that detaches every subscription.
 */
export function wirePetSignals(ctx: Context): () => void {
  let disposed = false
  let currentId: string | undefined
  let eventSourceDispose: (() => void) | undefined

  const detachEventSource = () => {
    if (eventSourceDispose) {
      eventSourceDispose()
      eventSourceDispose = undefined
    }
  }

  const attachEventSource = (id: string) => {
    detachEventSource()
    let source
    try {
      source = ctx.sessions.binding(id)?.eventSource
    } catch {
      return
    }
    if (!source) return
    eventSourceDispose = source.subscribe(() => {
      if (disposed) return
      let snap
      try {
        snap = source.getSnapshot()
      } catch {
        return
      }
      const change = snap.change
      if (!change) return
      // Live deltas only: never reprocess replace/prepend history.
      const entries: readonly EventEntryLike[] =
        change.kind === 'append'
          ? change.entries
          : change.kind === 'settle-assistant' && change.entry
            ? [change.entry]
            : []
      for (const entry of entries) {
        const signal = signalForEntry(entry)
        if (signal) dispatchSignal(signal)
      }
    })
  }

  const onListChange = () => {
    if (disposed) return
    let listState
    try {
      listState = ctx.sessions.list.getSnapshot()
    } catch {
      return
    }
    const current = listState?.current
    if (current !== currentId) {
      currentId = current
      if (current === undefined) {
        detachEventSource()
        dispatchSignal({ type: 'idle' })
        return
      }
      attachEventSource(current)
    }
    // Coarse fallback: when the session is not running, let a stuck "active"
    // mood settle back to idle. Fine-grained turn signals take precedence.
    if (current !== undefined) {
      const summary = listState.byId[current]
      if (summary && summary.running === false) {
        const mood = getMoodState().mood
        if (mood === 'think' || mood === 'talk' || mood === 'work') {
          dispatchSignal({ type: 'idle' })
        }
      }
    }
  }

  const listDispose = ctx.sessions.list.subscribe(onListChange)
  onListChange()

  return () => {
    disposed = true
    listDispose()
    detachEventSource()
    currentId = undefined
  }
}
