import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import { resolvePetConfig } from '../config.ts'
import type { PetCorner, PetConfig } from '../config.ts'
import { PetCanvas } from './PetCanvas.tsx'

/**
 * The `shell.overlay` list entry. Renders a fixed-corner, click-through container
 * (constraint #4: `pointer-events: none` on both the root and the canvas, because
 * the overlay layer re-enables pointer events on its direct children). Config is
 * read once from the boot-injected global (`__AGENT_PET_CONFIG__`).
 */

const CORNER_OFFSET: Record<PetCorner, CSSProperties> = {
  'bottom-right': { bottom: 16, right: 16 },
  'bottom-left': { bottom: 16, left: 16 },
  'top-right': { top: 16, right: 16 },
  'top-left': { top: 16, left: 16 },
}

function readConfig(): PetConfig {
  const raw = (globalThis as Record<string, unknown>).__AGENT_PET_CONFIG__
  return resolvePetConfig(raw)
}

export function AgentPetOverlay() {
  const cfg = useMemo(readConfig, [])
  if (!cfg.enabled) return null
  return (
    <div
      style={{
        position: 'fixed',
        ...CORNER_OFFSET[cfg.corner],
        zIndex: 9999,
        pointerEvents: 'none',
        filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.28))',
      }}
    >
      <PetCanvas cfg={cfg} />
    </div>
  )
}
