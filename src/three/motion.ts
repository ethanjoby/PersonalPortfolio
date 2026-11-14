/*
 * Motion switches shared by the page and the 3D engine. This file imports nothing from three.js, so UI code
 * (for example the hero's "Pause orbit" button) can import it without pulling the engine into the first load.
 *
 * - The pause flag is the visible Pause control (WCAG 2.2.2). It freezes ambient time in every stage.
 * - Reduced motion follows the operating system setting live.
 */

type Listener = () => void

let paused = false
const pauseListeners = new Set<Listener>()

/** Pause or resume ambient motion in every stage. Transitions that answer the visitor still run. */
export function setMotionPaused(value: boolean): void {
  if (paused === value) return
  paused = value
  for (const fn of pauseListeners) fn()
}

export function isMotionPaused(): boolean {
  return paused
}

/** Subscribe to pause changes. Returns the unsubscribe function. Shaped for React's useSyncExternalStore. */
export function subscribeMotionPaused(fn: Listener): () => void {
  pauseListeners.add(fn)
  return () => {
    pauseListeners.delete(fn)
  }
}

const QUERY = '(prefers-reduced-motion: reduce)'

/** True when the visitor asked for reduced motion. False on the server. */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(QUERY).matches
}

/** Subscribe to changes of the reduced-motion setting. Returns the unsubscribe function. */
export function subscribeReducedMotion(fn: Listener): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {}
  const mq = window.matchMedia(QUERY)
  mq.addEventListener('change', fn)
  return () => {
    mq.removeEventListener('change', fn)
  }
}
