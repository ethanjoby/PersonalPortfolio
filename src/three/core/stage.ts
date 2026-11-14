import { Group, PerspectiveCamera, Scene, Vector2, Vector3, Vector4, WebGLRenderer } from 'three'
import type { Object3D } from 'three'
import { isMotionPaused, prefersReducedMotion, setMotionPaused, subscribeMotionPaused, subscribeReducedMotion } from '../motion'
import { damp } from './anim'
import { parseCssColor } from './colors'
import type { RGBA } from './colors'
import { LabelLayer } from './labels'
import { WireLines } from './lines'
import type { LineSource, WireLinesOptions } from './lines'
import { WireNodes } from './nodes'
import type { NodeSpec, WireNodesOptions } from './nodes'
import { Occluder } from './occluder'
import type { StageShared } from './occluder'
import type {
  EngineStats,
  HitId,
  ScreenPoint,
  StageColors,
  StageContext,
  StageDrag,
  StageHandle,
  StageMode,
  StageOptions,
  StagePointer,
  StageSize,
  StageState,
  StageStats,
  StageTone,
  WireScene,
} from './types'

/*
 * The stage: one scene in one container.
 *
 * WebGL contexts. A page never holds more than two:
 *   - "live": one renderer on its own visible canvas, for the single continuously moving scene (the hero).
 *   - "shared": one renderer on a canvas that is never in the document. Every on-demand stage renders through
 *     it into a corner of that canvas and copies the pixels into its own 2D canvas, so any number of still
 *     figures cost one context. A second live stage also falls back to this renderer.
 *
 * Frames. One requestAnimationFrame loop serves every stage and stops itself the moment no stage needs a
 * frame. A stage needs one when it is on screen, the tab is visible, and it is either dirty, still animating,
 * or live with motion allowed (not paused, not reduced).
 */

export { isMotionPaused, setMotionPaused, subscribeMotionPaused }

/* ------------------------------------------------------------------ renderers */

type SlotKind = 'live' | 'shared'

interface Slot {
  kind: SlotKind
  renderer: WebGLRenderer
  canvas: HTMLCanvasElement
  users: number
  lost: boolean
  /** Drawing buffer size of the shared canvas. */
  width: number
  height: number
  disposeDebounce: number
  onLost: () => void
  onRestored: () => void
}

const slots: Record<SlotKind, Slot | null> = { live: null, shared: null }
let webglDisabled = false
/** How long an unused renderer is kept so a quick remount (React StrictMode, fast refresh) reuses it. */
const KEEP_ALIVE_MS = 1200

function createSlot(kind: SlotKind): Slot | null {
  if (webglDisabled) return null
  const canvas = document.createElement('canvas')
  // Create the context ourselves first: if WebGL is unavailable we leave quietly, with nothing logged.
  let gl: WebGL2RenderingContext | null = null
  try {
    gl = canvas.getContext('webgl2', {
      alpha: true,
      // Solid, lit objects need a depth buffer and multisampled edges; the hairline materials ignore depth and are unaffected.
      antialias: true,
      depth: true,
      stencil: false,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
      powerPreference: 'default',
    })
  } catch {
    gl = null
  }
  if (!gl) return null
  let renderer: WebGLRenderer
  try {
    renderer = new WebGLRenderer({ canvas, context: gl, alpha: true, antialias: true, depth: true, stencil: false, premultipliedAlpha: true })
  } catch {
    return null
  }
  renderer.setPixelRatio(1)
  renderer.setClearColor(0x000000, 0)
  const slot: Slot = {
    kind,
    renderer,
    canvas,
    users: 0,
    lost: false,
    width: 0,
    height: 0,
    disposeDebounce: 0,
    onLost: () => {
      slot.lost = true
    },
    onRestored: () => {
      slot.lost = false
      for (const stage of stages) if (stage.slot === slot) stage.invalidate()
    },
  }
  // three registers its own handlers first (it prevents default on loss and rebuilds its state on restore).
  canvas.addEventListener('webglcontextlost', slot.onLost)
  canvas.addEventListener('webglcontextrestored', slot.onRestored)
  if (kind === 'live') {
    canvas.className = 'stageview-canvas'
    canvas.setAttribute('aria-hidden', 'true')
  }
  return slot
}

function acquireSlot(kind: SlotKind): Slot | null {
  let slot = slots[kind]
  if (slot) {
    if (slot.disposeDebounce) {
      clearTimeout(slot.disposeDebounce)
      slot.disposeDebounce = 0
    }
  } else {
    slot = createSlot(kind)
    if (!slot) return null
    slots[kind] = slot
  }
  slot.users += 1
  return slot
}

function releaseSlot(slot: Slot): void {
  slot.users -= 1
  if (slot.users > 0 || slot.disposeDebounce) return
  // Debounced disposal: the renderer is freed once nothing has asked for it for a moment.
  slot.disposeDebounce = window.setTimeout(disposeSlot, KEEP_ALIVE_MS, slot) // debounce, not animation
}

function disposeSlot(slot: Slot): void {
  slot.disposeDebounce = 0
  if (slot.users > 0 || slots[slot.kind] !== slot) return
  slots[slot.kind] = null
  slot.canvas.removeEventListener('webglcontextlost', slot.onLost)
  slot.canvas.removeEventListener('webglcontextrestored', slot.onRestored)
  slot.renderer.dispose()
  slot.renderer.forceContextLoss()
  slot.canvas.remove()
  slot.canvas.width = 1
  slot.canvas.height = 1
  notifyStats()
}

/* ------------------------------------------------------------------ shared loop */

const stages: Stage[] = []
let rafId = 0
let ticking = false
let lastTickAt = 0
let tickIndex = 0

const stats: EngineStats = { contexts: 0, stages: 0, ticking: false, fps: 0, scriptMs: 0, scriptMsMax: 0, renders: 0 }
const statsListeners = new Set<(s: EngineStats) => void>()
let statsNotifiedAt = 0
let maxWindowStart = 0
let maxInWindow = 0

function requestTick(): void {
  if (ticking) return
  for (let i = 0; i < stages.length; i++) {
    if (stages[i]!.needsFrame()) {
      ticking = true
      lastTickAt = 0
      rafId = requestAnimationFrame(tick)
      notifyStats()
      return
    }
  }
}

function tick(): void {
  const start = performance.now()
  tickIndex += 1
  let again = false
  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i]
    if (!stage) break
    if (stage.needsFrame()) stage.draw(start, false)
  }
  for (let i = 0; i < stages.length; i++) {
    if (stages[i]!.needsFrame()) {
      again = true
      break
    }
  }
  const end = performance.now()

  // Statistics for the lab readout. Plain numbers, no allocation.
  const ms = end - start
  stats.scriptMs = stats.scriptMs === 0 ? ms : stats.scriptMs + (ms - stats.scriptMs) * 0.1
  if (start - maxWindowStart > 1000) {
    stats.scriptMsMax = maxInWindow
    maxInWindow = 0
    maxWindowStart = start
  }
  if (ms > maxInWindow) maxInWindow = ms
  if (lastTickAt > 0 && start > lastTickAt) {
    const fps = 1000 / (start - lastTickAt)
    stats.fps = stats.fps === 0 ? fps : stats.fps + (fps - stats.fps) * 0.1
  }
  lastTickAt = start

  if (again) {
    rafId = requestAnimationFrame(tick)
    if (end - statsNotifiedAt > 250) notifyStats()
  } else {
    ticking = false
    stats.fps = 0
    notifyStats()
  }
}

function notifyStats(): void {
  stats.contexts = (slots.live ? 1 : 0) + (slots.shared ? 1 : 0)
  stats.stages = stages.length
  stats.ticking = ticking
  statsNotifiedAt = typeof performance !== 'undefined' ? performance.now() : 0
  for (const fn of statsListeners) fn(stats)
}

/** A live snapshot of the engine counters (the same object every call; read it, do not keep it). */
export function getEngineStats(): EngineStats {
  stats.contexts = (slots.live ? 1 : 0) + (slots.shared ? 1 : 0)
  stats.stages = stages.length
  stats.ticking = ticking
  return stats
}

/** Be told when the counters change: at most four times a second while frames run, and once when they stop. */
export function subscribeEngineStats(fn: (s: EngineStats) => void): () => void {
  statsListeners.add(fn)
  return () => {
    statsListeners.delete(fn)
  }
}

/** Test hook for the lab: make every later createStage behave as if WebGL were unavailable. */
export function setWebGLDisabledForTest(value: boolean): void {
  webglDisabled = value
}

/** Test hook for the lab: lose and (after `restoreAfterMs`) restore both WebGL contexts. */
export function simulateContextLoss(restoreAfterMs = 600): void {
  for (const kind of ['live', 'shared'] as const) {
    const slot = slots[kind]
    if (!slot) continue
    slot.renderer.forceContextLoss()
    window.setTimeout(() => slot.renderer.forceContextRestore(), restoreAfterMs) // retry timeout for the test hook
  }
}

/* ------------------------------------------------------------------ page-level listeners */

let globalsInstalled = false
let stopPause: (() => void) | null = null
let stopReduced: (() => void) | null = null
let dprQuery: MediaQueryList | null = null

function onVisibility(): void {
  if (!document.hidden) requestTick()
}

function onPause(): void {
  const paused = isMotionPaused()
  for (const stage of stages) stage.paused = paused
  requestTick()
  notifyStats()
}

function onReducedMotion(): void {
  const reduced = prefersReducedMotion()
  for (const stage of stages) stage.setReducedMotion(reduced)
}

function onDprChange(): void {
  watchDpr()
  for (const stage of stages) stage.remeasure()
}

function watchDpr(): void {
  dprQuery?.removeEventListener('change', onDprChange)
  dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`)
  dprQuery.addEventListener('change', onDprChange)
}

function installGlobals(): void {
  if (globalsInstalled) return
  globalsInstalled = true
  document.addEventListener('visibilitychange', onVisibility)
  stopPause = subscribeMotionPaused(onPause)
  stopReduced = subscribeReducedMotion(onReducedMotion)
  watchDpr()
}

function removeGlobals(): void {
  if (!globalsInstalled) return
  globalsInstalled = false
  document.removeEventListener('visibilitychange', onVisibility)
  stopPause?.()
  stopReduced?.()
  stopPause = null
  stopReduced = null
  dprQuery?.removeEventListener('change', onDprChange)
  dprQuery = null
}

/* ------------------------------------------------------------------ stage */

const DEFAULT_COLORS: Record<StageTone, { front: RGBA; back: RGBA; node: RGBA }> = {
  onDark: { front: [1, 1, 1, 0.46], back: [1, 1, 1, 0.13], node: [1, 1, 1, 1] },
  onPaper: { front: [14 / 255, 14 / 255, 13 / 255, 0.52], back: [14 / 255, 14 / 255, 13 / 255, 0.16], node: [14 / 255, 14 / 255, 13 / 255, 1] },
}

const _v = new Vector3()

interface Disposable {
  dispose(): void
}

class Stage implements StageContext {
  /* ---- what scenes see (StageContext) ---- */
  readonly scene = new Scene()
  readonly camera: PerspectiveCamera
  readonly size: StageSize = { width: 0, height: 0, dpr: 1, aspect: 1 }
  readonly colors: StageColors
  readonly pointer: StagePointer = { x: 0, y: 0, inside: false, px: 0, py: 0 }
  readonly drag: StageDrag = { yaw: 0, pitch: 0, active: false }
  readonly labels: LabelLayer
  readonly mode: StageMode
  readonly tone: StageTone
  reducedMotion: boolean
  paused: boolean
  state: StageState
  hover: HitId | null = null
  elapsed = 0

  get renderer(): WebGLRenderer {
    return this.slot.renderer
  }

  /* ---- internals ---- */
  readonly slot: Slot
  private readonly kind: SlotKind
  private readonly container: HTMLElement
  private readonly impl: WireScene
  private readonly options: StageOptions
  private readonly shared: StageShared
  private readonly continuous: boolean
  private readonly interactive: boolean
  private readonly parallax: boolean
  private readonly view: HTMLCanvasElement
  private readonly ctx2d: CanvasRenderingContext2D | null
  private readonly owned: Disposable[] = []
  private readonly occluders: Occluder[] = []
  private readonly resizeObserver: ResizeObserver
  private readonly intersectionObserver: IntersectionObserver
  private pxW = 0
  private pxH = 0
  private visible = false
  private dirty = true
  private animating = false
  private destroyed = false
  private started = false
  private time = 0
  private lastAt = 0
  private lastTick = -2
  private renders = 0
  private readonly stillTime: number
  // pointer
  private over = false
  private targetX = 0
  private targetY = 0
  private rect: DOMRect | null = null
  // drag
  private downId = -1
  private downX = 0
  private downY = 0
  private lastX = 0
  private lastY = 0
  private lastMoveAt = 0
  private moved = false
  private velYaw = 0
  private velPitch = 0
  private readonly pitchMin: number
  private readonly pitchMax: number
  private readonly dragSpeed: number

  constructor(container: HTMLElement, impl: WireScene, options: StageOptions, slot: Slot, kind: SlotKind, view: HTMLCanvasElement, ctx2d: CanvasRenderingContext2D | null) {
    this.container = container
    this.impl = impl
    this.options = options
    this.slot = slot
    this.kind = kind
    this.view = view
    this.ctx2d = ctx2d
    this.mode = options.mode ?? 'ondemand'
    this.tone = options.tone ?? 'onDark'
    this.continuous = this.mode === 'live'
    this.interactive = options.interactive === true
    this.parallax = options.parallax === true
    this.reducedMotion = prefersReducedMotion()
    this.paused = isMotionPaused()
    this.state = { ...(options.state ?? {}) }
    this.stillTime = options.stillTime ?? 0
    this.pitchMin = options.pitchRange?.[0] ?? -0.5
    this.pitchMax = options.pitchRange?.[1] ?? 0.5
    this.dragSpeed = options.dragSpeed ?? 0.006

    const base = DEFAULT_COLORS[this.tone]
    this.colors = {
      front: new Vector4(...base.front),
      back: new Vector4(...base.back),
      node: new Vector4(...base.node),
    }
    this.shared = {
      uResolution: { value: new Vector2(1, 1) },
      uPixelRatio: { value: 1 },
      uNear: { value: 0.05 },
      uPxScale: { value: 1 },
      uFront: { value: this.colors.front },
      uBack: { value: this.colors.back },
      uNode: { value: this.colors.node },
    }

    this.camera = new PerspectiveCamera(options.fov ?? 30, 1, 0.05, 200)
    this.camera.position.set(0, 0, 6)
    this.camera.lookAt(0, 0, 0)

    container.dataset.tone = this.tone
    if (this.interactive) container.dataset.interactive = 'true'
    container.appendChild(view)
    this.labels = new LabelLayer(container, this.continuous, () => this.invalidate())

    this.resizeObserver = new ResizeObserver((entries) => this.onResize(entries))
    const margin = this.continuous ? 0 : (options.margin ?? 200)
    this.intersectionObserver = new IntersectionObserver((entries) => this.onIntersect(entries), { rootMargin: `${margin}px` })
  }

  /* ---------------------------------------------------------------- lifecycle */

  start(): void {
    // One layout read at mount: the size, and whether we are on screen yet.
    const rect = this.container.getBoundingClientRect()
    const margin = this.continuous ? 0 : (this.options.margin ?? 200)
    this.visible = rect.bottom > -margin && rect.top < window.innerHeight + margin && rect.right > -margin && rect.left < window.innerWidth + margin
    this.readColors()
    this.applySize(this.container.clientWidth, this.container.clientHeight, 0, 0, false)

    this.impl.init(this)
    this.impl.resize?.(this)
    this.started = true
    this.labels.invalidateMetrics()

    try {
      this.resizeObserver.observe(this.container, { box: 'device-pixel-content-box' })
    } catch {
      this.resizeObserver.observe(this.container)
    }
    this.intersectionObserver.observe(this.container)

    const c = this.container
    if (this.interactive || this.impl.hit) {
      c.addEventListener('pointerdown', this.onPointerDown)
      c.addEventListener('pointermove', this.onPointerMove)
      c.addEventListener('pointerup', this.onPointerUp)
      c.addEventListener('pointercancel', this.onPointerCancel)
      c.addEventListener('pointerenter', this.onPointerMove)
      c.addEventListener('pointerleave', this.onPointerLeave)
    }
    if (this.parallax) {
      window.addEventListener('pointermove', this.onWindowPointer, { passive: true })
      window.addEventListener('scroll', this.onScroll, { passive: true })
    }
    if (typeof document.fonts?.ready?.then === 'function') {
      void document.fonts.ready.then(() => {
        if (this.destroyed) return
        this.labels.invalidateMetrics()
        this.invalidate()
      })
    }
    this.setCursor()

    // First paint right away rather than a frame later.
    if (this.visible && !document.hidden) this.draw(performance.now(), true)
    requestTick()
  }

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    const i = stages.indexOf(this)
    if (i >= 0) stages.splice(i, 1)
    this.resizeObserver.disconnect()
    this.intersectionObserver.disconnect()
    const c = this.container
    c.removeEventListener('pointerdown', this.onPointerDown)
    c.removeEventListener('pointermove', this.onPointerMove)
    c.removeEventListener('pointerup', this.onPointerUp)
    c.removeEventListener('pointercancel', this.onPointerCancel)
    c.removeEventListener('pointerenter', this.onPointerMove)
    c.removeEventListener('pointerleave', this.onPointerLeave)
    window.removeEventListener('pointermove', this.onWindowPointer)
    window.removeEventListener('scroll', this.onScroll)

    if (this.started) this.impl.dispose?.(this)
    for (const d of this.owned) d.dispose()
    this.owned.length = 0
    // Anything a scene added by hand.
    this.scene.traverse((o) => {
      const mesh = o as Partial<{ geometry: Disposable; material: Disposable | Disposable[] }>
      mesh.geometry?.dispose()
      if (Array.isArray(mesh.material)) for (const m of mesh.material) m.dispose()
      else mesh.material?.dispose()
    })
    this.scene.clear()
    this.labels.dispose()
    this.view.remove()
    if (this.kind === 'shared') {
      // Release the 2D backing store now rather than at garbage collection.
      this.view.width = 0
      this.view.height = 0
    }
    delete c.dataset.cursor
    delete c.dataset.interactive
    releaseSlot(this.slot)
    if (stages.length === 0) {
      removeGlobals()
      if (ticking) {
        cancelAnimationFrame(rafId)
        ticking = false
      }
      stats.fps = 0
    }
    notifyStats()
  }

  /* ---------------------------------------------------------------- StageContext */

  invalidate(): void {
    if (this.destroyed) return
    this.dirty = true
    requestTick()
  }

  lines(source: LineSource, options: WireLinesOptions = {}): WireLines {
    const lines = new WireLines(this.shared, source, options)
    ;(options.parent ?? this.scene).add(lines)
    this.owned.push(lines)
    return lines
  }

  nodes(specs: NodeSpec[], options: WireNodesOptions = {}): WireNodes {
    const nodes = new WireNodes(this.shared, specs, options)
    ;(options.parent ?? this.scene).add(nodes)
    this.owned.push(nodes)
    return nodes
  }

  group(parent?: Object3D): Group {
    const g = new Group()
    ;(parent ?? this.scene).add(g)
    return g
  }

  occluder(radius: number, follow?: Object3D): Occluder {
    const o = new Occluder(radius, follow ?? null)
    this.occluders.push(o)
    return o
  }

  frame(radius = 1, fill = 0.86): void {
    const cam = this.camera
    const tanY = Math.tan((cam.fov * Math.PI) / 360)
    const k = Math.max(fill, 0.05) * (this.size.aspect >= 1 ? tanY : tanY * this.size.aspect)
    const d = (radius * Math.sqrt(1 + k * k)) / k
    _v.copy(cam.position)
    if (_v.lengthSq() < 1e-9) _v.set(0, 0, 1)
    _v.normalize().multiplyScalar(d)
    cam.position.copy(_v)
    cam.lookAt(0, 0, 0)
    cam.updateProjectionMatrix()
  }

  project(world: Vector3, out: ScreenPoint): ScreenPoint {
    const cam = this.camera
    _v.copy(world).applyMatrix4(cam.matrixWorldInverse)
    out.depth = -_v.z
    if (_v.z > -cam.near) {
      out.visible = false
      out.x = 0
      out.y = 0
      return out
    }
    _v.applyMatrix4(cam.projectionMatrix)
    out.x = (_v.x * 0.5 + 0.5) * this.size.width
    out.y = (0.5 - _v.y * 0.5) * this.size.height
    out.visible = true
    return out
  }

  worldPerPx(distance: number): number {
    return (2 * Math.tan((this.camera.fov * Math.PI) / 360) * distance) / Math.max(this.size.height, 1)
  }

  intro(duration: number, delay = 0): number {
    if (this.reducedMotion || duration <= 0) return 1
    const t = (this.elapsed - delay) / duration
    return t < 0 ? 0 : t > 1 ? 1 : t
  }

  /* ---------------------------------------------------------------- handle */

  setState(patch: StageState): void {
    if (this.destroyed) return
    Object.assign(this.state, patch)
    this.impl.onState?.(this, patch)
    this.invalidate()
  }

  getStats(): StageStats {
    return { renders: this.renders, mode: this.mode, visible: this.visible, active: true }
  }

  setReducedMotion(value: boolean): void {
    if (this.reducedMotion === value) return
    this.reducedMotion = value
    if (value) {
      this.velYaw = 0
      this.velPitch = 0
    }
    this.invalidate()
  }

  /** Re-read the container size (device pixel ratio changed). */
  remeasure(): void {
    if (this.destroyed) return
    this.applySize(this.container.clientWidth, this.container.clientHeight, 0, 0, true)
  }

  /* ---------------------------------------------------------------- frames */

  needsFrame(): boolean {
    if (this.destroyed || !this.visible || this.pxW === 0 || this.pxH === 0 || this.slot.lost || document.hidden) return false
    return this.dirty || this.animating || (this.continuous && !this.paused && !this.reducedMotion)
  }

  /** One frame: advance, update the scene, place labels, render. `sync` frames (resize, first paint) carry no time. */
  draw(now: number, sync: boolean): void {
    if (this.destroyed || this.pxW === 0 || this.pxH === 0 || this.slot.lost) return

    // Frame step. A stage waking from idle, or drawing outside the loop, must not see the idle gap as time.
    let dt = 0
    if (!sync) {
      if (this.renders === 0) dt = 0
      else if (this.lastTick === tickIndex - 1 && this.lastAt > 0) dt = Math.min(Math.max((now - this.lastAt) / 1000, 0), 0.05)
      else dt = 1 / 60
      this.lastTick = tickIndex
      this.lastAt = now
    }
    const motion = !this.reducedMotion && !this.paused
    if (motion) this.time += dt
    this.elapsed += dt

    let animating = this.stepPointer(dt)
    if (this.stepDrag(dt)) animating = true
    if (this.impl.update?.(this, this.reducedMotion ? this.stillTime : this.time, dt) === true) animating = true

    this.scene.updateMatrixWorld()
    this.camera.updateMatrixWorld()
    for (let i = 0; i < this.occluders.length; i++) this.occluders[i]!.update()
    if (this.labels.update(this, dt)) animating = true
    // A moving scene can slide under a still pointer.
    if (!sync && this.over && this.impl.hit && !this.drag.active) this.updateHover()

    this.render()
    this.renders += 1
    stats.renders += 1
    this.dirty = false
    this.animating = animating
  }

  private render(): void {
    const w = this.pxW
    const h = this.pxH
    const s = this.shared
    s.uResolution.value.set(w, h)
    s.uPixelRatio.value = this.size.dpr
    s.uNear.value = this.camera.near
    s.uPxScale.value = (2 * Math.tan((this.camera.fov * Math.PI) / 360)) / h

    const slot = this.slot
    const r = slot.renderer
    if (this.kind === 'live') {
      r.setScissorTest(false)
      r.setViewport(0, 0, w, h)
      r.render(this.scene, this.camera)
      return
    }
    if (w > slot.width || h > slot.height) {
      // Grow only, in steps, so a page full of figures settles on one buffer size.
      slot.width = Math.max(slot.width, Math.ceil(w / 64) * 64)
      slot.height = Math.max(slot.height, Math.ceil(h / 64) * 64)
      r.setSize(slot.width, slot.height, false)
    }
    r.setViewport(0, 0, w, h)
    r.setScissor(0, 0, w, h)
    r.setScissorTest(true)
    r.render(this.scene, this.camera)
    const c = this.ctx2d
    if (!c) return
    // The viewport sits in the bottom left corner of the shared buffer; copy exactly those pixels across.
    c.clearRect(0, 0, w, h)
    c.drawImage(slot.canvas, 0, slot.height - h, w, h, 0, 0, w, h)
  }

  /* ---------------------------------------------------------------- size, visibility, colors */

  private onResize(entries: ResizeObserverEntry[]): void {
    const entry = entries[entries.length - 1]
    if (!entry || this.destroyed) return
    const css = entry.contentBoxSize?.[0]
    const device = entry.devicePixelContentBoxSize?.[0]
    const cssW = css ? css.inlineSize : entry.contentRect.width
    const cssH = css ? css.blockSize : entry.contentRect.height
    this.applySize(cssW, cssH, device ? device.inlineSize : 0, device ? device.blockSize : 0, true)
  }

  private applySize(cssW: number, cssH: number, deviceW: number, deviceH: number, redraw: boolean): void {
    const real = window.devicePixelRatio || 1
    const dpr = Math.min(real, 2)
    // Use the browser's exact device-pixel box when it agrees with the pixel ratio (it settles the rounding of
    // fractional CSS sizes). Under device emulation Chromium reports that box unscaled, so it is only trusted
    // within a pixel of what the ratio predicts.
    const exact = real <= 2 && deviceW > 0 && deviceH > 0 && Math.abs(deviceW - cssW * real) < 1.01 && Math.abs(deviceH - cssH * real) < 1.01
    const pxW = cssW > 0 ? Math.max(1, exact ? deviceW : Math.round(cssW * dpr)) : 0
    const pxH = cssH > 0 ? Math.max(1, exact ? deviceH : Math.round(cssH * dpr)) : 0
    if (pxW === this.pxW && pxH === this.pxH && cssW === this.size.width && cssH === this.size.height && dpr === this.size.dpr) return
    this.pxW = pxW
    this.pxH = pxH
    this.size.width = cssW
    this.size.height = cssH
    this.size.dpr = dpr
    this.size.aspect = cssH > 0 ? cssW / cssH : 1
    this.rect = null
    if (pxW === 0 || pxH === 0) return

    if (this.kind === 'live') {
      this.slot.renderer.setSize(pxW, pxH, false)
    } else {
      this.view.width = pxW
      this.view.height = pxH
    }
    this.camera.aspect = this.size.aspect
    this.camera.updateProjectionMatrix()
    this.readColors()
    if (this.started) {
      this.impl.resize?.(this)
      this.labels.invalidateMetrics()
    }
    this.dirty = true
    if (redraw && this.started) {
      // Resizing clears the canvas. Draw in the same task so no empty frame is ever shown.
      if (this.visible && !document.hidden) this.draw(performance.now(), true)
      requestTick()
    }
  }

  private onIntersect(entries: IntersectionObserverEntry[]): void {
    const entry = entries[entries.length - 1]
    if (!entry || this.destroyed) return
    this.visible = entry.isIntersecting
    this.rect = null
    if (this.visible) requestTick()
  }

  /** Token colors, read once per resize. */
  private readColors(): void {
    const cs = getComputedStyle(this.container)
    const paper = this.tone === 'onPaper'
    const base = DEFAULT_COLORS[this.tone]
    const read = (name: string, fallback: RGBA, into: Vector4): void => {
      const c = parseCssColor(cs.getPropertyValue(name), fallback)
      into.set(c[0], c[1], c[2], c[3])
    }
    read(paper ? '--wire-front-ink' : '--wire-front', base.front, this.colors.front)
    read(paper ? '--wire-back-ink' : '--wire-back', base.back, this.colors.back)
    read(paper ? '--wire-node-ink' : '--wire-node', base.node, this.colors.node)
  }

  /* ---------------------------------------------------------------- pointer */

  private stepPointer(dt: number): boolean {
    if (!this.parallax) return false
    const p = this.pointer
    const tx = this.reducedMotion ? 0 : this.targetX
    const ty = this.reducedMotion ? 0 : this.targetY
    if (dt > 0) {
      p.x = damp(p.x, tx, 0.15, dt)
      p.y = damp(p.y, ty, 0.15, dt)
    }
    return p.x !== tx || p.y !== ty
  }

  private stepDrag(dt: number): boolean {
    if (this.drag.active || dt <= 0) return false
    if (this.reducedMotion || (Math.abs(this.velYaw) < 0.02 && Math.abs(this.velPitch) < 0.02)) {
      this.velYaw = 0
      this.velPitch = 0
      return false
    }
    this.drag.yaw += this.velYaw * dt
    const pitch = this.drag.pitch + this.velPitch * dt
    this.drag.pitch = pitch < this.pitchMin ? this.pitchMin : pitch > this.pitchMax ? this.pitchMax : pitch
    if (this.drag.pitch !== pitch) this.velPitch = 0
    const k = Math.exp(-dt / 0.38)
    this.velYaw *= k
    this.velPitch *= k
    return true
  }

  private updateHover(): void {
    if (!this.impl.hit) return
    const id = this.over && !this.drag.active ? this.impl.hit(this, this.pointer.px, this.pointer.py) : null
    if (id === this.hover) return
    this.hover = id
    this.setCursor()
    this.options.onHover?.(id)
    this.invalidate()
  }

  private setCursor(): void {
    const cursor = this.drag.active ? 'grabbing' : this.hover !== null ? 'pointer' : this.interactive ? 'grab' : ''
    if (cursor) this.container.dataset.cursor = cursor
    else delete this.container.dataset.cursor
  }

  private readonly onPointerDown = (e: PointerEvent): void => {
    if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return
    this.downId = e.pointerId
    this.downX = e.clientX
    this.downY = e.clientY
    this.lastX = e.clientX
    this.lastY = e.clientY
    this.lastMoveAt = e.timeStamp
    this.moved = false
    this.velYaw = 0
    this.velPitch = 0
    if (this.interactive) {
      try {
        this.container.setPointerCapture(e.pointerId)
      } catch {
        /* the pointer is already gone */
      }
    }
  }

  private readonly onPointerMove = (e: PointerEvent): void => {
    const p = this.pointer
    if (e.target === this.container) {
      p.px = e.offsetX
      p.py = e.offsetY
    }
    if (e.pointerType !== 'touch') {
      this.over = true
      if (!this.parallax) p.inside = true
    }

    if (e.pointerId === this.downId) {
      const dx = e.clientX - this.lastX
      const dy = e.clientY - this.lastY
      if (!this.moved && Math.hypot(e.clientX - this.downX, e.clientY - this.downY) > 4) {
        this.moved = true
        if (this.interactive) {
          this.drag.active = true
          if (this.hover !== null) {
            this.hover = null
            this.options.onHover?.(null)
          }
          this.setCursor()
        }
      }
      if (this.moved && this.interactive) {
        const yaw = dx * this.dragSpeed
        const pitch = dy * this.dragSpeed
        this.drag.yaw += yaw
        const next = this.drag.pitch + pitch
        this.drag.pitch = next < this.pitchMin ? this.pitchMin : next > this.pitchMax ? this.pitchMax : next
        const step = Math.max((e.timeStamp - this.lastMoveAt) / 1000, 0.004)
        this.velYaw = this.velYaw * 0.6 + (yaw / step) * 0.4
        this.velPitch = this.velPitch * 0.6 + (pitch / step) * 0.4
        this.invalidate()
      }
      this.lastX = e.clientX
      this.lastY = e.clientY
      this.lastMoveAt = e.timeStamp
      return
    }
    if (e.pointerType !== 'touch') this.updateHover()
  }

  private readonly onPointerUp = (e: PointerEvent): void => {
    if (e.pointerId !== this.downId) return
    this.downId = -1
    if (this.interactive && this.container.hasPointerCapture(e.pointerId)) this.container.releasePointerCapture(e.pointerId)
    if (this.moved && this.interactive) {
      this.drag.active = false
      // A pause before letting go means no throw.
      if (e.timeStamp - this.lastMoveAt > 90 || this.reducedMotion) {
        this.velYaw = 0
        this.velPitch = 0
      }
      this.setCursor()
      this.invalidate()
      return
    }
    if (this.impl.hit && e.target === this.container) {
      const id = this.impl.hit(this, e.offsetX, e.offsetY)
      if (id !== null) this.options.onSelect?.(id)
    }
  }

  private readonly onPointerCancel = (e: PointerEvent): void => {
    // The browser took the gesture (a vertical scroll on touch). Let go without throwing or selecting.
    if (e.pointerId !== this.downId) return
    this.downId = -1
    this.velYaw = 0
    this.velPitch = 0
    if (this.drag.active) {
      this.drag.active = false
      this.setCursor()
      this.invalidate()
    }
  }

  private readonly onPointerLeave = (): void => {
    this.over = false
    if (!this.parallax) this.pointer.inside = false
    if (this.hover !== null && !this.drag.active) {
      this.hover = null
      this.setCursor()
      this.options.onHover?.(null)
      this.invalidate()
    }
  }

  /** Parallax source: the pointer anywhere over the stage's box, even above content layered on top of it. */
  private readonly onWindowPointer = (e: PointerEvent): void => {
    if (e.pointerType === 'touch' || !this.visible) return
    if (!this.rect) this.rect = this.container.getBoundingClientRect()
    const r = this.rect
    const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom
    this.pointer.inside = inside
    const tx = inside && r.width > 0 ? ((e.clientX - r.left) / r.width) * 2 - 1 : 0
    const ty = inside && r.height > 0 ? ((e.clientY - r.top) / r.height) * 2 - 1 : 0
    if (tx === this.targetX && ty === this.targetY) return
    this.targetX = tx
    this.targetY = ty
    if (!this.reducedMotion) {
      this.animating = true
      requestTick()
    }
  }

  private readonly onScroll = (): void => {
    this.rect = null
  }
}

/* ------------------------------------------------------------------ public */

const INERT: StageHandle = {
  destroy() {},
  setState() {},
  invalidate() {},
  stats: () => ({ renders: 0, mode: 'ondemand', visible: false, active: false }),
}

/**
 * Mount a scene in a container. The container needs a size from CSS; the stage adds a canvas and a label
 * layer inside it and removes both on destroy. If WebGL is unavailable this returns a handle that does nothing.
 */
export function createStage(container: HTMLElement, scene: WireScene, options: StageOptions = {}): StageHandle {
  if (typeof window === 'undefined' || typeof document === 'undefined') return INERT

  // Only one stage can own the live canvas; a second one renders through the shared context instead.
  const wantLive = options.mode === 'live'
  const liveFree = !slots.live || slots.live.users === 0
  const kind: SlotKind = wantLive && liveFree ? 'live' : 'shared'
  const slot = acquireSlot(kind)
  if (!slot) return INERT

  let view: HTMLCanvasElement
  let ctx2d: CanvasRenderingContext2D | null = null
  if (kind === 'live') {
    view = slot.canvas
  } else {
    view = document.createElement('canvas')
    view.className = 'stageview-canvas'
    view.setAttribute('aria-hidden', 'true')
    ctx2d = view.getContext('2d')
    if (!ctx2d) {
      releaseSlot(slot)
      return INERT
    }
  }

  const stage = new Stage(container, scene, options, slot, kind, view, ctx2d)
  stages.push(stage)
  installGlobals()
  stage.start()
  notifyStats()

  return {
    destroy: () => stage.destroy(),
    setState: (patch) => stage.setState(patch),
    invalidate: () => stage.invalidate(),
    stats: () => stage.getStats(),
  }
}
