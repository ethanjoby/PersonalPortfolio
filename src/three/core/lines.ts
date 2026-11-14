import {
  BufferAttribute,
  CustomBlending,
  DoubleSide,
  DynamicDrawUsage,
  InstancedBufferGeometry,
  InstancedInterleavedBuffer,
  InterleavedBufferAttribute,
  MaxEquation,
  Mesh,
  OneFactor,
  ShaderMaterial,
  StaticDrawUsage,
  Vector2,
  Vector3,
  Vector4,
} from 'three'
import type { Camera, Object3D } from 'three'
import type { Occluder, StageShared } from './occluder'
import type { Polyline } from './shapes'

/*
 * WireLines: hairlines in real 3D.
 *
 * Why not three's LineSegments2 / LineMaterial: that material leans on MSAA for the long edges of a line (four
 * coverage levels at DPR 1, which shows as rope-like beading on a 1px stroke), blends translucent segments so
 * every joint of a polyline doubles up into a brighter dot, fades by per-vertex fog toward an opaque color
 * (useless on a transparent canvas), and has no draw-on. This shader keeps the same idea (one instanced quad
 * per segment, expanded in screen space) and changes what matters for line art:
 *
 * - Analytic antialiasing: each fragment measures its distance to the segment in device pixels, so a line has
 *   the same weight at every angle and sub-pixel offset, at DPR 1 and 2, with no multisampling.
 * - MAX blending: overlapping caps, joints and crossings never accumulate, so translucent strokes stay even.
 * - Per-fragment depth: color runs from the front token to the back token by distance from the camera.
 * - An exact sphere occluder with a one pixel soft silhouette (see occluder.ts).
 * - A reveal fraction that draws each polyline on from its start, and antialiased dashes.
 * - Segments are clipped against the near plane in view space before projection.
 *
 * One buffer of points feeds both ends of every segment (stride 3, offsets 0 and 3), so a figure morph is a
 * single typed-array copy with no reallocation.
 */

const VERTEX = /* glsl */ `
attribute vec3 aStart;
attribute vec3 aEnd;
attribute vec3 aMetaStart; // u along its polyline, distance along its polyline, polyline index
attribute vec3 aMetaEnd;

uniform vec2 uResolution;
uniform float uPixelRatio;
uniform float uNear;
uniform float uWidth;

varying vec3 vPx; // along * w, across * w, w  (divide to get screen-linear pixels)
flat varying float vLen;
flat varying vec4 vMeta; // u start, u end, distance start, distance end
flat varying vec3 vInfo; // w start, w end, polyline index
flat varying vec3 vViewS;
flat varying vec3 vViewE;

void main() {
  vec4 s = modelViewMatrix * vec4(aStart, 1.0);
  vec4 e = modelViewMatrix * vec4(aEnd, 1.0);
  vec2 su = aMetaStart.xy;
  vec2 eu = aMetaEnd.xy;
  float nearZ = -uNear;
  bool sOut = s.z > nearZ;
  bool eOut = e.z > nearZ;

  // The instance that bridges two polylines, and segments wholly behind the camera, are dropped.
  if (aMetaStart.z != aMetaEnd.z || (sOut && eOut)) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    vPx = vec3(0.0, 0.0, 1.0);
    vLen = 0.0;
    vMeta = vec4(0.0);
    vInfo = vec3(1.0, 1.0, 0.0);
    vViewS = vec3(0.0, 0.0, -1.0);
    vViewE = vec3(0.0, 0.0, -1.0);
    return;
  }

  // A segment that crosses the near plane is cut there, in view space, before any division by w.
  if (sOut) {
    float t = (nearZ - s.z) / (e.z - s.z);
    s = mix(s, e, t);
    su = mix(su, eu, t);
  } else if (eOut) {
    float t = (nearZ - e.z) / (s.z - e.z);
    e = mix(e, s, t);
    eu = mix(eu, su, t);
  }

  vec4 cs = projectionMatrix * s;
  vec4 ce = projectionMatrix * e;
  vec2 ps = (cs.xy / cs.w * 0.5 + 0.5) * uResolution;
  vec2 pe = (ce.xy / ce.w * 0.5 + 0.5) * uResolution;
  vec2 d = pe - ps;
  float len = length(d);
  vec2 dir = len > 1e-5 ? d / len : vec2(1.0, 0.0);
  vec2 nrm = vec2(-dir.y, dir.x);
  float ext = 0.5 * uWidth * uPixelRatio + 1.0;
  float endF = position.y;
  float side = position.x;
  vec2 p = mix(ps, pe, endF) + dir * (ext * (endF * 2.0 - 1.0)) + nrm * (ext * side);
  float w = mix(cs.w, ce.w, endF);

  gl_Position = vec4((p / uResolution * 2.0 - 1.0) * w, 0.0, w);
  vPx = vec3(mix(-ext, len + ext, endF) * w, side * ext * w, w);
  vLen = len;
  vMeta = vec4(su.x, eu.x, su.y, eu.y);
  vInfo = vec3(cs.w, ce.w, aMetaStart.z);
  vViewS = s.xyz;
  vViewE = e.xyz;
}
`

const FRAGMENT = /* glsl */ `
uniform vec4 uFront;
uniform vec4 uBack;
uniform vec4 uNode;
uniform float uEmphasis;
uniform float uOpacity;
uniform float uWidth;
uniform float uPixelRatio;
uniform vec2 uFade; // near distance, 1 / (far - near)
uniform float uReveal;
uniform vec2 uStagger; // amount, 1 / (polylines - 1)
uniform vec4 uOccluder; // view-space centre, radius
uniform float uOcclusion;
#ifdef USE_DASH
uniform vec3 uDash; // periods per unit of u, periods per unit of distance, dash share of a period
#endif

varying vec3 vPx;
flat varying float vLen;
flat varying vec4 vMeta;
flat varying vec3 vInfo;
flat varying vec3 vViewS;
flat varying vec3 vViewE;

void main() {
  float along = vPx.x / vPx.z;
  float across = vPx.y / vPx.z;

  // Closest point on the segment, in pixels, then coverage of a stroke of this width.
  float ts = clamp(along / max(vLen, 1e-5), 0.0, 1.0);
  float hw = 0.5 * uWidth * uPixelRatio;
  float cov = clamp(hw + 0.5 - length(vec2(along - ts * vLen, across)), 0.0, min(1.0, 2.0 * hw));

  // The same point in view space (perspective-correct parameter from the two end depths).
  float tp = ts * vInfo.x / mix(vInfo.y, vInfo.x, ts);
  vec3 P = mix(vViewS, vViewE, tp);
  float u = mix(vMeta.x, vMeta.y, tp);

  float fade = clamp((-P.z - uFade.x) * uFade.y, 0.0, 1.0);
  vec4 col = mix(mix(uFront, uBack, fade), uNode, uEmphasis);
  float a = col.a * cov * uOpacity;

  // Sphere occluder: hidden where the eye ray passes within the sphere's radius of its centre and this point
  // lies beyond that closest approach. Comparing against the closest approach (not the entry point) keeps a
  // globe's own near-side lines solid even where their straight facets dip a hair inside the sphere.
  vec3 C = uOccluder.xyz;
  float Pl = length(P);
  float b = dot(P / Pl, C);
  float h = sqrt(max(dot(C, C) - b * b, 0.0));
  float inside = clamp((uOccluder.w - h) / max(fwidth(h), 1e-6) + 1.0, 0.0, 1.0);
  a *= 1.0 - uOcclusion * inside * step(b, Pl);

  // Reveal: each polyline draws on from its start; later polylines may start later (stagger).
  float local = clamp(uReveal * (1.0 + uStagger.x) - uStagger.x * vInfo.z * uStagger.y, 0.0, 1.0);
  float drawn = clamp((local - u) / max(fwidth(u), 1e-6), 0.0, 1.0);
  a *= uReveal >= 1.0 ? 1.0 : drawn;

#ifdef USE_DASH
  float x = u * uDash.x + mix(vMeta.z, vMeta.w, tp) * uDash.y;
  float m = abs(fract(x + 0.5 * (1.0 - uDash.z)) - 0.5);
  a *= clamp((0.5 * uDash.z - m) / max(fwidth(x), 1e-6) + 0.5, 0.0, 1.0);
#endif

  if (a < 0.002) discard;
  gl_FragColor = vec4(col.rgb * a, a);
}
`

/** A shape, or a figure from `toFigure` (rows x points, ready to morph). */
export type LineSource = Polyline[] | { figure: Float32Array; rows: number; points: number }

/** `[dash, gap]` in CSS pixels (measured at the object's origin), or a fixed number of dashes per polyline. */
export type LineDash = [number, number] | { count: number; ratio?: number }

export interface WireLinesOptions {
  /** Stroke width in CSS pixels. Default 1. */
  width?: number
  /** Overall opacity multiplier, 0..1. Default 1. */
  opacity?: number
  /** 0..1: how much of each polyline is drawn, from its start. Default 1. */
  reveal?: number
  /** 0..1: how much later the last polyline starts drawing than the first. Default 0. */
  revealStagger?: number
  /** 0..1: blend toward the node color and 1.25x width (the "now" state). Default 0. */
  emphasis?: number
  /** Dashes. Closed rings look best with `{ count }`, which always closes cleanly. Default none. */
  dash?: LineDash | null
  /**
   * Depth fade between the front and back tokens. 'auto' (default) spans the object's own depth, so its nearest
   * point is front and its farthest is back. `[near, far]` are distances from the camera in world units: use one
   * range for several objects that should share a depth cue. false draws everything at the front color.
   */
  fade?: 'auto' | [number, number] | false
  /** A sphere that hides these lines where they pass behind it. Default none. */
  occluder?: Occluder | null
  /** 0..1: how strongly the occluder hides. 1 hides, 0.75 leaves a quarter showing through. Default 1. */
  occlusion?: number
  /** Add to this object instead of the scene root. */
  parent?: Object3D
  /** Draw order among transparent objects. Default 0 (nodes default to 10 and sit on top). */
  renderOrder?: number
}

const _center = new Vector3()

export class WireLines extends Mesh<InstancedBufferGeometry, ShaderMaterial> {
  /** xyz per point, in object space. Write into it and call `commit()`, or use `setPositions()`. */
  readonly positions: Float32Array
  readonly pointCount: number
  readonly lineCount: number

  /** Stroke width in CSS pixels. */
  width: number
  /** 0..1 multiplier. */
  opacity: number
  /** 0..1: draw-on fraction. */
  reveal: number
  revealStagger: number
  /** 0..1: toward the node color and 1.25x width. */
  emphasis: number
  fade: 'auto' | [number, number] | false
  occluder: Occluder | null
  occlusion: number

  private readonly shared: StageShared
  private readonly buffer: InstancedInterleavedBuffer
  private readonly dashSpec: LineDash | null
  private readonly boundCenter = new Vector3()
  private boundRadius = 1

  constructor(shared: StageShared, source: LineSource, options: WireLinesOptions = {}) {
    const built = buildBuffers(source)
    const geometry = new InstancedBufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(new Float32Array([-1, 0, 0, 1, 0, 0, -1, 1, 0, 1, 1, 0]), 3))
    geometry.setIndex([0, 1, 2, 2, 1, 3])
    const buffer = new InstancedInterleavedBuffer(built.positions, 3, 1)
    buffer.setUsage('figure' in source ? DynamicDrawUsage : StaticDrawUsage)
    geometry.setAttribute('aStart', new InterleavedBufferAttribute(buffer, 3, 0))
    geometry.setAttribute('aEnd', new InterleavedBufferAttribute(buffer, 3, 3))
    const meta = new InstancedInterleavedBuffer(built.meta, 3, 1)
    geometry.setAttribute('aMetaStart', new InterleavedBufferAttribute(meta, 3, 0))
    geometry.setAttribute('aMetaEnd', new InterleavedBufferAttribute(meta, 3, 3))
    // Segment i runs from point i to point i + 1, so there is one instance fewer than points.
    geometry.instanceCount = Math.max(built.pointCount - 1, 0)

    const dash = options.dash ?? null
    const material = new ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: {
        uResolution: shared.uResolution,
        uPixelRatio: shared.uPixelRatio,
        uNear: shared.uNear,
        uFront: shared.uFront,
        uBack: shared.uBack,
        uNode: shared.uNode,
        uWidth: { value: 1 },
        uEmphasis: { value: 0 },
        uOpacity: { value: 1 },
        uFade: { value: new Vector2(0, 0) },
        uReveal: { value: 1 },
        uStagger: { value: new Vector2(0, 1 / Math.max(built.lineCount - 1, 1)) },
        uOccluder: { value: new Vector4(0, 0, 0, 0) },
        uOcclusion: { value: 0 },
        uDash: { value: new Vector3(0, 0, 1) },
      },
      defines: dash ? { USE_DASH: '' } : {},
      // Quads face either way depending on a segment's direction on screen, so nothing may be culled.
      side: DoubleSide,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: CustomBlending,
      blendEquation: MaxEquation,
      blendSrc: OneFactor,
      blendDst: OneFactor,
    })

    super(geometry, material)
    this.shared = shared
    this.buffer = buffer
    this.positions = built.positions
    this.pointCount = built.pointCount
    this.lineCount = built.lineCount
    this.dashSpec = dash
    this.width = options.width ?? 1
    this.opacity = options.opacity ?? 1
    this.reveal = options.reveal ?? 1
    this.revealStagger = options.revealStagger ?? 0
    this.emphasis = options.emphasis ?? 0
    this.fade = options.fade ?? 'auto'
    this.occluder = options.occluder ?? null
    this.occlusion = options.occlusion ?? 1
    this.renderOrder = options.renderOrder ?? 0
    this.frustumCulled = false
    this.matrixAutoUpdate = true
    if (geometry.instanceCount === 0) this.visible = false
    this.computeBounds()
  }

  /** Copy new point positions in (same length as `positions`) and upload them. No reallocation. */
  setPositions(data: ArrayLike<number>): void {
    this.positions.set(data)
    this.buffer.needsUpdate = true
  }

  /** Upload `positions` after writing into it directly (for example with lerpFigure). */
  commit(): void {
    this.buffer.needsUpdate = true
  }

  /** Recompute the bounding sphere used by `fade: 'auto'`. Only needed if a morph changes the overall size. */
  computeBounds(): void {
    const p = this.positions
    let minX = Infinity
    let minY = Infinity
    let minZ = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    let maxZ = -Infinity
    for (let i = 0; i < p.length; i += 3) {
      const x = p[i]!
      const y = p[i + 1]!
      const z = p[i + 2]!
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
      if (z < minZ) minZ = z
      if (z > maxZ) maxZ = z
    }
    if (p.length === 0) {
      this.boundCenter.set(0, 0, 0)
      this.boundRadius = 1
      return
    }
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2
    const cz = (minZ + maxZ) / 2
    let r2 = 0
    for (let i = 0; i < p.length; i += 3) {
      const dx = p[i]! - cx
      const dy = p[i + 1]! - cy
      const dz = p[i + 2]! - cz
      const d2 = dx * dx + dy * dy + dz * dz
      if (d2 > r2) r2 = d2
    }
    this.boundCenter.set(cx, cy, cz)
    this.boundRadius = Math.max(Math.sqrt(r2), 1e-6)
  }

  override onBeforeRender(_renderer: unknown, _scene: unknown, camera: Camera): void {
    const u = this.material.uniforms
    const emphasis = this.emphasis < 0 ? 0 : this.emphasis > 1 ? 1 : this.emphasis
    u.uWidth!.value = this.width * (1 + 0.25 * emphasis)
    u.uEmphasis!.value = emphasis
    u.uOpacity!.value = this.opacity
    u.uReveal!.value = this.reveal
    ;(u.uStagger!.value as Vector2).x = this.revealStagger

    // Depth of the object's own centre, for the automatic fade range and for pixel-sized dashes.
    _center.copy(this.boundCenter).applyMatrix4(this.matrixWorld).applyMatrix4(camera.matrixWorldInverse)
    const depth = -_center.z
    const scale = this.matrixWorld.getMaxScaleOnAxis()

    const fade = u.uFade!.value as Vector2
    if (this.fade === false) {
      fade.set(0, 0)
    } else if (this.fade === 'auto') {
      const r = this.boundRadius * scale
      fade.set(depth - r, 1 / (2 * r))
    } else {
      fade.set(this.fade[0], 1 / Math.max(this.fade[1] - this.fade[0], 1e-6))
    }

    const occ = u.uOccluder!.value as Vector4
    if (this.occluder && this.occlusion > 0) {
      _center.copy(this.occluder.center).applyMatrix4(camera.matrixWorldInverse)
      occ.set(_center.x, _center.y, _center.z, this.occluder.radius)
      u.uOcclusion!.value = this.occlusion
    } else {
      occ.set(0, 0, 0, 0)
      u.uOcclusion!.value = 0
    }

    const dash = this.dashSpec
    if (dash) {
      const d = u.uDash!.value as Vector3
      if (Array.isArray(dash)) {
        const period = Math.max(dash[0] + dash[1], 0.5)
        const pxPerUnit = scale / (this.shared.uPxScale.value * Math.max(depth, this.shared.uNear.value))
        d.set(0, pxPerUnit / (period * this.shared.uPixelRatio.value), dash[0] / period)
      } else {
        d.set(Math.max(1, Math.round(dash.count)), 0, dash.ratio ?? 0.5)
      }
    }
  }

  /** No picking on lines: scenes hit-test nodes and labels instead. */
  override raycast(): void {}

  dispose(): void {
    this.geometry.dispose()
    this.material.dispose()
  }
}

function buildBuffers(source: LineSource): { positions: Float32Array; meta: Float32Array; pointCount: number; lineCount: number } {
  if ('figure' in source) {
    const rows = Math.max(1, Math.round(source.rows))
    const points = Math.max(2, Math.round(source.points))
    const count = rows * points
    const positions = new Float32Array(count * 3)
    positions.set(source.figure.subarray(0, count * 3))
    const meta = new Float32Array(count * 3)
    for (let r = 0; r < rows; r++) {
      let length = 0
      for (let i = 0; i < points; i++) {
        const o = (r * points + i) * 3
        if (i > 0) {
          length += Math.hypot(positions[o]! - positions[o - 3]!, positions[o + 1]! - positions[o - 2]!, positions[o + 2]! - positions[o - 1]!)
        }
        meta[o] = i / (points - 1)
        meta[o + 1] = length
        meta[o + 2] = r
      }
    }
    return { positions, meta, pointCount: count, lineCount: rows }
  }

  const lines = source.filter((p) => p.length >= 2)
  let count = 0
  for (const p of lines) count += p.length
  const positions = new Float32Array(count * 3)
  const meta = new Float32Array(count * 3)
  let o = 0
  lines.forEach((p, index) => {
    const start = o
    let length = 0
    for (let i = 0; i < p.length; i++) {
      const v = p[i]!
      if (i > 0) {
        const q = p[i - 1]!
        length += Math.hypot(v[0] - q[0], v[1] - q[1], v[2] - q[2])
      }
      positions[o] = v[0]
      positions[o + 1] = v[1]
      positions[o + 2] = v[2]
      meta[o + 1] = length
      meta[o + 2] = index
      o += 3
    }
    // u is the share of the polyline's length, so the reveal draws at an even speed.
    for (let i = 0; i < p.length; i++) {
      const k = start + i * 3
      meta[k] = length > 0 ? meta[k + 1]! / length : i / (p.length - 1)
    }
  })
  return { positions, meta, pointCount: count, lineCount: lines.length }
}
