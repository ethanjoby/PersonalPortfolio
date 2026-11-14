'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { StageView } from '@/three/StageView'
import type { EngineStats, HitId, SceneFactory, StageHandle } from '@/three/core/types'
import { setMotionPaused } from '@/three/motion'
import type { GalleryName } from '@/three/scenes/lab/gallery'
import type { Satellite } from '@/three/scenes/lab/orbitPlot'
import { useMotionPaused, useReducedMotion } from '@/three/useMotionPaused'
import './lab.css'

/*
 * Wire engine lab (development only). Everything the engine can do, on one page, with live counters:
 * the orbit plot in live mode, every shape generator in its own on-demand stage (all on one shared WebGL
 * context), the figure morph, a globe in the paper tone, a style test card, and a near-plane test.
 *
 * Query flags for scripted checks: ?globe=lattice, ?view=low, ?paused=1, ?morph=<n>, ?nogl=1 (pretend WebGL is missing).
 */

const SHAPES: GalleryName[] = [
  'globe',
  'ring',
  'torus',
  'saddle',
  'waveSurface',
  'helix',
  'lattice',
  'strata',
  'cone',
  'sweep',
  'tree',
  'gitGraph',
  'funnel',
  'planeGrid',
  'sheets',
  'graph',
]

type Loader = () => Promise<{ default: SceneFactory }>

const loadOrbit: Loader = () => import('@/three/scenes/lab/orbitPlot')
const loadMorph: Loader = () => import('@/three/scenes/lab/morph')
const loadPaper: Loader = () => import('@/three/scenes/lab/paperGlobe')
const loadSpecimen: Loader = () => import('@/three/scenes/lab/specimen')
const loadNear: Loader = () => import('@/three/scenes/lab/nearPlane')
const shapeLoaders = Object.fromEntries(
  SHAPES.map((name) => [name, (() => import('@/three/scenes/lab/gallery').then((m) => ({ default: m.shapeScene(name) }))) as Loader]),
) as Record<GalleryName, Loader>

export interface LabProps {
  satellites: Satellite[]
  location: string
}

export function Lab({ satellites, location }: LabProps) {
  const [ready, setReady] = useState(false)
  const [globe, setGlobe] = useState<'solid' | 'lattice'>('solid')
  const [view, setView] = useState<'dome' | 'low'>('dome')
  const [focus, setFocus] = useState<string | null>(null)
  const [selected, setSelected] = useState<string>('none')
  const [morph, setMorph] = useState(0)
  const paused = useMotionPaused()
  const reduced = useReducedMotion()

  const handles = useRef(new Map<string, StageHandle>())
  const readout = useRef<HTMLDListElement>(null)

  // Read the query flags, then let the stages mount. The engine is imported here only to set test hooks
  // and to subscribe to its counters; StageView would load it on its own.
  useEffect(() => {
    let stop: (() => void) | null = null
    let cancelled = false
    const query = new URLSearchParams(window.location.search)
    if (query.get('globe') === 'lattice') setGlobe('lattice')
    if (query.get('view') === 'low') setView('low')
    if (query.get('paused') === '1') setMotionPaused(true)
    const m = Number(query.get('morph'))
    if (Number.isFinite(m) && m > 0) setMorph(Math.floor(m))

    void import('@/three/core/stage').then((engine) => {
      if (cancelled) return
      engine.setWebGLDisabledForTest(query.get('nogl') === '1')
      const write = (s: EngineStats): void => {
        const root = readout.current
        if (!root) return
        const set = (key: string, value: string): void => {
          const el = root.querySelector(`[data-stat="${key}"]`)
          if (el && el.textContent !== value) el.textContent = value
        }
        set('script', `${s.scriptMs.toFixed(2)} ms`)
        set('peak', `${s.scriptMsMax.toFixed(2)} ms`)
        set('fps', s.ticking ? s.fps.toFixed(0) : '0')
        set('contexts', String(s.contexts))
        set('stages', String(s.stages))
        set('loop', s.ticking ? 'running' : 'stopped')
        set('renders', String(s.renders))
        for (const [name, handle] of handles.current) {
          const el = document.querySelector(`[data-renders="${name}"]`)
          const value = String(handle.stats().renders)
          if (el && el.textContent !== value) el.textContent = value
        }
      }
      stop = engine.subscribeEngineStats(write)
      Object.assign(window, { __wireStats: () => ({ ...engine.getEngineStats() }), __wireLose: engine.simulateContextLoss })
      write(engine.getEngineStats())
      setReady(true)
    })
    return () => {
      cancelled = true
      stop?.()
      setMotionPaused(false)
    }
  }, [])

  const register = useCallback(
    (name: string) => (stage: StageHandle) => {
      handles.current.set(name, stage)
    },
    [],
  )

  const orbitState = useMemo(() => ({ satellites, focus, globe, view }), [satellites, focus, globe, view])
  const morphState = useMemo(() => ({ index: morph }), [morph])
  const paperState = useMemo(() => ({ label: location }), [location])
  const onHover = useCallback((id: HitId | null) => setFocus(typeof id === 'string' ? id : null), [])
  const onSelect = useCallback((id: HitId) => setSelected(String(id)), [])
  const nextMorph = useCallback(() => setMorph((i) => i + 1), [])

  const loseContext = (): void => {
    void import('@/three/core/stage').then((engine) => engine.simulateContextLoss())
  }

  const focused = satellites.find((s) => s.id === focus)

  return (
    <main className="lab">
      <header className="lab-head">
        <div>
          <p className="lab-label">Development only</p>
          <h1 className="lab-title">Wire engine lab</h1>
        </div>
        <dl className="lab-readout" ref={readout}>
          <Stat name="script" label="Script per frame" />
          <Stat name="peak" label="Worst frame" />
          <Stat name="fps" label="Frames per second" />
          <Stat name="contexts" label="WebGL contexts" />
          <Stat name="stages" label="Stages" />
          <Stat name="loop" label="Frame loop" />
          <Stat name="renders" label="Frames drawn" />
        </dl>
      </header>

      <section className="lab-section" id="orbit">
        <div className="lab-bar">
          <h2 className="lab-label">Orbit plot, live</h2>
          <div className="lab-controls">
            {reduced ? (
              <span className="lab-note">Reduced motion: still pose</span>
            ) : (
              <button id="lab-pause" type="button" className="lab-button" aria-pressed={paused} onClick={() => setMotionPaused(!paused)}>
                {paused ? 'Play orbit' : 'Pause orbit'}
              </button>
            )}
            <button id="lab-globe-solid" type="button" className="lab-button" aria-pressed={globe === 'solid'} onClick={() => setGlobe('solid')}>
              Solid globe
            </button>
            <button id="lab-globe-lattice" type="button" className="lab-button" aria-pressed={globe === 'lattice'} onClick={() => setGlobe('lattice')}>
              See-through lattice
            </button>
            <button id="lab-view-dome" type="button" className="lab-button" aria-pressed={view === 'dome'} onClick={() => setView('dome')}>
              Long lens
            </button>
            <button id="lab-view-low" type="button" className="lab-button" aria-pressed={view === 'low'} onClick={() => setView('low')}>
              Low and wide
            </button>
            <button id="lab-lose" type="button" className="lab-button" onClick={loseContext}>
              Lose WebGL context
            </button>
          </div>
        </div>
        <div className="lab-orbit">
          {ready ? (
            <StageView
              key={view}
              load={loadOrbit}
              mode="live"
              interactive
              state={orbitState}
              onHover={onHover}
              onSelect={onSelect}
              onReady={register('orbit')}
              className="lab-orbit-stage"
            />
          ) : null}
        </div>
        <p className="lab-caption">
          <span>
            Pointing at <strong id="lab-focus">{focused ? `${focused.short} ${focused.year}` : 'nothing'}</strong>
          </span>
          <span>
            Last selected <strong id="lab-selected">{selected}</strong>
          </span>
          <span>
            Frames drawn <strong data-renders="orbit">0</strong>
          </span>
        </p>
      </section>

      <section className="lab-section" id="gallery">
        <div className="lab-bar">
          <h2 className="lab-label">Shape generators, one on-demand stage each</h2>
          <p className="lab-note">All of these share one WebGL context. Drag any of them.</p>
        </div>
        <div className="lab-grid">
          {SHAPES.map((name) => (
            <figure className="lab-cell" key={name}>
              <div className="lab-cell-stage">
                {ready ? <StageView load={shapeLoaders[name]} interactive onReady={register(name)} /> : null}
              </div>
              <figcaption className="lab-cell-caption">
                <span>{name}</span>
                <span>
                  drawn <span data-renders={name}>0</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="lab-section lab-two" id="morph">
        <div>
          <div className="lab-bar">
            <h2 className="lab-label">Figure morph</h2>
            <button id="lab-morph-next" type="button" className="lab-button" onClick={nextMorph}>
              Next figure
            </button>
          </div>
          <figure className="lab-cell">
            <div className="lab-cell-stage lab-cell-stage-tall">
              {ready ? (
                <StageView load={loadMorph} interactive state={morphState} onSelect={nextMorph} onReady={register('morph')} />
              ) : null}
            </div>
            <figcaption className="lab-cell-caption">
              <span>
                {SHAPES[((morph % SHAPES.length) + SHAPES.length) % SHAPES.length]} (click the figure for the next one)
              </span>
              <span>
                drawn <span data-renders="morph">0</span>
              </span>
            </figcaption>
          </figure>
        </div>

        <div id="paper">
          <div className="lab-bar">
            <h2 className="lab-label">Paper tone</h2>
          </div>
          <figure className="lab-cell lab-cell-paper">
            <div className="lab-cell-stage lab-cell-stage-tall">
              {ready ? <StageView load={loadPaper} tone="onPaper" interactive state={paperState} onReady={register('paper')} /> : null}
            </div>
            <figcaption className="lab-cell-caption">
              <span>globe, onPaper</span>
              <span>
                drawn <span data-renders="paper">0</span>
              </span>
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="lab-section lab-two" id="tests">
        <div>
          <div className="lab-bar">
            <h2 className="lab-label">Stroke, marker and label test card</h2>
          </div>
          <figure className="lab-cell">
            <div className="lab-cell-stage lab-cell-stage-tall" id="specimen">
              {ready ? <StageView load={loadSpecimen} onReady={register('specimen')} /> : null}
            </div>
            <figcaption className="lab-cell-caption">
              <span>1px, emphasis, 2px, dashes, reveal 0.62, 0.5px</span>
              <span>
                drawn <span data-renders="specimen">0</span>
              </span>
            </figcaption>
          </figure>
        </div>
        <div>
          <div className="lab-bar">
            <h2 className="lab-label">Near plane</h2>
          </div>
          <figure className="lab-cell">
            <div className="lab-cell-stage lab-cell-stage-tall" id="near">
              {ready ? <StageView load={loadNear} interactive onReady={register('near')} /> : null}
            </div>
            <figcaption className="lab-cell-caption">
              <span>camera inside the geometry</span>
              <span>
                drawn <span data-renders="near">0</span>
              </span>
            </figcaption>
          </figure>
        </div>
      </section>
    </main>
  )
}

function Stat({ name, label }: { name: string; label: string }) {
  return (
    <div className="lab-stat">
      <dt>{label}</dt>
      <dd data-stat={name}>0</dd>
    </div>
  )
}
