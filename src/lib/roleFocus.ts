'use client'

import { useSyncExternalStore } from 'react'

/*
 * Which role the visitor has opened, shared between the top section (clicking a company's 3D logo) and the
 * experience section (which shows that role's description). A tiny external store: no context, no provider.
 */

let selected: string | null = null
const listeners = new Set<() => void>()

export function getSelectedRole(): string | null {
  return selected
}

/** Open a role (or pass null to close). Notifies every subscriber. */
export function selectRole(id: string | null): void {
  if (selected === id) return
  selected = id
  for (const listener of listeners) listener()
}

export function subscribeSelectedRole(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** The id of the open role, or null. Always null during server rendering. */
export function useSelectedRole(): string | null {
  return useSyncExternalStore(subscribeSelectedRole, getSelectedRole, () => null)
}
