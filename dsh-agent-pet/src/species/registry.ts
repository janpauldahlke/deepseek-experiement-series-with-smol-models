import type { Species } from './types.ts'
import { kirbyBlob } from './kirbyBlob.ts'
import { placeholderBox } from './placeholderBox.ts'

/**
 * One shippable species (Kirby) plus a dev-only 2D placeholder. A second
 * species is added here — the client only knows how to look the id up, never
 * how to draw it (PLAN §5: "a registry allowing a second species").
 */
const SPECIES: Record<string, Species> = {
  [kirbyBlob.id]: kirbyBlob,
  [placeholderBox.id]: placeholderBox,
}

export function listSpeciesIds(): readonly string[] {
  return Object.keys(SPECIES)
}

export function getSpecies(id: string): Species | undefined {
  return SPECIES[id]
}

export const DEFAULT_SPECIES_ID = kirbyBlob.id
