/*
 * Numbers behind the lab orbit plot, kept free of imports so they can also be checked from a plain script.
 *
 * The composition problem, stated once: a globe large enough to read as a horizon leaves only a strip of sky,
 * and anything that really orbits it is out of that strip for most of each lap. Two things solve it honestly:
 *  1. Orbits are placed so a long arc of each one crosses the visible sky (arches standing on the horizon).
 *  2. Timing uses the engine's `dwell()`: a satellite spends most of each period on the arc that is in view and
 *     hurries round the rest (Kepler's own behaviour, exaggerated). Phases are spaced so that at most two of the
 *     seven are ever out of sight together, and all seven are in view at time 0, which is also the still pose.
 */

export type Triple = [number, number, number]

export interface OrbitSpec {
  /** Semi-major axis in globe radii. */
  radius: number
  eccentricity?: number
  /** Classical elements in degrees (see shapes.ts), */
  inclination?: number
  node?: number
  periapsis?: number
  /** or aim the far end of an elongated orbit: direction of the farthest point and a roll about it, degrees. */
  aim?: { far: Triple; roll: number }
  /** The dashed orbit carries the incoming role. */
  dashed?: boolean
}

export interface Composition {
  /** Camera distance from the globe's centre in globe radii. Lower is a stronger perspective. */
  distance: number
  /** Where the top of the horizon sits, as a share of the stage height from the top. */
  apex: number
  /** How far along the bottom edge the horizon reaches, as a share of half the stage width (1 = the corners). */
  span: number
}

export interface OrbitPreset {
  composition: Composition
  globe: {
    meridians: number
    parallels: number
    segments: number
    /** Latitude band to draw, degrees: only the part of the globe that can come into view. */
    south: number
    north: number
    /** Lean of the axis in radians: toward the camera, and sideways. */
    lean: [number, number]
  }
  orbits: OrbitSpec[]
  /** Orbit and starting phase for each past or current satellite, in list order. */
  slots: { orbit: number; phase: number }[]
  /** The incoming role's place: the dashed orbit. */
  incoming: { orbit: number; phase: number }
}

/** Seconds per orbit (the brief asks for 40 to 80). */
export const ORBIT_PERIOD = 64

/** Share of each period a satellite spends on the visible arc of its orbit. */
export const DWELL_SHARE = 0.86

/*
 * Phases. With a dwell share of 0.86 each satellite is out of sight for 14% of a period. Seven phases 0.115
 * apart make those absences overlap at most two at a time and leave 17% of every period, around time 0, with
 * all seven in view. Two satellites on one orbit sit at least 0.3 of a period apart.
 */
const SLOTS: { orbit: number; phase: number }[] = [
  { orbit: 0, phase: 0.55 },
  { orbit: 1, phase: 0.32 },
  { orbit: 2, phase: 0.665 },
  { orbit: 0, phase: 0.205 },
  { orbit: 1, phase: 0.78 },
  { orbit: 2, phase: 0.09 },
]
const INCOMING = { orbit: 3, phase: 0.435 }

/**
 * A circular orbit that shows as an arch standing on the horizon. `tip` is the lean of the arch in degrees
 * (0 = straight up, positive = to the right), `open` (-1..1) how far the orbital plane is turned toward the
 * camera (0 = edge on, a straight line; the sign picks which side of the arch is in front of the globe).
 */
export function arch(tip: number, radius: number, open: number, dashed = false): OrbitSpec {
  const t = (tip * Math.PI) / 180
  const s = Math.sqrt(Math.max(1 - open * open, 0))
  // Orbit normal: perpendicular to the arch's long axis on screen, with `open` of it facing the camera.
  const nx = Math.cos(t) * s
  const ny = -Math.sin(t) * s
  const nz = open
  return {
    radius,
    eccentricity: 0,
    inclination: (Math.acos(Math.min(1, Math.max(-1, -ny))) * 180) / Math.PI,
    node: (Math.atan2(nx, nz) * 180) / Math.PI,
    periapsis: 0,
    dashed,
  }
}

export const PRESETS: Record<'dome' | 'low', OrbitPreset> = {
  /* A long lens on a big globe: the calm, even lattice of the reference site, with arches over the horizon. */
  dome: {
    composition: { distance: 3.2, apex: 0.62, span: 1.04 },
    globe: { meridians: 96, parallels: 47, segments: 192, south: 12, north: 90, lean: [0.52, 0.1] },
    orbits: [arch(6, 1.27, -0.29), arch(8, 1.2, 0.24), arch(-5, 1.18, 0.29), arch(18, 1.27, -0.14, true)],
    slots: SLOTS,
    incoming: INCOMING,
  },
  /* A wide lens low over the globe: strong perspective, and whole elongated orbits standing in a big sky. */
  low: {
    composition: { distance: 1.5, apex: 0.64, span: 0.72 },
    globe: { meridians: 72, parallels: 35, segments: 200, south: -15, north: 90, lean: [0.34, 0.12] },
    orbits: [
      { radius: 2.6, eccentricity: 0.58, aim: { far: [0.365, 0.931, -0.022], roll: -79 } },
      { radius: 2.6, eccentricity: 0.58, aim: { far: [0.023, 1.0, 0.001], roll: -62 } },
      { radius: 2.6, eccentricity: 0.56, aim: { far: [-0.365, 0.927, -0.082], roll: -86 } },
      { radius: 2.6, eccentricity: 0.54, aim: { far: [0.432, 0.893, -0.123], roll: -70 }, dashed: true },
    ],
    slots: SLOTS,
    incoming: INCOMING,
  },
}

export type PresetName = keyof typeof PRESETS

export interface CameraSolution {
  /** Vertical field of view in degrees. */
  fov: number
  /** Radians the camera looks up from the line to the globe's centre. */
  pitch: number
  distance: number
}

/**
 * Find the field of view and upward pitch that put the horizon's apex and its reach along the bottom edge
 * where the composition asks, for a camera at `distance` looking past a unit globe. Pure math; a bisection.
 */
export function solveCamera(aspect: number, c: Composition): CameraSolution {
  const alpha = Math.asin(Math.min(1 / c.distance, 0.999))
  const residual = (t: number): number => {
    const gamma = alpha + Math.atan(2 * t * (c.apex - 0.5))
    const x = c.span * aspect * t
    const k = (Math.cos(gamma) + t * Math.sin(gamma)) / Math.cos(alpha)
    return k * k - t * t - 1 - x * x
  }
  let lo = 0.004
  let hi = 1.6
  if (residual(hi) > 0) lo = hi
  for (let i = 0; i < 48 && lo !== hi; i++) {
    const mid = (lo + hi) / 2
    if (residual(mid) > 0) lo = mid
    else hi = mid
  }
  const t = (lo + hi) / 2
  return {
    fov: (2 * Math.atan(t) * 180) / Math.PI,
    pitch: alpha + Math.atan(2 * t * (c.apex - 0.5)),
    distance: c.distance,
  }
}
