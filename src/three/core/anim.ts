/*
 * Small animation helpers for scenes. Pure math, no three.js imports, no allocation after setup.
 * The curves mirror the motion tokens in src/styles/tokens.css so canvas motion matches DOM motion.
 */

export function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t
}

/** Build an easing function from a CSS cubic-bezier(x1, y1, x2, y2). */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const cx = 3 * x1
  const bx = 3 * (x2 - x1) - cx
  const ax = 1 - cx - bx
  const cy = 3 * y1
  const by = 3 * (y2 - y1) - cy
  const ay = 1 - cy - by
  const sampleX = (u: number): number => ((ax * u + bx) * u + cx) * u
  const sampleY = (u: number): number => ((ay * u + by) * u + cy) * u
  const slopeX = (u: number): number => (3 * ax * u + 2 * bx) * u + cx
  return (t: number): number => {
    if (t <= 0) return 0
    if (t >= 1) return 1
    let u = t
    for (let i = 0; i < 6; i++) {
      const err = sampleX(u) - t
      if (Math.abs(err) < 1e-5) return sampleY(u)
      const d = slopeX(u)
      if (Math.abs(d) < 1e-6) break
      u -= err / d
    }
    let lo = 0
    let hi = 1
    u = t
    for (let i = 0; i < 24; i++) {
      const x = sampleX(u)
      if (Math.abs(x - t) < 1e-5) break
      if (x < t) lo = u
      else hi = u
      u = (lo + hi) / 2
    }
    return sampleY(u)
  }
}

/** --ease: the signature curve, for about 80% of motion. No overshoot. */
export const ease = cubicBezier(0.4, 0, 0.2, 1)
/** --ease-hero: a strong decelerate for the one hero beat (the load draw-on). */
export const easeHero = cubicBezier(0.05, 0.7, 0.1, 1)
/** --ease-exit */
export const easeExit = cubicBezier(0.3, 0, 1, 1)
/** --ease-feedback: hover and focus responses. */
export const easeFeedback = cubicBezier(0.2, 0, 0, 1)

/** Durations in seconds, matching the --dur-* tokens. */
export const DUR = {
  hoverIn: 0.08,
  hoverOut: 0.2,
  quick: 0.35,
  standard: 0.5,
  slow: 0.8,
} as const

/**
 * Move `current` toward `target` with exponential smoothing. `seconds` is the time constant: after that long
 * about 63% of the gap is closed, whatever the frame rate. Use it for hover emphasis and follow motion.
 */
export function damp(current: number, target: number, seconds: number, dt: number): number {
  if (seconds <= 0 || dt <= 0) return dt <= 0 ? current : target
  const next = current + (target - current) * (1 - Math.exp(-dt / seconds))
  return Math.abs(target - next) < 1e-4 ? target : next
}

/**
 * A single eased value. `to()` starts a transition, `step(dt)` advances it and returns true while it is
 * still moving, which is exactly what a scene's update() should return to keep an on-demand stage drawing.
 */
export class Tween {
  value: number
  private start: number
  private end: number
  private elapsed = 0
  private duration = 0
  private curve: (t: number) => number = ease

  constructor(value = 0) {
    this.value = value
    this.start = value
    this.end = value
  }

  /** Jump to a value with no transition. */
  set(value: number): void {
    this.value = value
    this.start = value
    this.end = value
    this.duration = 0
  }

  /** Ease from the current value to `target` over `seconds`. A duration of 0 (or reduced motion: pass 0) jumps. */
  to(target: number, seconds: number, curve: (t: number) => number = ease): void {
    if (seconds <= 0) {
      this.set(target)
      return
    }
    this.start = this.value
    this.end = target
    this.elapsed = 0
    this.duration = seconds
    this.curve = curve
  }

  get target(): number {
    return this.end
  }

  get active(): boolean {
    return this.duration > 0
  }

  /** Raw progress 0 to 1 of the running transition (1 when idle). */
  get progress(): number {
    return this.duration > 0 ? clamp01(this.elapsed / this.duration) : 1
  }

  step(dt: number): boolean {
    if (this.duration <= 0) return false
    this.elapsed += dt
    const t = this.elapsed / this.duration
    if (t >= 1) {
      this.value = this.end
      this.duration = 0
      return false
    }
    this.value = this.start + (this.end - this.start) * this.curve(t)
    return true
  }
}
