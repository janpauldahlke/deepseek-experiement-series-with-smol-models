import type { Mood } from '../mood/types.ts'
import type { PetConfig } from '../config.ts'

/**
 * The canvas the species renders into. The client owns the DOM element; the
 * species owns the rendering. A species may use WebGL (three) or 2D context —
 * the contract is only the canvas.
 */
export type PetCanvas = HTMLCanvasElement

/**
 * A species owns one visual identity. It is created per canvas instance; the
 * handle exposes the two lifecycle verbs the client needs. The client runs a
 * single RAF, feeding `setMood` when the mood store changes; the species runs
 * its own internal RAF for ambient animation.
 */
export interface Species {
  readonly id: string
  /**
   * Create the renderer bound to `canvas`. Starts any internal RAF. Must be
   * idempotent-safe to `dispose` even if `setMood` was never called.
   */
  readonly create(canvas: PetCanvas, cfg: PetConfig): SpeciesHandle
}

/** Drive + dispose contract returned by {@link Species.create}. */
export interface SpeciesHandle {
  /**
   * Feed the current mood. The species stores it and reacts on the next frame.
   * Calling with the same mood repeatedly is a cheap no-op.
   */
  readonly setMood(mood: Mood): void
  /** Tear down the WebGL/2D context, cancel the RAF, and dispose GPU resources. */
  readonly dispose(): void
}
