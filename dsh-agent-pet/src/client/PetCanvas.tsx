import { useEffect, useRef } from 'react'
import type { PetConfig } from '../config.ts'
import { DEFAULT_SPECIES_ID, getSpecies } from '../species/registry.ts'
import { placeholderBox } from '../species/placeholderBox.ts'
import type { SpeciesHandle } from '../species/types.ts'
import { getMoodState, subscribeMood, tickMood } from './moodStore.ts'

/**
 * Owns the canvas + species lifecycle and the per-frame mood clock. It reads the
 * config once (stable object), creates the species (falling back to the 2D box
 * if WebGL is unavailable), feeds mood changes through the store subscription,
 * and runs a lightweight RAF that advances the transient-mood clock.
 */
export function PetCanvas({ cfg }: { cfg: PetConfig }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let handle: SpeciesHandle | undefined
    let tickRaf = 0
    let unsubscribe: (() => void) | undefined

    const species = getSpecies(cfg.speciesId) ?? getSpecies(DEFAULT_SPECIES_ID) ?? placeholderBox
    try {
      handle = species.create(canvas, cfg)
    } catch {
      try {
        handle = placeholderBox.create(canvas, cfg)
      } catch {
        handle = undefined
      }
    }

    if (handle) {
      handle.setMood(getMoodState().mood)
      unsubscribe = subscribeMood(() => {
        if (handle) handle.setMood(getMoodState().mood)
      })
      const tickLoop = () => {
        tickMood()
        tickRaf = requestAnimationFrame(tickLoop)
      }
      tickRaf = requestAnimationFrame(tickLoop)
    }

    return () => {
      if (unsubscribe) unsubscribe()
      cancelAnimationFrame(tickRaf)
      if (handle) handle.dispose()
    }
  }, [cfg])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        width: cfg.sizePx,
        height: cfg.sizePx,
        display: 'block',
        pointerEvents: 'none',
      }}
    />
  )
}
