/**
 * Shared pet configuration. Pure module: imported by both the Host face (raw
 * config from `--patch`) and the Client face (config boot-injected into
 * `globalThis.__AGENT_PET_CONFIG__`). No framework imports.
 */

export type PetCorner = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'

export interface PetConfig {
  /** Master switch. When false the overlay renders nothing. */
  readonly enabled: boolean
  /** Species id (see the species registry). */
  readonly speciesId: string
  /** Which screen corner the pet occupies. */
  readonly corner: PetCorner
  /** Pet size in CSS px (clamped 96–240). */
  readonly sizePx: number
  /** Respect reduced-motion: freeze idle/ambient animation. */
  readonly reducedMotion: boolean
}

export const PET_CONFIG_DEFAULTS: PetConfig = {
  enabled: true,
  speciesId: 'kirby-blob',
  corner: 'bottom-right',
  sizePx: 160,
  reducedMotion: false,
}

const CORNERS: readonly PetCorner[] = ['bottom-right', 'bottom-left', 'top-right', 'top-left']
const SIZE_MIN = 96
const SIZE_MAX = 240

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}

/**
 * Merge a raw config object (from the `--patch` yml, boot-injected) over
 * defaults, clamping the size and validating the corner/species id. Unknown or
 * malformed fields fall back to defaults rather than throwing.
 */
export function resolvePetConfig(raw: unknown): PetConfig {
  const r = (raw !== null && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const corner =
    typeof r.corner === 'string' && (CORNERS as readonly string[]).includes(r.corner)
      ? (r.corner as PetCorner)
      : PET_CONFIG_DEFAULTS.corner
  const sizeRaw =
    typeof r.sizePx === 'number' && Number.isFinite(r.sizePx)
      ? r.sizePx
      : PET_CONFIG_DEFAULTS.sizePx
  const speciesRaw =
    typeof r.speciesId === 'string' && r.speciesId.length > 0
      ? r.speciesId
      : PET_CONFIG_DEFAULTS.speciesId
  return {
    enabled: typeof r.enabled === 'boolean' ? r.enabled : PET_CONFIG_DEFAULTS.enabled,
    speciesId: speciesRaw,
    corner,
    sizePx: Math.round(clamp(sizeRaw, SIZE_MIN, SIZE_MAX)),
    reducedMotion:
      typeof r.reducedMotion === 'boolean' ? r.reducedMotion : PET_CONFIG_DEFAULTS.reducedMotion,
  }
}
