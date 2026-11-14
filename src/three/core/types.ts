/*
 * Public types of the wire engine. Type-only: importing from this file never pulls three.js into a bundle
 * (use `import type`).
 */

import type { Group, Object3D, PerspectiveCamera, Scene, Vector3, Vector4, WebGLRenderer } from 'three'
import type { LabelLayer } from './labels'
import type { LineSource, WireLines, WireLinesOptions } from './lines'
import type { NodeSpec, WireNodes, WireNodesOptions } from './nodes'
import type { Occluder } from './occluder'

export type StageMode = 'live' | 'ondemand'
export type StageTone = 'onDark' | 'onPaper'

/** What a scene's hit() returns and what onHover / onSelect receive. */
export type HitId = string | number

/** Plain data pushed into a scene from React (StageView's `state` prop). */
export type StageState = Record<string, unknown>

export interface StageSize {
  /** CSS pixels. */
  width: number
  height: number
  /** Canvas pixels per CSS pixel (the device pixel ratio, capped at 2). */
  dpr: number
  aspect: number
}

/** Stroke colors read from the --wire-* tokens for the stage's tone. x, y, z, w = r, g, b, a in 0..1. */
export interface StageColors {
  front: Vector4
  back: Vector4
  node: Vector4
}

export interface StagePointer {
  /** Smoothed pointer position relative to the stage centre, -1..1 on each axis (0, 0 when outside). Y grows downward. */
  x: number
  y: number
  /** True while a mouse or pen is over the stage. */
  inside: boolean
  /** Last raw pointer position in CSS pixels from the stage's top left corner. */
  px: number
  py: number
}

export interface StageDrag {
  /** Accumulated horizontal drag in radians (with inertia). Add it to a rotation.y. */
  yaw: number
  /** Accumulated vertical drag in radians, clamped to the stage's pitch range. Add it to a rotation.x. */
  pitch: number
  /** True while a pointer is down and dragging. */
  active: boolean
}

export interface ScreenPoint {
  /** CSS pixels from the stage's top left corner. */
  x: number
  y: number
  /** Distance in front of the camera, world units. */
  depth: number
  /** False when the point is behind the camera. */
  visible: boolean
}

export interface StageContext {
  readonly scene: Scene
  readonly camera: PerspectiveCamera
  /**
   * The WebGL renderer this stage draws with (its own in 'live' mode, the shared one in 'ondemand' mode).
   * Read-only use: build environment maps, read capabilities. Never change its state (size, tone mapping, clear color,
   * clipping, shadows): other stages share it.
   */
  readonly renderer: WebGLRenderer
  readonly size: StageSize
  readonly colors: StageColors
  readonly pointer: StagePointer
  readonly drag: StageDrag
  readonly labels: LabelLayer
  readonly mode: StageMode
  readonly tone: StageTone
  /** True when the visitor prefers reduced motion. Time is frozen; snap transitions instead of travelling. */
  readonly reducedMotion: boolean
  /** True while the global pause flag is set. Ambient time is frozen. */
  readonly paused: boolean
  /** Merged state from createStage options and every setState call. */
  readonly state: StageState
  /** What the pointer is over, as returned by the scene's hit(). */
  readonly hover: HitId | null
  /** Seconds of rendered time since the stage first drew. Use `intro()` rather than reading this directly. */
  readonly elapsed: number

  /** Ask for one more frame. Call it whenever something changed outside update(). */
  invalidate(): void
  /** Create hairlines from a shape or a figure, add them to the scene (or `options.parent`), and dispose them with the stage. */
  lines(source: LineSource, options?: WireLinesOptions): WireLines
  /** Create screen-space markers, add them to the scene (or `options.parent`), and dispose them with the stage. */
  nodes(specs: NodeSpec[], options?: WireNodesOptions): WireNodes
  /** Create an empty group in the scene (or under `parent`). */
  group(parent?: Object3D): Group
  /** A sphere that hides (or dims) lines, nodes and labels behind it. Pass `follow` to keep it on an object. */
  occluder(radius: number, follow?: Object3D): Occluder
  /** Move the camera along its current direction so a sphere of `radius` around the origin fills `fill` of the smaller stage side. */
  frame(radius?: number, fill?: number): void
  /** Project a world position to stage pixels. Writes into `out` and returns it. */
  project(world: Vector3, out: ScreenPoint): ScreenPoint
  /** World units covered by one CSS pixel at `distance` in front of the camera. */
  worldPerPx(distance: number): number
  /** Progress 0..1 of a one-off intro lasting `duration` seconds after `delay`. Always 1 under reduced motion. */
  intro(duration: number, delay?: number): number
}

/**
 * A scene. The stage calls init once, then resize, then update before every drawn frame.
 * Return true from update while something is still animating; an on-demand stage stops drawing when it returns false.
 */
export interface WireScene {
  init(ctx: StageContext): void
  /** `time` is ambient seconds (frozen while paused or under reduced motion); `dt` is the real frame step in seconds. */
  update?(ctx: StageContext, time: number, dt: number): boolean | void
  /** Called after init and whenever the stage size changes. Set up the camera here. */
  resize?(ctx: StageContext): void
  /** Called with the changed keys whenever state is pushed in. */
  onState?(ctx: StageContext, patch: StageState): void
  /** Return an id for what is under the point (CSS pixels), or null. */
  hit?(ctx: StageContext, x: number, y: number): HitId | null
  /** Free anything the scene made outside ctx.lines / ctx.nodes / ctx.labels. */
  dispose?(ctx: StageContext): void
}

/** What a scene module exports as default. Called once per mounted stage. */
export type SceneFactory = () => WireScene

export interface StageOptions {
  /** 'live' draws every frame on its own WebGL canvas (the hero only). 'ondemand' (default) draws only when invalidated. */
  mode?: StageMode
  /** Which --wire-* tokens to draw with. Default 'onDark'. */
  tone?: StageTone
  /** Drag to rotate with inertia. Default false. */
  interactive?: boolean
  /** Track the pointer for parallax (ctx.pointer). Default false. */
  parallax?: boolean
  /** Initial state, available as ctx.state in init. */
  state?: StageState
  /** Vertical field of view in degrees. Default 30. */
  fov?: number
  /** Limits of ctx.drag.pitch in radians. Default [-0.5, 0.5]. */
  pitchRange?: [number, number]
  /** Radians per CSS pixel of drag. Default 0.006. */
  dragSpeed?: number
  /** The ambient time, in seconds, used for the still pose under reduced motion. Default 0. */
  stillTime?: number
  /** Extra distance around the viewport, in CSS pixels, inside which an on-demand stage already draws. Default 200. */
  margin?: number
  onHover?: (id: HitId | null) => void
  onSelect?: (id: HitId) => void
}

export interface StageStats {
  /** Frames this stage has drawn since it was created. */
  renders: number
  mode: StageMode
  /** True when the stage is on or near the screen. */
  visible: boolean
  /** False when WebGL was unavailable and the stage is inert. */
  active: boolean
}

export interface StageHandle {
  /** Stop everything and free every GPU resource. Safe to call twice. */
  destroy(): void
  /** Merge a patch into the scene's state and redraw. */
  setState(patch: StageState): void
  /** Ask for a redraw. */
  invalidate(): void
  /** Counters for the lab. */
  stats(): StageStats
}

export interface EngineStats {
  /** WebGL contexts the engine currently holds (0, 1 or 2). */
  contexts: number
  stages: number
  /** True while the shared requestAnimationFrame loop is running. */
  ticking: boolean
  /** Frames per second of the shared loop (0 when stopped). */
  fps: number
  /** Script milliseconds spent per frame in the engine, smoothed. */
  scriptMs: number
  /** Worst frame in roughly the last second. */
  scriptMsMax: number
  /** Total frames drawn by all stages. */
  renders: number
}
