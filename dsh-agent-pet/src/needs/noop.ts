import type { Need } from './types.ts'

/**
 * v0 needs: a single always-zero need. Placeholder for v1 hunger/energy/
 * affinity. Keeping the reducer pure (no drift) is the v0 invariant.
 */
export const NoopNeeds: readonly Need[] = [
  { id: 'noop', level: () => 0 },
]
