'use client'

import { useEffect, useRef } from 'react'
import type { HitId, SceneFactory, StageHandle, StageMode, StageState, StageTone } from './core/types'
import './StageView.css'

export interface StageViewProps {
  /**
   * Loads the scene module, for example `() => import('@/three/scenes/hero')`. The module's default export is
   * a SceneFactory. It runs once, in an effect, together with the engine import, so three.js is never part of
   * the page's first JavaScript. Because this prop is a function, StageView must be rendered by a client component.
   */
  load: () => Promise<{ default: SceneFactory }>
  /** 'ondemand' (default) draws only when something changes. 'live' draws every frame: the hero only. */
  mode?: StageMode
  /** Which wire tokens to draw with. Default 'onDark'. */
  tone?: StageTone
  /** Drag to rotate with inertia. Vertical touch scrolling still scrolls the page. */
  interactive?: boolean
  /** Track the pointer for parallax (the scene reads ctx.pointer). */
  parallax?: boolean
  /** Plain data for the scene. Changed keys are pushed with setState; the stage is never re-created for it. */
  state?: StageState
  /** Vertical field of view in degrees. Default 30. */
  fov?: number
  /** Ambient time (seconds) of the still pose shown under reduced motion. Default 0. */
  stillTime?: number
  className?: string
  onHover?: (id: HitId | null) => void
  onSelect?: (id: HitId) => void
  /** Called with the stage handle once it exists (the lab uses it to read render counts). */
  onReady?: (stage: StageHandle) => void
}

/**
 * A sized, decorative container that mounts a wire scene. The server renders only the empty container, so the
 * page reads the same with or without the canvas; give it a size through `className` (it fills its parent by default).
 */
export function StageView(props: StageViewProps) {
  const { mode = 'ondemand', tone = 'onDark', interactive = false, parallax = false, fov, stillTime, state, className } = props
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<StageHandle | null>(null)
  const pushedRef = useRef<StageState>({})
  const latest = useRef(props)

  useEffect(() => {
    latest.current = props
  })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let cancelled = false
    let stage: StageHandle | null = null

    void Promise.all([import('./core/stage'), latest.current.load()]).then(([engine, sceneModule]) => {
      if (cancelled) return
      const initial = { ...(latest.current.state ?? {}) }
      stage = engine.createStage(container, sceneModule.default(), {
        mode,
        tone,
        interactive,
        parallax,
        fov,
        stillTime,
        state: initial,
        onHover: (id) => latest.current.onHover?.(id),
        onSelect: (id) => latest.current.onSelect?.(id),
      })
      pushedRef.current = initial
      stageRef.current = stage
      // State may have changed while the modules were loading.
      pushState(stage, pushedRef, latest.current.state)
      latest.current.onReady?.(stage)
    })

    return () => {
      cancelled = true
      stage?.destroy()
      stageRef.current = null
    }
  }, [mode, tone, interactive, parallax, fov, stillTime])

  useEffect(() => {
    if (stageRef.current) pushState(stageRef.current, pushedRef, state)
  }, [state])

  return (
    <div
      ref={containerRef}
      className={className ? `stageview ${className}` : 'stageview'}
      data-tone={tone}
      data-mode={mode}
      data-interactive={interactive ? 'true' : undefined}
    />
  )
}

/** Push only the keys whose values changed since the last push. */
function pushState(stage: StageHandle, pushedRef: { current: StageState }, next: StageState | undefined): void {
  if (!next) return
  const pushed = pushedRef.current
  let patch: StageState | null = null
  for (const key of Object.keys(next)) {
    if (!Object.is(pushed[key], next[key])) {
      patch ??= {}
      patch[key] = next[key]
    }
  }
  if (!patch) return
  pushedRef.current = { ...pushed, ...patch }
  stage.setState(patch)
}
