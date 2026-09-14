import type { Species } from './types.ts'
import type { Mood } from '../mood/types.ts'
import type { PetConfig } from '../config.ts'

/**
 * Dev-only fallback species: a 2D rounded box that tints per mood. No WebGL —
 * used when the operator wants a cheap probe, or as the automatic fallback if
 * the Kirby's WebGL context fails to create.
 */

const MOOD_COLORS: Record<Mood, string> = {
  idle: '#8b8ff0',
  think: '#5aa9e6',
  talk: '#4fd0c4',
  work: '#f0a63b',
  happy: '#7bd88f',
  sad: '#9a7fd0',
  surprised: '#f06a8a',
  sneeze: '#ffd24f',
}

export const placeholderBox: Species = {
  id: 'placeholder-box',
  create(canvas, cfg) {
    const ctx = canvas.getContext('2d')
    let mood: Mood = 'idle'
    let disposed = false
    let raf = 0
    let start = typeof performance !== 'undefined' ? performance.now() : 0
    const reduced = cfg.reducedMotion

    const loop = (now: number) => {
      if (disposed) return
      raf = requestAnimationFrame(loop)
      if (!ctx) return
      const t = (now - start) / 1000
      const w = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, w, h)
      const pulse = reduced ? 0 : 0.04 * Math.sin(t * 2.4)
      const size = (w * 0.6) * (1 + pulse)
      const cx = w / 2
      const cy = h / 2
      const r = Math.min(size, size) * 0.28
      const x = cx - size / 2
      const y = cy - size / 2
      ctx.beginPath()
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, size, size, r)
      } else {
        ctx.rect(x, y, size, size)
      }
      ctx.fillStyle = MOOD_COLORS[mood]
      ctx.fill()
      ctx.lineWidth = 3
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'
      ctx.stroke()
    }
    raf = requestAnimationFrame(loop)

    return {
      setMood(m: Mood) {
        mood = m
      },
      dispose() {
        disposed = true
        cancelAnimationFrame(raf)
      },
    }
  },
}
