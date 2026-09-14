import { test } from 'node:test'
import assert from 'node:assert/strict'
import { reduceMood } from '../src/mood/reduceMood.ts'
import { INITIAL_MOOD_STATE } from '../src/mood/types.ts'

const NOW = 1_000_000

test('A7: turn:start -> think', () => {
  assert.equal(reduceMood(INITIAL_MOOD_STATE, { type: 'turn:start' }, NOW).mood, 'think')
})

test('A7: assistant:stream -> talk', () => {
  const s = reduceMood(INITIAL_MOOD_STATE, { type: 'turn:start' }, NOW)
  assert.equal(reduceMood(s, { type: 'assistant:stream' }, NOW + 10).mood, 'talk')
})

test('A7: tool:call -> work', () => {
  const s = reduceMood(INITIAL_MOOD_STATE, { type: 'turn:start' }, NOW)
  assert.equal(reduceMood(s, { type: 'tool:call' }, NOW + 20).mood, 'work')
})

test('A7: tool:result-error -> sad with resolveAt', () => {
  const s = reduceMood(INITIAL_MOOD_STATE, { type: 'turn:start' }, NOW)
  const next = reduceMood(s, { type: 'tool:result-error' }, NOW + 30)
  assert.equal(next.mood, 'sad')
  assert.ok(next.resolveAt !== undefined && next.resolveAt > NOW + 30)
})

test('A7: turn:end-ok -> happy', () => {
  const s = reduceMood(INITIAL_MOOD_STATE, { type: 'turn:start' }, NOW)
  assert.equal(reduceMood(s, { type: 'turn:end-ok' }, NOW + 40).mood, 'happy')
})

test('A7: turn:end-error -> sad', () => {
  const s = reduceMood(INITIAL_MOOD_STATE, { type: 'turn:start' }, NOW)
  assert.equal(reduceMood(s, { type: 'turn:end-error' }, NOW + 50).mood, 'sad')
})

test('A7: idle -> idle (clears transient resolveAt)', () => {
  const happy = reduceMood(INITIAL_MOOD_STATE, { type: 'turn:end-ok' }, NOW)
  assert.ok(happy.resolveAt !== undefined)
  const next = reduceMood(happy, { type: 'idle' }, NOW + 1)
  assert.equal(next.mood, 'idle')
  assert.equal(next.resolveAt, undefined)
})

test('A7: sneeze -> sneeze (dev-only transient)', () => {
  assert.equal(reduceMood(INITIAL_MOOD_STATE, { type: 'sneeze' }, NOW).mood, 'sneeze')
})

test('A7: tick does not resolve a persistent mood', () => {
  const think = reduceMood(INITIAL_MOOD_STATE, { type: 'turn:start' }, NOW)
  assert.equal(reduceMood(think, { type: 'tick' }, NOW + 999_999).mood, 'think')
})

test('A7: tick resolves a transient mood only past resolveAt', () => {
  const happy = reduceMood(INITIAL_MOOD_STATE, { type: 'turn:end-ok' }, NOW)
  // Before the hold elapses: unchanged.
  const before = reduceMood(happy, { type: 'tick' }, NOW + 100)
  assert.equal(before.mood, 'happy')
  // At/after the hold: collapses to idle.
  const after = reduceMood(happy, { type: 'tick' }, (happy.resolveAt ?? 0) + 1)
  assert.equal(after.mood, 'idle')
  assert.equal(after.resolveAt, undefined)
})

test('A7: reducer is a pure function of (state, signal, now)', () => {
  const a = reduceMood(INITIAL_MOOD_STATE, { type: 'turn:end-ok' }, NOW)
  const b = reduceMood(INITIAL_MOOD_STATE, { type: 'turn:end-ok' }, NOW)
  assert.deepEqual(a, b)
  // The input state is never mutated.
  const frozen: typeof INITIAL_MOOD_STATE = Object.freeze({ mood: 'idle', since: 0 })
  void reduceMood(frozen, { type: 'turn:start' }, NOW)
  assert.equal(frozen.mood, 'idle')
})

test('A7: a full turn drives 4+ distinct moods (idle->think->talk->work->happy)', () => {
  let s = INITIAL_MOOD_STATE
  const seen = new Set<string>()
  const feed = (sig: Parameters<typeof reduceMood>[1], dt: number) => {
    s = reduceMood(s, sig, NOW + (seen.size * 100))
    seen.add(s.mood)
    void dt
  }
  feed({ type: 'turn:start' }, 0)
  feed({ type: 'assistant:stream' }, 10)
  feed({ type: 'tool:call' }, 20)
  feed({ type: 'assistant:stream' }, 30)
  feed({ type: 'turn:end-ok' }, 40)
  // Distinct moods across a normal turn (excluding the initial idle):
  const active = new Set([...seen].filter((m) => m !== 'idle'))
  assert.ok(active.size >= 4, `expected >=4 moods, got ${[...active].join(',')}`)
  assert.ok(seen.has('think') && seen.has('talk') && seen.has('work') && seen.has('happy'))
})
