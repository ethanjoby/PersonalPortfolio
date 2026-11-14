import { useSyncExternalStore } from 'react'

/*
 * prefers-reduced-motion, live. Client only: call these from client components and effects.
 * The CSS side lives in src/styles/tokens.css and src/styles/base.css; use this for anything
 * a script drives (scroll-linked values, canvases, timers).
 */

const QUERY = '(prefers-reduced-motion: reduce)'

/** Current value. Returns false on the server and where matchMedia is missing. */
export function getReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(QUERY).matches
}

/** Calls `onChange` whenever the preference flips. Returns the unsubscribe function. */
export function subscribeReducedMotion(onChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {}
  const media = window.matchMedia(QUERY)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

function getServerSnapshot(): boolean {
  return false
}

/**
 * True while the reader asks for reduced motion. Renders false on the server and during
 * hydration, then updates, so it never causes a hydration mismatch.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReducedMotion, getReducedMotion, getServerSnapshot)
}
