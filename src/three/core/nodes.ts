import {
  AddEquation,
  BufferAttribute,
  CustomBlending,
  DoubleSide,
  DynamicDrawUsage,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  MaxEquation,
  Mesh,
  OneFactor,
  OneMinusSrcAlphaFactor,
  ShaderMaterial,
  Vector2,
  Vector3,
  Vector4,
  ZeroFactor,
} from 'three'
import type { Camera, Object3D } from 'three'
import { eyeOf } from './occluder'
import type { Occluder, StageShared } from './occluder'
import type { Vec3, XYZ } from './shapes'
import type { ScreenPoint, StageContext } from './types'

/*
 * WireNodes: small markers that sit at 3D points but are sized in CSS pixels, like the dots riding the
 * reference site's wireframes. Three kinds: a filled dot, a ring, a dashed ring. Each marker first clears a
 * small disc of whatever lines run beneath it (a halo), then draws its own stroke, so a ring over a dense
 * lattice still reads as a clean ring. Edges are analytic, so markers are crisp at any DPR without MSAA.
 */

const VERTEX = /* glsl */ `
attribute vec3 aCenter;
attribute vec4 aParams; // radius in CSS px, kind (0 dot, 1 ring, 2 dashed ring), opacity, emphasis

uniform vec2 uResolution;
uniform float uPixelRatio;
uniform float uNear;
uniform float uPxScale;
uniform float uStroke;
uniform float uGrow;
uniform float uHalo;
uniform vec4 uOccluder;
uniform float uOcclusion;
uniform vec3 uFade; // near distance, 1 / (far - near), opacity at the far end

varying vec2 vPx;
flat varying vec4 vShape; // radius, half stroke (canvas px), kind, alpha
flat varying float vOuter;

void main() {
  vec4 mv = modelViewMatrix * vec4(aCenter, 1.0);
  float e = aParams.w;
  float kind = aParams.y;
  float r = (aParams.x + uGrow * e) * uPixelRatio;
  float hs = 0.5 * uStroke * (1.0 + 0.25 * e) * uPixelRatio;
  float outer = (kind < 0.5 ? r : r + hs) + uHalo * uPixelRatio;
  float ext = outer + 1.0;
  float alpha = aParams.z;

  // Occlusion at the marker's centre. The edge is as wide as the marker, so it fades as it crosses the limb.
  vec3 P = mv.xyz;
  float Pl = max(length(P), 1e-6);
  vec3 C = uOccluder.xyz;
  float b = dot(P / Pl, C);
  float h = sqrt(max(dot(C, C) - b * b, 0.0));
  float soft = max(uPxScale * abs(b) * ext * 2.0, 1e-6);
  float inside = clamp((uOccluder.w - h) / soft + 0.5, 0.0, 1.0);
  alpha *= 1.0 - uOcclusion * inside * step(b, Pl);
  alpha *= mix(1.0, uFade.z, clamp((-P.z - uFade.x) * uFade.y, 0.0, 1.0));

  vec4 clip = projectionMatrix * mv;
  if (mv.z > -uNear || alpha < 0.002) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    vPx = vec2(0.0);
    vShape = vec4(0.0);
    vOuter = 0.0;
    return;
  }
  vec2 centre = (clip.xy / clip.w * 0.5 + 0.5) * uResolution;
  vec2 p = centre + position.xy * ext;
  gl_Position = vec4((p / uResolution * 2.0 - 1.0) * clip.w, 0.0, clip.w);
  vPx = position.xy * ext;
  vShape = vec4(r, hs, kind, alpha);
  vOuter = outer;
}
`

const FRAGMENT = /* glsl */ `
uniform vec4 uColor;
uniform vec2 uRingDash; // dashes around a dashed ring, dash share of a period

varying vec2 vPx;
flat varying vec4 vShape;
flat varying float vOuter;

void main() {
  float d = length(vPx);
#ifdef KNOCKOUT
  float k = clamp(vOuter + 0.5 - d, 0.0, 1.0) * vShape.w;
  if (k < 0.002) discard;
  gl_FragColor = vec4(0.0, 0.0, 0.0, k);
#else
  float r = vShape.x;
  float hs = vShape.y;
  float cov;
  if (vShape.z < 0.5) {
    cov = clamp(r + 0.5 - d, 0.0, 1.0);
  } else {
    cov = clamp(hs + 0.5 - abs(d - r), 0.0, min(1.0, 2.0 * hs));
    if (vShape.z > 1.5) {
      float x = atan(vPx.y, vPx.x) / 6.28318530718 * uRingDash.x;
      float m = abs(fract(x) - 0.5);
      float fw = uRingDash.x / (6.28318530718 * max(d, 1.0));
      cov *= clamp((0.5 * uRingDash.y - m) / fw + 0.5, 0.0, 1.0);
    }
  }
  float a = uColor.a * cov * vShape.w;
  if (a < 0.002) discard;
  gl_FragColor = vec4(uColor.rgb * a, a);
#endif
}
`

export type NodeKind = 'dot' | 'ring' | 'dashedRing'

export interface NodeSpec {
  /** Position in the object's own space. */
  position: Vec3 | XYZ
  /** Default 'dot'. */
  kind?: NodeKind
  /** Radius in CSS pixels. Default 2.5 for a dot, 5 for a ring, 5.5 for a dashed ring. */
  radius?: number
  /** 0..1. Default 1. */
  opacity?: number
  /** 0..1: grows the marker and thickens its stroke. Default 0. */
  emphasis?: number
}

export interface WireNodesOptions {
  /** Ring stroke width in CSS pixels. Default 1. */
  stroke?: number
  /** CSS pixels added to the radius at full emphasis. Default 3. */
  grow?: number
  /** Clear the lines under each marker. Default true. */
  knockout?: boolean
  /** Width of the cleared margin around each marker in CSS pixels. Default 2. */
  halo?: number
  /** Dashes around a dashed ring. Default 8. */
  dashes?: number
  /** Share of each dash period that is drawn, 0..1. Default 0.55. */
  dashRatio?: number
  /** Which token colors the markers: 'node' (default, the brightest) or 'front' (same as near lines). */
  color?: 'node' | 'front'
  /**
   * Whether markers are tested against a sphere (the equivalent of depth testing here, see occluder.ts).
   * Give the occluder to hide markers behind it; leave it out to draw them always. Default none.
   */
  occluder?: Occluder | null
  /** 0..1: how strongly the occluder hides. Default 1. */
  occlusion?: number
  /** Dim with distance: `[near, far]` in world units from the camera. Default off. */
  fade?: [number, number] | false
  /** Opacity multiplier at the far end of `fade`. Default 0.4. */
  fadeTo?: number
  /** Add to this object instead of the scene root. */
  parent?: Object3D
  /** Draw order. Default 10 (above lines). The clearing pass uses this value, the strokes the next one. */
  renderOrder?: number
}

const KIND_INDEX: Record<NodeKind, number> = { dot: 0, ring: 1, dashedRing: 2 }
const DEFAULT_RADIUS: Record<NodeKind, number> = { dot: 2.5, ring: 5, dashedRing: 5.5 }

const _world = new Vector3()
const _view = new Vector3()
const _screen: ScreenPoint = { x: 0, y: 0, depth: 0, visible: false }

function isXYZ(p: Vec3 | XYZ): p is XYZ {
  return !Array.isArray(p)
}

export class WireNodes extends Mesh<InstancedBufferGeometry, ShaderMaterial> {
  readonly count: number
  occluder: Occluder | null
  occlusion: number
  fade: [number, number] | false
  fadeTo: number

  private readonly centers: Float32Array
  private readonly params: Float32Array
  private readonly centerAttr: InstancedBufferAttribute
  private readonly paramAttr: InstancedBufferAttribute
  private readonly knock: Mesh<InstancedBufferGeometry, ShaderMaterial> | null
  private readonly grow: number

  constructor(shared: StageShared, specs: NodeSpec[], options: WireNodesOptions = {}) {
    const count = specs.length
    const centers = new Float32Array(count * 3)
    const params = new Float32Array(count * 4)
    specs.forEach((spec, i) => {
      const p = spec.position
      centers[i * 3] = isXYZ(p) ? p.x : p[0]
      centers[i * 3 + 1] = isXYZ(p) ? p.y : p[1]
      centers[i * 3 + 2] = isXYZ(p) ? p.z : p[2]
      const kind = spec.kind ?? 'dot'
      params[i * 4] = spec.radius ?? DEFAULT_RADIUS[kind]
      params[i * 4 + 1] = KIND_INDEX[kind]
      params[i * 4 + 2] = spec.opacity ?? 1
      params[i * 4 + 3] = spec.emphasis ?? 0
    })

    const geometry = new InstancedBufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0]), 3))
    geometry.setIndex([0, 1, 2, 2, 1, 3])
    const centerAttr = new InstancedBufferAttribute(centers, 3)
    centerAttr.setUsage(DynamicDrawUsage)
    const paramAttr = new InstancedBufferAttribute(params, 4)
    paramAttr.setUsage(DynamicDrawUsage)
    geometry.setAttribute('aCenter', centerAttr)
    geometry.setAttribute('aParams', paramAttr)
    geometry.instanceCount = count

    const grow = options.grow ?? 3
    const uniforms = {
      uResolution: shared.uResolution,
      uPixelRatio: shared.uPixelRatio,
      uNear: shared.uNear,
      uPxScale: shared.uPxScale,
      uColor: options.color === 'front' ? shared.uFront : shared.uNode,
      uStroke: { value: options.stroke ?? 1 },
      uGrow: { value: grow },
      uHalo: { value: options.knockout === false ? 0 : (options.halo ?? 2) },
      uRingDash: { value: new Vector2(Math.max(2, Math.round(options.dashes ?? 8)), options.dashRatio ?? 0.55) },
      uOccluder: { value: new Vector4(0, 0, 0, 0) },
      uOcclusion: { value: 0 },
      uFade: { value: new Vector3(0, 0, 1) },
    }
    const material = new ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms,
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
    this.count = count
    this.centers = centers
    this.params = params
    this.centerAttr = centerAttr
    this.paramAttr = paramAttr
    this.grow = grow
    this.occluder = options.occluder ?? null
    this.occlusion = options.occlusion ?? 1
    this.fade = options.fade ?? false
    this.fadeTo = options.fadeTo ?? 0.4
    this.frustumCulled = false
    this.renderOrder = (options.renderOrder ?? 10) + 1

    if (options.knockout === false) {
      this.knock = null
    } else {
      // Same geometry and uniforms; this pass only erases (destination * (1 - alpha)).
      const knockMaterial = new ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        uniforms,
        defines: { KNOCKOUT: '' },
        side: DoubleSide,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: CustomBlending,
        blendEquation: AddEquation,
        blendSrc: ZeroFactor,
        blendDst: OneMinusSrcAlphaFactor,
        blendSrcAlpha: ZeroFactor,
        blendDstAlpha: OneMinusSrcAlphaFactor,
      })
      const knock = new Mesh(geometry, knockMaterial)
      knock.frustumCulled = false
      knock.renderOrder = options.renderOrder ?? 10
      knock.raycast = () => {}
      // It draws first, so it is the one that must refresh the shared uniforms.
      knock.onBeforeRender = (_renderer, _scene, camera) => this.sync(camera)
      this.add(knock)
      this.knock = knock
    }
    if (count === 0) this.visible = false
  }

  /** Move a marker (object space). */
  setPosition(index: number, x: number, y: number, z: number): void {
    const o = index * 3
    this.centers[o] = x
    this.centers[o + 1] = y
    this.centers[o + 2] = z
    this.centerAttr.needsUpdate = true
  }

  /** Read a marker's position (object space) into `out`. */
  getPosition<T extends XYZ>(index: number, out: T): T {
    const o = index * 3
    out.x = this.centers[o] ?? 0
    out.y = this.centers[o + 1] ?? 0
    out.z = this.centers[o + 2] ?? 0
    return out
  }

  /** Read a marker's world position into `out`. */
  getWorld(index: number, out: Vector3): Vector3 {
    return this.getPosition(index, out).applyMatrix4(this.matrixWorld)
  }

  setKind(index: number, kind: NodeKind): void {
    this.params[index * 4 + 1] = KIND_INDEX[kind]
    this.paramAttr.needsUpdate = true
  }

  /** Radius in CSS pixels. */
  setRadius(index: number, radius: number): void {
    this.params[index * 4] = radius
    this.paramAttr.needsUpdate = true
  }

  /** 0..1. Use it to dim the markers that are not in focus. */
  setOpacity(index: number, opacity: number): void {
    const o = index * 4 + 2
    if (this.params[o] === opacity) return
    this.params[o] = opacity
    this.paramAttr.needsUpdate = true
  }

  /** 0..1. Grows the marker by `grow` pixels and thickens its stroke by a quarter. */
  setEmphasis(index: number, emphasis: number): void {
    const o = index * 4 + 3
    if (this.params[o] === emphasis) return
    this.params[o] = emphasis
    this.paramAttr.needsUpdate = true
  }

  getOpacity(index: number): number {
    return this.params[index * 4 + 2] ?? 0
  }

  getEmphasis(index: number): number {
    return this.params[index * 4 + 3] ?? 0
  }

  /** Current radius in CSS pixels including emphasis growth. */
  getRadius(index: number): number {
    return (this.params[index * 4] ?? 0) + this.grow * (this.params[index * 4 + 3] ?? 0)
  }

  /**
   * How visible a marker is to the camera right now, 0..1 (1 minus the occluder's effect).
   * Labels and picking use this, so they agree with what the shader draws.
   */
  visibility(index: number, ctx: StageContext): number {
    if (!this.occluder || this.occlusion <= 0) return 1
    this.getWorld(index, _world)
    const eye = eyeOf(ctx.camera)
    _view.subVectors(_world, eye)
    const soft = ctx.worldPerPx(_view.length()) * (this.getRadius(index) + 3) * 2
    return 1 - this.occlusion * this.occluder.occlusion(_world, eye, soft)
  }

  /**
   * The marker under a point in stage CSS pixels, or -1. `slop` widens every marker's target (default 8,
   * so a 2.5px dot is still easy to hit). Markers hidden behind the occluder cannot be picked.
   */
  pick(ctx: StageContext, x: number, y: number, slop = 8): number {
    let best = -1
    let bestD = Infinity
    for (let i = 0; i < this.count; i++) {
      if ((this.params[i * 4 + 2] ?? 0) <= 0.02) continue
      ctx.project(this.getWorld(i, _world), _screen)
      if (!_screen.visible) continue
      const d = Math.hypot(_screen.x - x, _screen.y - y)
      if (d > this.getRadius(i) + slop || d >= bestD) continue
      if (this.visibility(i, ctx) < 0.35) continue
      best = i
      bestD = d
    }
    return best
  }

  override onBeforeRender(_renderer: unknown, _scene: unknown, camera: Camera): void {
    this.sync(camera)
  }

  private sync(camera: Camera): void {
    const u = this.material.uniforms
    const occ = u.uOccluder!.value as Vector4
    if (this.occluder && this.occlusion > 0) {
      _view.copy(this.occluder.center).applyMatrix4(camera.matrixWorldInverse)
      occ.set(_view.x, _view.y, _view.z, this.occluder.radius)
      u.uOcclusion!.value = this.occlusion
    } else {
      occ.set(0, 0, 0, 0)
      u.uOcclusion!.value = 0
    }
    const fade = u.uFade!.value as Vector3
    if (this.fade === false) fade.set(0, 0, 1)
    else fade.set(this.fade[0], 1 / Math.max(this.fade[1] - this.fade[0], 1e-6), this.fadeTo)
  }

  override raycast(): void {}

  dispose(): void {
    this.geometry.dispose()
    this.material.dispose()
    this.knock?.material.dispose()
  }
}
