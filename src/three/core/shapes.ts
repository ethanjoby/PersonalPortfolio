/*
 * Wire shapes: pure math, no three.js imports.
 *
 * Every generator returns `Polyline[]` in unit space: Y is up and the shape fits inside a sphere of
 * radius about 1 around the origin. All geometry here is original and deterministic (seeded), so a
 * shape looks the same on every load. Angles in options are degrees.
 */

export type Vec3 = [number, number, number]
export type Polyline = Vec3[]

/** Anything with x, y and z fields. A THREE.Vector3 fits, so helpers can write into one without importing three. */
export interface XYZ {
  x: number
  y: number
  z: number
}

const TAU = Math.PI * 2
const DEG = Math.PI / 180

/* ------------------------------------------------------------------ helpers */

/** Small seeded generator (mulberry32). Returns numbers in [0, 1). */
export function seeded(seed: number): () => number {
  let a = (seed | 0) + 0x6d2b79f5
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function smooth(t: number): number {
  const c = t < 0 ? 0 : t > 1 ? 1 : t
  return c * c * (3 - 2 * c)
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

function dist(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
}

function mix(a: Vec3, b: Vec3, t: number): Vec3 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

function normalize(v: Vec3): Vec3 {
  const l = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / l, v[1] / l, v[2] / l]
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
}

/** Rotate `v` around the unit axis `k` by `angle` radians (Rodrigues). */
function rotateAround(v: Vec3, k: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  const d = k[0] * v[0] + k[1] * v[1] + k[2] * v[2]
  const x = cross(k, v)
  return [
    v[0] * c + x[0] * s + k[0] * d * (1 - c),
    v[1] * c + x[1] * s + k[1] * d * (1 - c),
    v[2] * c + x[2] * s + k[2] * d * (1 - c),
  ]
}

/** A straight polyline from `a` to `b` with `segments` equal pieces. */
export function line(a: Vec3, b: Vec3, segments = 1): Polyline {
  const out: Polyline = []
  const n = Math.max(1, Math.round(segments))
  for (let i = 0; i <= n; i++) out.push(mix(a, b, i / n))
  return out
}

/** Length of one polyline. */
export function polylineLength(p: Polyline): number {
  let l = 0
  for (let i = 1; i < p.length; i++) l += dist(p[i - 1]!, p[i]!)
  return l
}

/** Number of line segments in a shape (the engine budget is 8,000 per scene). */
export function countSegments(shape: Polyline[]): number {
  let n = 0
  for (const p of shape) n += Math.max(0, p.length - 1)
  return n
}

/** Concatenate shapes into one. */
export function merge(...shapes: Polyline[][]): Polyline[] {
  const out: Polyline[] = []
  for (const s of shapes) for (const p of s) out.push(p)
  return out
}

export interface TransformOptions {
  /** Uniform number or per-axis scale. Applied first. */
  scale?: number | Vec3
  /** Euler rotation in degrees, applied in X, then Y, then Z order. */
  rotate?: Vec3
  /** Applied last. */
  translate?: Vec3
}

/** Return a transformed copy of a shape (scale, then rotate, then translate). */
export function transform(shape: Polyline[], options: TransformOptions): Polyline[] {
  const s: Vec3 = typeof options.scale === 'number' ? [options.scale, options.scale, options.scale] : (options.scale ?? [1, 1, 1])
  const r = options.rotate ?? [0, 0, 0]
  const t = options.translate ?? [0, 0, 0]
  const cx = Math.cos(r[0] * DEG)
  const sx = Math.sin(r[0] * DEG)
  const cy = Math.cos(r[1] * DEG)
  const sy = Math.sin(r[1] * DEG)
  const cz = Math.cos(r[2] * DEG)
  const sz = Math.sin(r[2] * DEG)
  return shape.map((p) =>
    p.map((v): Vec3 => {
      let x = v[0] * s[0]
      let y = v[1] * s[1]
      let z = v[2] * s[2]
      const y1 = y * cx - z * sx
      const z1 = y * sx + z * cx
      y = y1
      z = z1
      const x2 = x * cy + z * sy
      const z2 = -x * sy + z * cy
      x = x2
      z = z2
      const x3 = x * cz - y * sz
      const y3 = x * sz + y * cz
      return [x3 + t[0], y3 + t[1], z2 + t[2]]
    }),
  )
}

export interface Bounds {
  min: Vec3
  max: Vec3
  center: Vec3
  /** Radius of the sphere around `center` that contains every point. */
  radius: number
}

export function bounds(shape: Polyline[]): Bounds {
  const min: Vec3 = [Infinity, Infinity, Infinity]
  const max: Vec3 = [-Infinity, -Infinity, -Infinity]
  let any = false
  for (const p of shape) {
    for (const v of p) {
      any = true
      for (let k = 0; k < 3; k++) {
        const c = v[k as 0 | 1 | 2]
        if (c < min[k as 0 | 1 | 2]) min[k as 0 | 1 | 2] = c
        if (c > max[k as 0 | 1 | 2]) max[k as 0 | 1 | 2] = c
      }
    }
  }
  if (!any) return { min: [0, 0, 0], max: [0, 0, 0], center: [0, 0, 0], radius: 0 }
  const center: Vec3 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2]
  let radius = 0
  for (const p of shape) for (const v of p) radius = Math.max(radius, dist(v, center))
  return { min, max, center, radius }
}

/** Center a shape on the origin and scale it so its bounding sphere has the given radius. */
export function fitToUnit(shape: Polyline[], radius = 1): Polyline[] {
  const b = bounds(shape)
  if (b.radius === 0) return shape
  const k = radius / b.radius
  return shape.map((p) => p.map((v): Vec3 => [(v[0] - b.center[0]) * k, (v[1] - b.center[1]) * k, (v[2] - b.center[2]) * k]))
}

/** Resample a polyline to `count` points spaced evenly along its length. */
export function resample(p: Polyline, count: number): Polyline {
  return resampleRange(p, count, 0, 1)
}

function resampleRange(p: Polyline, count: number, from: number, to: number): Polyline {
  const n = Math.max(2, Math.round(count))
  const first = p[0] ?? [0, 0, 0]
  if (p.length < 2) return Array.from({ length: n }, (): Vec3 => [first[0], first[1], first[2]])
  const cum: number[] = [0]
  for (let i = 1; i < p.length; i++) cum.push(cum[i - 1]! + dist(p[i - 1]!, p[i]!))
  const total = cum[cum.length - 1]!
  const out: Polyline = []
  let seg = 1
  for (let i = 0; i < n; i++) {
    const target = total * (from + ((to - from) * i) / (n - 1))
    while (seg < p.length - 1 && cum[seg]! < target) seg++
    const a = cum[seg - 1]!
    const b = cum[seg]!
    const t = b > a ? (target - a) / (b - a) : 0
    out.push(mix(p[seg - 1]!, p[seg]!, t < 0 ? 0 : t > 1 ? 1 : t))
  }
  return out
}

/** The last point of every polyline (for example the leaves of `tree()`). */
export function ends(shape: Polyline[]): Vec3[] {
  const out: Vec3[] = []
  for (const p of shape) {
    const v = p[p.length - 1]
    if (v) out.push([v[0], v[1], v[2]])
  }
  return out
}

/* ------------------------------------------------------------------ globe */

export interface GlobeOptions {
  radius?: number
  /** Number of longitude lines. Default 24. */
  meridians?: number
  /** Number of latitude circles between the poles. Default 11. */
  parallels?: number
  /** Points per full circle. Default 96. Raise it for a very large globe (192 or more). */
  segments?: number
  /** Thin the meridians toward the poles so they never clot. Default true. */
  thin?: boolean
  /** Latitude in degrees where the longest meridians stop on a small closing ring. Default 84. */
  capLatitude?: number
  /** Draw only the band between these latitudes, in degrees. Default -90 and 90. A big cropped globe needs only the part in view. */
  south?: number
  north?: number
}

/** A point on a sphere from latitude and longitude in degrees. Longitude 0 faces +X, 90 faces +Z. */
export function globePoint(latitude: number, longitude: number, radius = 1): Vec3 {
  const la = latitude * DEG
  const lo = longitude * DEG
  const c = Math.cos(la)
  return [radius * c * Math.cos(lo), radius * Math.sin(la), radius * c * Math.sin(lo)]
}

/**
 * Latitude and longitude lines. Meridians run south to north. With `thin`, every second meridian
 * stops at the parallel nearest 60 degrees, every fourth at the one nearest 75, and so on, which keeps
 * the line density near the poles within twice the density at the equator.
 */
export function globe(options: GlobeOptions = {}): Polyline[] {
  const radius = options.radius ?? 1
  const meridians = Math.max(0, Math.round(options.meridians ?? 24))
  const parallels = Math.max(0, Math.round(options.parallels ?? 11))
  const segments = Math.max(12, Math.round(options.segments ?? 96))
  const thin = options.thin ?? true
  const cap = Math.min(options.capLatitude ?? 84, 89) * DEG
  const south = Math.max(options.south ?? -90, -90) * DEG
  const north = Math.min(options.north ?? 90, 90) * DEG
  const out: Polyline[] = []

  const lats: number[] = []
  for (let j = 0; j < parallels; j++) lats.push((-90 + ((j + 1) * 180) / (parallels + 1)) * DEG)
  const top = lats.length ? lats[lats.length - 1]! : 0

  let capUsed = false
  for (let i = 0; i < meridians; i++) {
    let latMax = cap
    if (thin) {
      let stride = 1
      while (meridians % (stride * 2) === 0 && i % (stride * 2) === 0) stride *= 2
      const free = Math.acos(Math.min(1, 0.5 / stride))
      if (free >= cap) {
        latMax = cap
      } else {
        // End on the highest parallel that is not above the free latitude, so the join is clean.
        let snapped = -1
        for (const la of lats) if (la > 1e-6 && la <= free + 1e-6) snapped = la
        latMax = snapped > 0 ? snapped : free
      }
    }
    if (latMax >= cap - 1e-6) capUsed = true
    const from = Math.max(-latMax, south)
    const to = Math.min(latMax, north)
    if (to - from < 1e-6) continue
    const lon = (i / meridians) * TAU
    const n = Math.max(2, Math.round((to - from) / (TAU / segments)))
    const p: Polyline = []
    for (let k = 0; k <= n; k++) {
      const la = from + ((to - from) * k) / n
      const c = Math.cos(la)
      p.push([radius * c * Math.cos(lon), radius * Math.sin(la), radius * c * Math.sin(lon)])
    }
    out.push(p)
  }

  const rings = lats.slice()
  if (capUsed && meridians > 0 && cap > top + 1e-6) rings.push(cap, -cap)
  for (const la of rings) {
    if (la < south - 1e-6 || la > north + 1e-6) continue
    const c = Math.cos(la)
    // Facet sag grows with radius over segments squared, so small circles need the square root, not the ratio.
    const n = Math.max(24, Math.round(segments * Math.sqrt(c)))
    const p: Polyline = []
    for (let k = 0; k <= n; k++) {
      const lo = (k / n) * TAU
      p.push([radius * c * Math.cos(lo), radius * Math.sin(la), radius * c * Math.sin(lo)])
    }
    out.push(p)
  }
  return out
}

/* ------------------------------------------------------------------ ring / orbit */

export interface OrbitElements {
  /** Semi-major axis. With eccentricity 0 this is simply the radius. Default 1. */
  radius?: number
  /** 0 is a circle. Below 1. The origin sits at one focus of the ellipse. Default 0. */
  eccentricity?: number
  /** Tilt of the orbital plane from the XZ plane, degrees. Default 0. */
  inclination?: number
  /** Rotation of the tilted plane about the Y axis, degrees. Default 0. */
  node?: number
  /** Rotation of the ellipse inside its own plane, degrees: where the closest point to the origin sits. Default 0. */
  periapsis?: number
}

export interface RingOptions extends OrbitElements {
  /** Points around the full ring. Default 128. */
  segments?: number
  /** Where the polyline starts, degrees around the ring. The reveal animation draws on from here. Default 0. */
  phase?: number
  /** Fraction of the ring to draw, 0 to 1. Default 1 (closed). */
  arc?: number
}

function orbitFrame(el: OrbitElements, u: number, v: number, out: XYZ): void {
  // (u, v) are coordinates in the orbital plane with the focus at the origin.
  const w = (el.periapsis ?? 0) * DEG
  const cw = Math.cos(w)
  const sw = Math.sin(w)
  const pu = u * cw - v * sw
  const pv = u * sw + v * cw
  const inc = (el.inclination ?? 0) * DEG
  const y = pv * Math.sin(inc)
  const z0 = pv * Math.cos(inc)
  const nd = (el.node ?? 0) * DEG
  const cn = Math.cos(nd)
  const sn = Math.sin(nd)
  out.x = pu * cn + z0 * sn
  out.y = y
  out.z = -pu * sn + z0 * cn
}

/**
 * Position on an orbit at a true anomaly (the angle from the closest point, seen from the origin), in radians.
 * Writes into `out` and returns it, so it allocates nothing: use it every frame to move satellites.
 */
export function orbitPoint<T extends XYZ>(out: T, elements: OrbitElements, anomaly: number): T {
  const a = elements.radius ?? 1
  const e = elements.eccentricity ?? 0
  const r = (a * (1 - e * e)) / (1 + e * Math.cos(anomaly))
  orbitFrame(elements, r * Math.cos(anomaly), r * Math.sin(anomaly), out)
  return out
}

/**
 * Kepler's equation: turn a mean anomaly (an angle that grows evenly with time, radians) into the true
 * anomaly for `orbitPoint`. With eccentricity above 0 a satellite lingers at the far end of its orbit.
 */
export function trueAnomaly(meanAnomaly: number, eccentricity: number): number {
  const e = eccentricity
  if (e <= 0) return meanAnomaly
  const m = meanAnomaly - TAU * Math.floor(meanAnomaly / TAU)
  let E = e < 0.8 ? m : Math.PI
  for (let i = 0; i < 6; i++) E -= (E - e * Math.sin(E) - m) / (1 - e * Math.cos(E))
  return 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2))
}

/**
 * Dwell timing. A satellite on an orbit much larger than the frame is out of sight for most of each period.
 * This maps a phase (share of a period; any real number, it wraps) to a mean anomaly so that the satellite
 * spends `share` of every period on the arc between the mean anomalies `from` and `to` (the part in view), and
 * hurries round the rest. It is Kepler's own behaviour, exaggerated; within each part the speed profile stays
 * Keplerian. Feed the result to `trueAnomaly`. `to` must be greater than `from` and less than a full turn apart.
 */
export function dwell(phase: number, from: number, to: number, share: number): number {
  const p = phase - Math.floor(phase)
  const span = to - from
  const s = Math.min(Math.max(share, 0.01), 0.99)
  if (p < s) return from + (p / s) * span
  return to + ((p - s) / (1 - s)) * (TAU - span)
}

/**
 * Aim an orbit: returns the inclination, node and periapsis (degrees) of an orbit whose farthest point lies in
 * the direction `far`, with `roll` degrees turning the orbital plane about that direction. Spread the result
 * into the options of `ring()` and `orbitPoint()`. This is the easy way to place an elliptical loop in a scene:
 * point its far end where you want the satellite to linger, then roll the loop until it sits well.
 */
export function orbitToward(far: Vec3, roll = 0): { inclination: number; node: number; periapsis: number } {
  const a = normalize(far)
  const peri: Vec3 = [-a[0], -a[1], -a[2]]
  let side = cross([0, 1, 0], a)
  if (Math.hypot(side[0], side[1], side[2]) < 1e-6) side = [1, 0, 0]
  side = rotateAround(normalize(side), a, roll * DEG)
  const n = normalize(cross(peri, side))
  const inc = Math.acos(Math.min(1, Math.max(-1, -n[1])))
  const node = Math.sin(inc) > 1e-6 ? Math.atan2(n[0], n[2]) : 0
  const eu: Vec3 = [Math.cos(node), 0, -Math.sin(node)]
  const ev = cross(n, eu)
  const w = Math.atan2(peri[0] * ev[0] + peri[1] * ev[1] + peri[2] * ev[2], peri[0] * eu[0] + peri[1] * eu[1] + peri[2] * eu[2])
  return { inclination: inc / DEG, node: node / DEG, periapsis: w / DEG }
}

/** One inclined ring (a circle, or an ellipse with the origin at a focus) as a single polyline. */
export function ring(options: RingOptions = {}): Polyline[] {
  const a = options.radius ?? 1
  const e = Math.min(Math.max(options.eccentricity ?? 0, 0), 0.95)
  const b = a * Math.sqrt(1 - e * e)
  const arc = Math.min(Math.max(options.arc ?? 1, 0), 1)
  const n = Math.max(3, Math.round((options.segments ?? 128) * arc))
  const start = (options.phase ?? 0) * DEG
  const p: Polyline = []
  const tmp = { x: 0, y: 0, z: 0 }
  for (let i = 0; i <= n; i++) {
    const E = start + (i / n) * arc * TAU
    orbitFrame(options, a * (Math.cos(E) - e), b * Math.sin(E), tmp)
    p.push([tmp.x, tmp.y, tmp.z])
  }
  return [p]
}

/* ------------------------------------------------------------------ torus */

export interface TorusOptions {
  /** Distance from the centre to the middle of the tube. Default 0.66. */
  radius?: number
  /** Radius of the tube. Default 0.32. */
  tube?: number
  /** Circles around the tube. Default 28. */
  rings?: number
  /** Circles around the axis. Default 12. */
  loops?: number
  /** Points per full circle. Default 64. */
  segments?: number
}

/** A torus around the Y axis drawn as tube circles and long loops. */
export function torus(options: TorusOptions = {}): Polyline[] {
  const R = options.radius ?? 0.66
  const r = options.tube ?? 0.32
  const rings = Math.max(0, Math.round(options.rings ?? 28))
  const loops = Math.max(0, Math.round(options.loops ?? 12))
  const segments = Math.max(8, Math.round(options.segments ?? 64))
  const out: Polyline[] = []
  const tubeSeg = Math.max(12, Math.round(segments * 0.5))
  for (let i = 0; i < rings; i++) {
    const th = (i / rings) * TAU
    const p: Polyline = []
    for (let k = 0; k <= tubeSeg; k++) {
      const ph = (k / tubeSeg) * TAU
      const d = R + r * Math.cos(ph)
      p.push([d * Math.cos(th), r * Math.sin(ph), d * Math.sin(th)])
    }
    out.push(p)
  }
  for (let j = 0; j < loops; j++) {
    const ph = (j / loops) * TAU
    const d = R + r * Math.cos(ph)
    const y = r * Math.sin(ph)
    const p: Polyline = []
    for (let k = 0; k <= segments; k++) {
      const th = (k / segments) * TAU
      p.push([d * Math.cos(th), y, d * Math.sin(th)])
    }
    out.push(p)
  }
  return out
}

/* ------------------------------------------------------------------ saddle */

export interface SaddleOptions {
  /** Half width of the square patch. Default 0.8. */
  size?: number
  /** Lines in each direction. Default 12. */
  lines?: number
  /** Points along each line. Default 24. */
  segments?: number
  /** Height of the rise at the corners. Default 0.5. */
  height?: number
}

/** A saddle surface (y rises along X and falls along Z) drawn as a grid of curves. */
export function saddle(options: SaddleOptions = {}): Polyline[] {
  const s = options.size ?? 0.8
  const lines = Math.max(1, Math.round(options.lines ?? 12))
  const seg = Math.max(2, Math.round(options.segments ?? 24))
  const h = options.height ?? 0.5
  const f = (x: number, z: number): Vec3 => [x * s, h * (x * x - z * z), z * s]
  const out: Polyline[] = []
  for (let i = 0; i <= lines; i++) {
    const c = -1 + (2 * i) / lines
    const a: Polyline = []
    const b: Polyline = []
    for (let k = 0; k <= seg; k++) {
      const t = -1 + (2 * k) / seg
      a.push(f(t, c))
      b.push(f(c, t))
    }
    out.push(a, b)
  }
  return out
}

/* ------------------------------------------------------------------ wave surface */

export interface WaveSurfaceOptions {
  /** Extent along X. Default 2. */
  width?: number
  /** Extent along Z. Default 1.3. */
  depth?: number
  /** Lines running along X. Default 18. */
  lines?: number
  /** Lines running along Z (0 for a ribbon of parallel traces). Default 0. */
  cross?: number
  /** Points along each line. Default 72. */
  segments?: number
  /** Peak height. Default 0.26. */
  amplitude?: number
  /** Number of waves across the width. Default 1.5. */
  waves?: number
  /** Phase shift across the depth, in turns: gives the ribbon its twist. Default 0.35. */
  twist?: number
  /** Phase in degrees. Default 0. */
  phase?: number
  /** Ease the wave to flat at both ends of X. Default true. */
  taper?: boolean
}

/** A rippling ribbon: parallel traces along X whose phase shifts across Z. */
export function waveSurface(options: WaveSurfaceOptions = {}): Polyline[] {
  const w = options.width ?? 2
  const d = options.depth ?? 1.3
  const lines = Math.max(1, Math.round(options.lines ?? 18))
  const crossLines = Math.max(0, Math.round(options.cross ?? 0))
  const seg = Math.max(4, Math.round(options.segments ?? 72))
  const amp = options.amplitude ?? 0.26
  const waves = options.waves ?? 1.5
  const twist = options.twist ?? 0.35
  const phase = (options.phase ?? 0) * DEG
  const taper = options.taper ?? true
  const f = (u: number, v: number): Vec3 => {
    // u, v in 0..1
    const env = taper ? Math.sin(Math.PI * u) ** 0.8 : 1
    const y = amp * env * Math.sin(TAU * (waves * u + twist * (v - 0.5)) + phase) * (0.65 + 0.35 * Math.cos(Math.PI * (v - 0.5)))
    return [(u - 0.5) * w, y, (v - 0.5) * d]
  }
  const out: Polyline[] = []
  for (let i = 0; i < lines; i++) {
    const v = lines === 1 ? 0.5 : i / (lines - 1)
    const p: Polyline = []
    for (let k = 0; k <= seg; k++) p.push(f(k / seg, v))
    out.push(p)
  }
  const crossSeg = Math.max(4, Math.round(seg / 3))
  for (let j = 0; j < crossLines; j++) {
    const u = crossLines === 1 ? 0.5 : j / (crossLines - 1)
    const p: Polyline = []
    for (let k = 0; k <= crossSeg; k++) p.push(f(u, k / crossSeg))
    out.push(p)
  }
  return out
}

/* ------------------------------------------------------------------ helix */

export interface HelixOptions {
  radius?: number
  /** Extent along Y. Default 1.8. */
  height?: number
  /** Full turns. Default 2.5. */
  turns?: number
  /** Strands, evenly spaced around the axis. Default 2 (a double helix). */
  strands?: number
  /** Straight rungs between the first two strands. Default 14. */
  rungs?: number
  /** Points along each strand. Default 120. */
  segments?: number
  /** Which lines to return. Default 'all'. */
  part?: 'all' | 'strands' | 'rungs'
}

/** A double helix around the Y axis with rungs. */
export function helix(options: HelixOptions = {}): Polyline[] {
  const r = options.radius ?? 0.46
  const h = options.height ?? 1.8
  const turns = options.turns ?? 2.5
  const strands = Math.max(1, Math.round(options.strands ?? 2))
  const rungs = Math.max(0, Math.round(options.rungs ?? 14))
  const seg = Math.max(8, Math.round(options.segments ?? 120))
  const part = options.part ?? 'all'
  const at = (t: number, s: number): Vec3 => {
    const a = TAU * turns * t + (s / strands) * TAU
    return [r * Math.cos(a), (t - 0.5) * h, r * Math.sin(a)]
  }
  const out: Polyline[] = []
  if (part !== 'rungs') {
    for (let s = 0; s < strands; s++) {
      const p: Polyline = []
      for (let k = 0; k <= seg; k++) p.push(at(k / seg, s))
      out.push(p)
    }
  }
  if (part !== 'strands' && strands >= 2) {
    for (let i = 0; i < rungs; i++) {
      const t = (i + 0.5) / rungs
      out.push([at(t, 0), at(t, 1)])
    }
  }
  return out
}

/* ------------------------------------------------------------------ lattice */

export interface LatticeOptions {
  /** Full extent per axis. A number applies to all three. Default 1.2. */
  size?: number | Vec3
  /** Cells per axis. A number applies to all three. Default 3. */
  cells?: number | Vec3
}

/** A cubic lattice: straight lines through every grid point along X, Y and Z. */
export function lattice(options: LatticeOptions = {}): Polyline[] {
  const size: Vec3 = typeof options.size === 'number' ? [options.size, options.size, options.size] : (options.size ?? [1.2, 1.2, 1.2])
  const cRaw: Vec3 = typeof options.cells === 'number' ? [options.cells, options.cells, options.cells] : (options.cells ?? [3, 3, 3])
  const c: Vec3 = [Math.max(1, Math.round(cRaw[0])), Math.max(1, Math.round(cRaw[1])), Math.max(1, Math.round(cRaw[2]))]
  const at = (i: number, j: number, k: number): Vec3 => [(i / c[0] - 0.5) * size[0], (j / c[1] - 0.5) * size[1], (k / c[2] - 0.5) * size[2]]
  const out: Polyline[] = []
  for (let j = 0; j <= c[1]; j++) for (let k = 0; k <= c[2]; k++) out.push([at(0, j, k), at(c[0], j, k)])
  for (let i = 0; i <= c[0]; i++) for (let k = 0; k <= c[2]; k++) out.push([at(i, 0, k), at(i, c[1], k)])
  for (let i = 0; i <= c[0]; i++) for (let j = 0; j <= c[1]; j++) out.push([at(i, j, 0), at(i, j, c[2])])
  return out
}

/* ------------------------------------------------------------------ strata */

export interface StrataOptions {
  /** Stacked layers. Default 6. */
  layers?: number
  /** Extent along X. Default 1.7. */
  width?: number
  /** Extent along Z. Default 1.1. */
  depth?: number
  /** Extent along Y. Default 1.15. */
  height?: number
  /** Traces per layer, spread across Z. Default 5. */
  lines?: number
  /** Points along each trace. Default 48. */
  segments?: number
  /** Strength of the warp, in units. Default 0.07. */
  warp?: number
  /** Close each layer with its two end edges. Default true. */
  edges?: boolean
  seed?: number
}

/** Stacked, gently warped layers. Neighbouring layers bend together, like sediment. */
export function strata(options: StrataOptions = {}): Polyline[] {
  const layers = Math.max(1, Math.round(options.layers ?? 6))
  const w = options.width ?? 1.7
  const d = options.depth ?? 1.1
  const h = options.height ?? 1.15
  const lines = Math.max(2, Math.round(options.lines ?? 5))
  const seg = Math.max(4, Math.round(options.segments ?? 48))
  const warp = options.warp ?? 0.07
  const edges = options.edges ?? true
  const rand = seeded(options.seed ?? 7)
  const p1 = rand() * TAU
  const p2 = rand() * TAU
  const p3 = rand() * TAU
  const f = (u: number, v: number, layer: number): Vec3 => {
    const x = (u - 0.5) * w
    const z = (v - 0.5) * d
    const base = layers === 1 ? 0 : (layer / (layers - 1) - 0.5) * h
    const drift = layer * 0.55
    const y =
      base +
      warp *
        (Math.sin(2.2 * x + 0.8 * z + p1 + drift * 0.35) +
          0.55 * Math.sin(4.1 * x - 1.3 * z + p2 + drift * 0.6) +
          0.3 * Math.sin(1.1 * x + 2.6 * z + p3 - drift * 0.4))
    return [x, y, z]
  }
  const out: Polyline[] = []
  for (let l = 0; l < layers; l++) {
    for (let i = 0; i < lines; i++) {
      const v = i / (lines - 1)
      const p: Polyline = []
      for (let k = 0; k <= seg; k++) p.push(f(k / seg, v, l))
      out.push(p)
    }
    if (edges) {
      const es = Math.max(2, Math.round(seg / 4))
      const a: Polyline = []
      const b: Polyline = []
      for (let k = 0; k <= es; k++) {
        a.push(f(0, k / es, l))
        b.push(f(1, k / es, l))
      }
      out.push(a, b)
    }
  }
  return out
}

/* ------------------------------------------------------------------ cone and sweep */

export interface ConeOptions {
  /** Rays from the apex. Default 24. */
  rays?: number
  /** Half angle of the cone, degrees. Default 26. */
  angle?: number
  /** Length along the axis. Default 1.7. */
  length?: number
  /** Rings across the cone. Default 4. */
  rings?: number
  /** Points per ring. Default 64. */
  segments?: number
}

/** A cone of rays along +Y from an apex at the bottom, with rings across it. */
export function cone(options: ConeOptions = {}): Polyline[] {
  const rays = Math.max(0, Math.round(options.rays ?? 24))
  const ang = (options.angle ?? 26) * DEG
  const len = options.length ?? 1.7
  const rings = Math.max(0, Math.round(options.rings ?? 4))
  const seg = Math.max(8, Math.round(options.segments ?? 64))
  const apex: Vec3 = [0, -len / 2, 0]
  const rad = Math.tan(ang) * len
  const out: Polyline[] = []
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * TAU
    out.push([apex, [rad * Math.cos(a), len / 2, rad * Math.sin(a)]])
  }
  for (let j = 1; j <= rings; j++) {
    const t = j / rings
    const p: Polyline = []
    for (let k = 0; k <= seg; k++) {
      const a = (k / seg) * TAU
      p.push([rad * t * Math.cos(a), -len / 2 + len * t, rad * t * Math.sin(a)])
    }
    out.push(p)
  }
  return out
}

export interface SweepOptions {
  /** Rays in the fan. Default 25. */
  rays?: number
  /** Full spread of the fan, degrees. Default 80. */
  spread?: number
  /** Reach of the rays. Default 1.8. */
  length?: number
  /** Range arcs across the fan. Default 4. */
  arcs?: number
  /** Points per arc. Default 48. */
  segments?: number
  /** Lift of the far end above the plane, in units, for a slight dish. Default 0. */
  lift?: number
}

/** A flat fan of rays from one origin in the XZ plane, pointing along -Z, with range arcs. */
export function sweep(options: SweepOptions = {}): Polyline[] {
  const rays = Math.max(2, Math.round(options.rays ?? 25))
  const spread = (options.spread ?? 80) * DEG
  const len = options.length ?? 1.8
  const arcs = Math.max(0, Math.round(options.arcs ?? 4))
  const seg = Math.max(4, Math.round(options.segments ?? 48))
  const lift = options.lift ?? 0
  const origin: Vec3 = [0, 0, len / 2]
  const at = (a: number, r: number): Vec3 => [Math.sin(a) * r, lift * (r / len) ** 2, len / 2 - Math.cos(a) * r]
  const out: Polyline[] = []
  for (let i = 0; i < rays; i++) {
    const a = -spread / 2 + (spread * i) / (rays - 1)
    out.push([origin, at(a, len)])
  }
  for (let j = 1; j <= arcs; j++) {
    const r = (len * j) / arcs
    const p: Polyline = []
    for (let k = 0; k <= seg; k++) p.push(at(-spread / 2 + (spread * k) / seg, r))
    out.push(p)
  }
  return out
}

/* ------------------------------------------------------------------ tree */

export interface TreeOptions {
  /** Levels of branching. Default 5. */
  depth?: number
  /** Angle between a branch and its parent, degrees. Default 30. */
  spread?: number
  /** Length ratio from one level to the next. Default 0.76. */
  shrink?: number
  /** Turn of the branching plane per level, degrees. Default 72. */
  twist?: number
  /** Sideways bow of each branch as a fraction of its length. Default 0.08. */
  curve?: number
  /** Points per branch. Default 7. */
  points?: number
  /** True (default): one polyline per leaf, running root to leaf, so a reveal grows the tree. False: one per branch. */
  paths?: boolean
  seed?: number
}

interface TreeBuild {
  branches: { points: Polyline; parent: number; leaf: boolean }[]
  root: Vec3
  forks: Vec3[]
  leaves: Vec3[]
  scale: number
  center: Vec3
}

function buildTree(options: TreeOptions): TreeBuild {
  const depth = Math.max(1, Math.round(options.depth ?? 5))
  const spread = (options.spread ?? 30) * DEG
  const shrink = options.shrink ?? 0.76
  const twist = (options.twist ?? 72) * DEG
  const curve = options.curve ?? 0.08
  const pts = Math.max(2, Math.round(options.points ?? 7))
  const rand = seeded(options.seed ?? 11)
  const branches: TreeBuild['branches'] = []
  const forks: Vec3[] = []
  const leaves: Vec3[] = []
  const root: Vec3 = [0, 0, 0]

  const grow = (from: Vec3, dir: Vec3, side: Vec3, len: number, level: number, parent: number): void => {
    const to: Vec3 = [from[0] + dir[0] * len, from[1] + dir[1] * len, from[2] + dir[2] * len]
    const bow = curve * len * (rand() < 0.5 ? -1 : 1)
    const points: Polyline = []
    for (let k = 0; k < pts; k++) {
      const t = k / (pts - 1)
      const s = Math.sin(Math.PI * t) * bow
      const m = mix(from, to, t)
      points.push([m[0] + side[0] * s, m[1] + side[1] * s, m[2] + side[2] * s])
    }
    const leaf = level >= depth
    const index = branches.push({ points, parent, leaf }) - 1
    if (leaf) {
      leaves.push(to)
      return
    }
    forks.push(to)
    const axis = normalize(rotateAround(side, dir, twist * (0.8 + 0.4 * rand())))
    const a1 = spread * (0.75 + 0.5 * rand())
    const a2 = spread * (0.75 + 0.5 * rand())
    const d1 = normalize(rotateAround(dir, axis, a1))
    const d2 = normalize(rotateAround(dir, axis, -a2))
    // The turn axis is perpendicular to both children, so it serves as their sideways direction.
    grow(to, d1, axis, len * shrink * (0.9 + 0.2 * rand()), level + 1, index)
    grow(to, d2, axis, len * shrink * (0.9 + 0.2 * rand()), level + 1, index)
  }
  grow(root, [0, 1, 0], [1, 0, 0], 0.62, 1, -1)

  const b = bounds(branches.map((br) => br.points))
  return { branches, root, forks, leaves, scale: b.radius > 0 ? 1 / b.radius : 1, center: b.center }
}

function fitPoint(v: Vec3, build: TreeBuild): Vec3 {
  return [(v[0] - build.center[0]) * build.scale, (v[1] - build.center[1]) * build.scale, (v[2] - build.center[2]) * build.scale]
}

/** A branching path that grows from one root at the bottom. Fitted to the unit sphere. */
export function tree(options: TreeOptions = {}): Polyline[] {
  const build = buildTree(options)
  const fit = (p: Polyline): Polyline => p.map((v) => fitPoint(v, build))
  if (options.paths === false) return build.branches.map((br) => fit(br.points))
  const out: Polyline[] = []
  build.branches.forEach((br, index) => {
    if (!br.leaf) return
    const chain: number[] = []
    for (let i = index; i >= 0; i = build.branches[i]!.parent) chain.push(i)
    chain.reverse()
    const path: Polyline = []
    chain.forEach((i, n) => {
      const pts = build.branches[i]!.points
      for (let k = n === 0 ? 0 : 1; k < pts.length; k++) path.push(pts[k]!)
    })
    out.push(fit(path))
  })
  return out
}

/** The root, fork and leaf positions of `tree()` made with the same options. */
export function treeNodes(options: TreeOptions = {}): { root: Vec3; forks: Vec3[]; leaves: Vec3[] } {
  const build = buildTree(options)
  return {
    root: fitPoint(build.root, build),
    forks: build.forks.map((v) => fitPoint(v, build)),
    leaves: build.leaves.map((v) => fitPoint(v, build)),
  }
}

/* ------------------------------------------------------------------ git graph */

export interface GitBranch {
  /** Lane index. 0 is the main lane; positive lanes sit above it, negative below. */
  lane: number
  /** Where it leaves its parent, 0 to 1 along the length. */
  from: number
  /** Where it merges back, 0 to 1. Leave out for a branch that is still open. */
  to?: number
  /** Lane it forks from and merges into. Default 0. */
  parent?: number
}

export interface GitGraphOptions {
  /** Extent along X. Default 2. */
  length?: number
  /** Distance between lanes along Y. Default 0.34. */
  gap?: number
  /** Distance between lanes along Z, so the graph reads as 3D when turned. Default 0.16. */
  depthGap?: number
  /** Length of a fork or merge curve as a fraction of the length. Default 0.09. */
  run?: number
  /** Commits along the main lane. Default 9. */
  commits?: number
  branches?: GitBranch[]
}

const DEFAULT_BRANCHES: GitBranch[] = [
  { lane: 1, from: 0.08, to: 0.5 },
  { lane: 2, from: 0.2, to: 0.38, parent: 1 },
  { lane: -1, from: 0.42, to: 0.8 },
  { lane: 1, from: 0.66 },
]

interface GitBuild {
  lines: Polyline[]
  commits: Vec3[]
  merges: Vec3[]
  heads: Vec3[]
}

function buildGit(options: GitGraphOptions): GitBuild {
  const len = options.length ?? 2
  const gap = options.gap ?? 0.34
  const zGap = options.depthGap ?? 0.16
  const run = options.run ?? 0.09
  const commitCount = Math.max(2, Math.round(options.commits ?? 9))
  const branches = options.branches ?? DEFAULT_BRANCHES
  let lo = 0
  let hi = 0
  for (const br of branches) {
    lo = Math.min(lo, br.lane)
    hi = Math.max(hi, br.lane)
  }
  const mid = (lo + hi) / 2
  // Lanes are centred on the origin; side lanes step back in Z so the graph has depth when turned.
  const lanePos = (lane: number, f: number): Vec3 => [(f - 0.5) * len, (lane - mid) * gap, -Math.abs(lane) * zGap]
  const lines: Polyline[] = [line(lanePos(0, 0), lanePos(0, 1), 24)]
  const commits: Vec3[] = []
  const merges: Vec3[] = []
  const heads: Vec3[] = [lanePos(0, 1)]
  for (let i = 0; i < commitCount; i++) commits.push(lanePos(0, (i + 0.5) / commitCount))
  const curveSeg = 12
  for (const br of branches) {
    const parent = br.parent ?? 0
    const start = br.from
    const end = br.to ?? 0.98
    const p: Polyline = []
    for (let k = 0; k <= curveSeg; k++) {
      const t = k / curveSeg
      p.push(mix(lanePos(parent, start + run * t), lanePos(br.lane, start + run * t), smooth(t)))
    }
    const straightEnd = br.to === undefined ? end : end - run
    const straight = line(lanePos(br.lane, start + run), lanePos(br.lane, straightEnd), 10)
    for (let k = 1; k < straight.length; k++) p.push(straight[k]!)
    if (br.to !== undefined) {
      for (let k = 1; k <= curveSeg; k++) {
        const t = k / curveSeg
        p.push(mix(lanePos(br.lane, straightEnd + run * t), lanePos(parent, straightEnd + run * t), smooth(t)))
      }
      merges.push(lanePos(parent, end))
    } else {
      heads.push(lanePos(br.lane, end))
    }
    lines.push(p)
    const span = straightEnd - (start + run)
    const n = Math.max(1, Math.round(span * commitCount))
    for (let i = 0; i < n; i++) commits.push(lanePos(br.lane, start + run + (span * (i + 0.5)) / n))
  }
  return { lines, commits, merges, heads }
}

/** Parallel lanes with fork and merge curves, in the XY plane with a little depth per lane. */
export function gitGraph(options: GitGraphOptions = {}): Polyline[] {
  return buildGit(options).lines
}

/** Commit, merge and branch-head positions of `gitGraph()` made with the same options. */
export function gitGraphNodes(options: GitGraphOptions = {}): { commits: Vec3[]; merges: Vec3[]; heads: Vec3[] } {
  const b = buildGit(options)
  return { commits: b.commits, merges: b.merges, heads: b.heads }
}

/* ------------------------------------------------------------------ funnel */

export interface FunnelOptions {
  /** Rings from the mouth to the tip. Default 10. */
  rings?: number
  /** Radius of the mouth. Default 0.95. */
  radius?: number
  /** Extent along Y. Default 1.7. */
  height?: number
  /** Profile exponent: 1 is a straight cone, above 1 flares at the mouth. Default 1.7. */
  flare?: number
  /** Lines from the mouth down to the tip. Default 0. */
  spokes?: number
  /** Points per ring. Default 72. */
  segments?: number
}

/** Rings that narrow from a wide mouth at the top to a single point at the bottom, (0, -height / 2, 0). */
export function funnel(options: FunnelOptions = {}): Polyline[] {
  const rings = Math.max(1, Math.round(options.rings ?? 10))
  const R = options.radius ?? 0.95
  const h = options.height ?? 1.7
  const flare = options.flare ?? 1.7
  const spokes = Math.max(0, Math.round(options.spokes ?? 0))
  const seg = Math.max(8, Math.round(options.segments ?? 72))
  const profile = (t: number): [number, number] => [R * (1 - t) ** flare, h / 2 - h * t]
  const out: Polyline[] = []
  for (let i = 0; i < rings; i++) {
    const [r, y] = profile(i / rings)
    const n = Math.max(12, Math.round(seg * Math.sqrt(r / R)))
    const p: Polyline = []
    for (let k = 0; k <= n; k++) {
      const a = (k / n) * TAU
      p.push([r * Math.cos(a), y, r * Math.sin(a)])
    }
    out.push(p)
  }
  for (let s = 0; s < spokes; s++) {
    const a = (s / spokes) * TAU
    const p: Polyline = []
    for (let k = 0; k <= 24; k++) {
      const [r, y] = profile(k / 24)
      p.push([r * Math.cos(a), y, r * Math.sin(a)])
    }
    out.push(p)
  }
  return out
}

/* ------------------------------------------------------------------ plane grid */

export interface PlaneGridOptions {
  /** Extent along X. Default 1.9. */
  width?: number
  /** Extent along Z. Default 1.9. */
  depth?: number
  /** Cells along X. Default 10. */
  cols?: number
  /** Cells along Z. Default 10. */
  rows?: number
  /** Smooth paths rising across the grid. Default 2. */
  paths?: number
  /** Height the paths reach, in units. Default 0.7. */
  lift?: number
  /** Add two axes from the near left corner: one along X past the grid, one straight up. Default false. */
  axes?: boolean
  /** Which lines to return. Default 'all'. */
  part?: 'all' | 'grid' | 'paths' | 'axes'
}

/** A flat grid in the XZ plane with smooth paths rising across it. Tilt the object to taste. */
export function planeGrid(options: PlaneGridOptions = {}): Polyline[] {
  const w = options.width ?? 1.9
  const d = options.depth ?? 1.9
  const cols = Math.max(1, Math.round(options.cols ?? 10))
  const rows = Math.max(1, Math.round(options.rows ?? 10))
  const paths = Math.max(0, Math.round(options.paths ?? 2))
  const lift = options.lift ?? 0.7
  const part = options.part ?? 'all'
  const out: Polyline[] = []
  if (part === 'all' || part === 'grid') {
    for (let i = 0; i <= cols; i++) {
      const x = (i / cols - 0.5) * w
      out.push([
        [x, 0, -d / 2],
        [x, 0, d / 2],
      ])
    }
    for (let j = 0; j <= rows; j++) {
      const z = (j / rows - 0.5) * d
      out.push([
        [-w / 2, 0, z],
        [w / 2, 0, z],
      ])
    }
  }
  if (part === 'all' || part === 'paths') {
    for (let p = 0; p < paths; p++) {
      const k = paths === 1 ? 0.5 : p / (paths - 1)
      const bend = 0.55 + 0.9 * k
      const rise = 1.5 + 1.3 * (1 - k)
      const top = lift * (1 - 0.32 * k)
      const pl: Polyline = []
      for (let i = 0; i <= 64; i++) {
        const t = i / 64
        const x = (-0.5 + t) * w * 0.92
        const z = (0.5 - t ** bend) * d * 0.92
        const y = top * smooth(t) ** rise + 0.02 * Math.sin(TAU * (1.2 * t + 0.3 * k)) * t
        pl.push([x, y, z])
      }
      out.push(pl)
    }
  }
  if ((part === 'all' && options.axes) || part === 'axes') {
    out.push([
      [-w / 2, 0, d / 2],
      [w / 2 + 0.12 * w, 0, d / 2],
    ])
    out.push([
      [-w / 2, 0, d / 2],
      [-w / 2, lift * 1.15, d / 2],
    ])
  }
  return out
}

/* ------------------------------------------------------------------ sheets */

export interface SheetsOptions {
  /** Rectangles in the stack. Default 5. */
  count?: number
  width?: number
  height?: number
  /** Distance between sheets along Z. Default 0.13. */
  gap?: number
  /** Sideways and upward offset per sheet. Default [0.07, 0.05]. */
  shift?: [number, number]
  /** Rotation per sheet about Z, degrees: fans the stack. Default 0. */
  fan?: number
  /** Ruled lines on the front sheet. Default 0. */
  rules?: number
}

/** A stack of offset rectangles facing +Z. The front sheet is the last polyline group and can carry ruled lines. */
export function sheets(options: SheetsOptions = {}): Polyline[] {
  const count = Math.max(1, Math.round(options.count ?? 5))
  const w = options.width ?? 1.05
  const h = options.height ?? 1.4
  const gap = options.gap ?? 0.13
  const shift = options.shift ?? [0.07, 0.05]
  const fan = (options.fan ?? 0) * DEG
  const rules = Math.max(0, Math.round(options.rules ?? 0))
  const out: Polyline[] = []
  const place = (x: number, y: number, i: number): Vec3 => {
    const k = i - (count - 1) / 2
    const a = fan * k
    const c = Math.cos(a)
    const s = Math.sin(a)
    return [x * c - y * s + shift[0] * k, x * s + y * c + shift[1] * k, gap * k]
  }
  for (let i = 0; i < count; i++) {
    out.push([place(-w / 2, -h / 2, i), place(w / 2, -h / 2, i), place(w / 2, h / 2, i), place(-w / 2, h / 2, i), place(-w / 2, -h / 2, i)])
  }
  for (let r = 0; r < rules; r++) {
    const y = h / 2 - (h * (r + 1.5)) / (rules + 2.5)
    const short = r === rules - 1 ? 0.45 : 1
    out.push([place(-w * 0.36, y, count - 1), place(-w * 0.36 + w * 0.72 * short, y, count - 1)])
  }
  return out
}

/* ------------------------------------------------------------------ graph */

export interface GraphOptions {
  /** Number of nodes. Default 16. */
  nodes?: number
  /** Radius of the cloud. Default 0.95. */
  radius?: number
  /** Edges from each node to its nearest neighbours. Default 2. */
  neighbors?: number
  /** Squash along Z, 0 to 1: 1 is a ball, lower is a disc. Default 0.55. */
  flatten?: number
  seed?: number
}

function buildGraph(options: GraphOptions): { nodes: Vec3[]; edges: [number, number][] } {
  const count = Math.max(2, Math.round(options.nodes ?? 16))
  const radius = options.radius ?? 0.95
  const neighbors = Math.max(1, Math.round(options.neighbors ?? 2))
  const flatten = options.flatten ?? 0.55
  const rand = seeded(options.seed ?? 5)
  const candidate = (): Vec3 => {
    // Uniform in a ball, then squashed.
    const u = rand() * 2 - 1
    const a = rand() * TAU
    const r = radius * Math.cbrt(0.08 + 0.92 * rand())
    const s = Math.sqrt(1 - u * u)
    return [r * s * Math.cos(a), r * s * Math.sin(a), r * u * flatten]
  }
  const nodes: Vec3[] = [candidate()]
  while (nodes.length < count) {
    // Best of several candidates: keeps the nodes loosely even without a grid.
    let best = candidate()
    let bestD = -1
    for (let c = 0; c < 14; c++) {
      const v = candidate()
      let near = Infinity
      for (const n of nodes) near = Math.min(near, dist(n, v))
      if (near > bestD) {
        bestD = near
        best = v
      }
    }
    nodes.push(best)
  }
  const edges: [number, number][] = []
  const seen = new Set<string>()
  nodes.forEach((n, i) => {
    const order = nodes
      .map((m, j) => ({ j, d: j === i ? Infinity : dist(n, m) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, neighbors)
    for (const { j } of order) {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`
      if (seen.has(key)) continue
      seen.add(key)
      edges.push([i, j])
    }
  })
  return { nodes, edges }
}

/** A loose network: nodes joined to their nearest neighbours by straight edges. */
export function graph(options: GraphOptions = {}): Polyline[] {
  const g = buildGraph(options)
  return g.edges.map(([a, b]) => [g.nodes[a]!, g.nodes[b]!])
}

/** Node positions of `graph()` made with the same options. */
export function graphNodes(options: GraphOptions = {}): Vec3[] {
  return buildGraph(options).nodes
}

/* ------------------------------------------------------------------ figures (morphing) */

/**
 * Resample any shape to exactly `rows` polylines of `points` points each, packed as xyz in one Float32Array
 * of length rows * points * 3. Two figures with the same rows and points can be blended point for point.
 *
 * Longer polylines get more rows (they are cut into equal pieces that share end points), so the point
 * density stays even. If the shape has more polylines than `rows`, the shortest ones are dropped.
 */
export function toFigure(shape: Polyline[], rows: number, points: number): Float32Array {
  const K = Math.max(1, Math.round(rows))
  const M = Math.max(2, Math.round(points))
  const out = new Float32Array(K * M * 3)
  let items = shape
    .filter((p) => p.length >= 2)
    .map((p) => ({ p, length: polylineLength(p), rows: 1 }))
    .filter((it) => it.length > 0)
  if (items.length === 0) return out
  if (items.length > K) {
    const keep = new Set(
      items
        .map((it, i) => ({ i, length: it.length }))
        .sort((a, b) => b.length - a.length)
        .slice(0, K)
        .map((e) => e.i),
    )
    items = items.filter((_, i) => keep.has(i))
  }
  let spare = K - items.length
  while (spare > 0) {
    let best = items[0]!
    for (const it of items) if (it.length / it.rows > best.length / best.rows) best = it
    best.rows += 1
    spare -= 1
  }
  let row = 0
  for (const it of items) {
    for (let r = 0; r < it.rows; r++) {
      const piece = resampleRange(it.p, M, r / it.rows, (r + 1) / it.rows)
      for (let i = 0; i < M; i++) {
        const v = piece[i]!
        const o = (row * M + i) * 3
        out[o] = v[0]
        out[o + 1] = v[1]
        out[o + 2] = v[2]
      }
      row += 1
    }
  }
  return out
}

/** Blend two figures of the same size into `out` (which may be one of them). t = 0 gives a, t = 1 gives b. Allocates nothing. */
export function lerpFigure(out: Float32Array, a: Float32Array, b: Float32Array, t: number): Float32Array {
  const n = Math.min(out.length, a.length, b.length)
  for (let i = 0; i < n; i++) {
    const av = a[i]!
    out[i] = av + (b[i]! - av) * t
  }
  return out
}

/**
 * Like `lerpFigure`, but the rows set off one after another, which reads as a wave moving through the shape.
 * `spread` (0 to 1) is how much of the duration the staggering takes; `ease` shapes each row's own travel.
 */
export function morphFigure(
  out: Float32Array,
  a: Float32Array,
  b: Float32Array,
  t: number,
  rows: number,
  spread = 0.35,
  ease: (t: number) => number = smooth,
): Float32Array {
  const K = Math.max(1, Math.round(rows))
  const stride = Math.floor(Math.min(out.length, a.length, b.length) / K)
  const s = Math.min(Math.max(spread, 0), 0.95)
  for (let r = 0; r < K; r++) {
    const delay = K > 1 ? (s * r) / (K - 1) : 0
    const local = (t - delay) / (1 - s)
    const e = ease(local < 0 ? 0 : local > 1 ? 1 : local)
    const o = r * stride
    for (let i = o; i < o + stride; i++) {
      const av = a[i]!
      out[i] = av + (b[i]! - av) * e
    }
  }
  return out
}

/**
 * Reorder (and where it helps, reverse) the rows of `to` so each one is as close as possible to the row of
 * `from` it will morph out of. Returns a new array. Call it once per transition, never per frame. Without it a
 * morph between unrelated shapes crosses over itself; with it lines travel to their nearest counterpart.
 */
export function matchFigure(from: Float32Array, to: Float32Array, rows: number, points: number): Float32Array {
  const K = Math.max(1, Math.round(rows))
  const M = Math.max(2, Math.round(points))
  const out = new Float32Array(to.length)
  if (from.length < K * M * 3 || to.length < K * M * 3) {
    out.set(to)
    return out
  }
  const stations = [0, Math.floor((M - 1) / 4), Math.floor((M - 1) / 2), Math.floor((3 * (M - 1)) / 4), M - 1]
  const sample = (fig: Float32Array, row: number, point: number): Vec3 => {
    const o = (row * M + point) * 3
    return [fig[o]!, fig[o + 1]!, fig[o + 2]!]
  }
  const cost = (i: number, j: number): { c: number; flip: boolean } => {
    let fwd = 0
    let rev = 0
    for (const s of stations) {
      const a = sample(from, i, s)
      const d1 = sub(a, sample(to, j, s))
      const d2 = sub(a, sample(to, j, M - 1 - s))
      fwd += d1[0] * d1[0] + d1[1] * d1[1] + d1[2] * d1[2]
      rev += d2[0] * d2[0] + d2[1] * d2[1] + d2[2] * d2[2]
    }
    return rev < fwd ? { c: rev, flip: true } : { c: fwd, flip: false }
  }
  const costs = new Float32Array(K * K)
  const flips = new Uint8Array(K * K)
  const pairs: number[] = []
  for (let i = 0; i < K; i++) {
    for (let j = 0; j < K; j++) {
      const r = cost(i, j)
      costs[i * K + j] = r.c
      flips[i * K + j] = r.flip ? 1 : 0
      pairs.push(i * K + j)
    }
  }
  pairs.sort((a, b) => costs[a]! - costs[b]!)
  const assign = new Int32Array(K).fill(-1)
  const taken = new Uint8Array(K)
  let left = K
  for (const pair of pairs) {
    if (left === 0) break
    const i = Math.floor(pair / K)
    const j = pair - i * K
    if (assign[i] !== -1 || taken[j]) continue
    assign[i] = j
    taken[j] = 1
    left -= 1
  }
  // A few improvement passes: swap two assignments whenever that shortens the total travel.
  for (let pass = 0; pass < 4; pass++) {
    let improved = false
    for (let a = 0; a < K; a++) {
      for (let b = a + 1; b < K; b++) {
        const ja = assign[a]!
        const jb = assign[b]!
        const now = costs[a * K + ja]! + costs[b * K + jb]!
        const swapped = costs[a * K + jb]! + costs[b * K + ja]!
        if (swapped + 1e-9 < now) {
          assign[a] = jb
          assign[b] = ja
          improved = true
        }
      }
    }
    if (!improved) break
  }
  for (let i = 0; i < K; i++) {
    const j = assign[i]!
    const flip = flips[i * K + j] === 1
    for (let p = 0; p < M; p++) {
      const src = (j * M + (flip ? M - 1 - p : p)) * 3
      const dst = (i * M + p) * 3
      out[dst] = to[src]!
      out[dst + 1] = to[src + 1]!
      out[dst + 2] = to[src + 2]!
    }
  }
  return out
}

/** Unpack a figure back into polylines (handy for building a WireLines from one). */
export function figureToPolylines(figure: Float32Array, rows: number, points: number): Polyline[] {
  const K = Math.max(1, Math.round(rows))
  const M = Math.max(2, Math.round(points))
  const out: Polyline[] = []
  for (let r = 0; r < K; r++) {
    const p: Polyline = []
    for (let i = 0; i < M; i++) {
      const o = (r * M + i) * 3
      p.push([figure[o] ?? 0, figure[o + 1] ?? 0, figure[o + 2] ?? 0])
    }
    out.push(p)
  }
  return out
}
