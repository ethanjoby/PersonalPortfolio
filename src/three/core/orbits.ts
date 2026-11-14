import { Vector3 } from 'three'
import { eyeOf } from './occluder'
import type { Occluder } from './occluder'
import { orbitPoint, trueAnomaly } from './shapes'
import type { OrbitElements } from './shapes'
import type { ScreenPoint, StageContext } from './types'

/*
 * Orbit helpers that need the camera. Kept out of shapes.ts, which stays free of three.js.
 */

export interface VisibleArcOptions {
  /** Sphere that hides the far side. */
  occluder?: Occluder | null
  /** CSS pixels kept clear inside each stage edge. Default 16 on every side. */
  inset?: { left?: number; right?: number; top?: number; bottom?: number }
  /** Samples around the orbit. Default 360. */
  samples?: number
}

export interface VisibleArc {
  /** Mean anomaly (radians) where the visible arc starts. */
  from: number
  /** Mean anomaly where it ends. Always greater than `from`, less than a full turn later. */
  to: number
  /** Share of the samples that were visible, 0..1. */
  share: number
}

const TAU = Math.PI * 2
const _p = new Vector3()
const _eye = new Vector3()
const _d = new Vector3()
const _s: ScreenPoint = { x: 0, y: 0, depth: 0, visible: false }

/**
 * The longest stretch of an orbit (object at the scene origin, world space) that is on stage and not behind
 * the occluder, as a range of mean anomaly. Use it with `dwell()` so a satellite lingers where it can be seen.
 * Call it from a scene's resize(), after the camera is set: it depends on the stage size. Returns null when
 * nothing of the orbit is in view.
 */
export function visibleArc(ctx: StageContext, elements: OrbitElements, options: VisibleArcOptions = {}): VisibleArc | null {
  const n = Math.max(24, Math.round(options.samples ?? 360))
  const e = elements.eccentricity ?? 0
  const left = options.inset?.left ?? 16
  const right = options.inset?.right ?? 16
  const top = options.inset?.top ?? 16
  const bottom = options.inset?.bottom ?? 16
  const occluder = options.occluder ?? null
  ctx.camera.updateMatrixWorld()
  occluder?.update()
  _eye.copy(eyeOf(ctx.camera))

  const seen = new Uint8Array(n)
  let count = 0
  for (let i = 0; i < n; i++) {
    orbitPoint(_p, elements, trueAnomaly((i / n) * TAU, e))
    ctx.project(_p, _s)
    let ok = _s.visible && _s.x >= left && _s.x <= ctx.size.width - right && _s.y >= top && _s.y <= ctx.size.height - bottom
    if (ok && occluder) {
      const soft = ctx.worldPerPx(_d.subVectors(_p, _eye).length()) * 2
      ok = occluder.occlusion(_p, _eye, soft) < 0.5
    }
    if (ok) {
      seen[i] = 1
      count++
    }
  }
  if (count === 0) return null
  if (count === n) return { from: 0, to: TAU * (1 - 1 / n), share: 1 }

  // Longest run on the ring: start scanning just after a hidden sample.
  let start = 0
  while (seen[start] === 1) start++
  let bestStart = -1
  let bestLength = 0
  let runStart = -1
  for (let k = 1; k <= n; k++) {
    const i = (start + k) % n
    if (seen[i] === 1) {
      if (runStart < 0) runStart = start + k
    } else if (runStart >= 0) {
      const length = start + k - runStart
      if (length > bestLength) {
        bestLength = length
        bestStart = runStart
      }
      runStart = -1
    }
  }
  if (bestStart < 0) return null
  // One sample beyond each end, so the change of pace happens just out of sight.
  const from = ((bestStart - 1) / n) * TAU
  const to = ((bestStart + bestLength) / n) * TAU
  return { from, to: Math.min(to, from + TAU * (1 - 1 / n)), share: count / n }
}
