'use client'

import { useSyncExternalStore } from 'react'
import { isMotionPaused, prefersReducedMotion, subscribeMotionPaused, subscribeReducedMotion } from './motion'

const never = (): boolean => false

/**
 * The global pause flag as React state, for the "Pause orbit" control. Imports nothing from three.js.
 * Toggle it with setMotionPaused from '@/three/motion'.
 */
export function useMotionPaused(): boolean {
  return useSyncExternalStore(subscribeMotionPaused, isMotionPaused, never)
}

/** True when the visitor prefers reduced motion (false during server rendering and hydration). */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReducedMotion, prefersReducedMotion, never)
}
