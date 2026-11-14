import { Vector3 } from 'three'
import type { Group } from 'three'
import { clamp01, damp, ease, easeHero } from '../../core/anim'
import type { WireLabel } from '../../core/labels'
import type { WireLines } from '../../core/lines'
import type { NodeSpec, WireNodes } from '../../core/nodes'
import type { Occluder } from '../../core/occluder'
import { visibleArc } from '../../core/orbits'
import type { VisibleArc } from '../../core/orbits'
import { dwell, globe, orbitPoint, orbitToward, ring, trueAnomaly } from '../../core/shapes'
import type { OrbitElements } from '../../core/shapes'
import type { HitId, SceneFactory, StageContext, StageState } from '../../core/types'
import { DWELL_SHARE, ORBIT_PERIOD, PRESETS, solveCamera } from './orbitConfig'
import type { OrbitPreset, PresetName } from './orbitConfig'

/*
 * Lab orbit plot (live): the prototype of the hero's signature scene.
 *
 * State in: { satellites: Satellite[], focus: string | null, globe: 'solid' | 'lattice', view: 'dome' | 'low' }.
 * (`view` is read once, at mount.) Hit ids out: the satellite's id, from its marker or its label.
 *
 * The globe turns once every 90 seconds and can be spun by dragging; the orbits stay put, as real orbital
 * planes do while a planet turns beneath them, so the chart keeps its composition whatever the visitor does.
 */

export interface Satellite {
  id: string
  /** Label text. */
  short: string
  /** Muted second part of the label. */
  year: string
  status: 'incoming' | 'current' | 'past'
}

const TAU = Math.PI * 2
const GLOBE_PERIOD = 90
/** Seconds: lines draw on, then markers and labels arrive. */
const DRAW = 1.4
const ARRIVE = 0.7

interface Sat {
  data: Satellite
  orbit: number
  phase: number
  /** Marker indices that belong to this satellite. */
  markers: number[]
  label: WireLabel | null
  /** 0..1 eased emphasis and dimming. */
  emphasis: number
  dim: number
}

const scene: SceneFactory = () => {
  let preset: OrbitPreset = PRESETS.dome
  let elements: Required<OrbitElements>[] = []
  let arcs: (VisibleArc | null)[] = []
  const sats: Sat[] = []
  const position = new Vector3()

  let lean: Group
  let spin: Group
  let globeLines: WireLines
  let orbitLines: WireLines[] = []
  let nodes: WireNodes
  let occluder: Occluder
  let solid = true
  let solidity = 1

  const focusOf = (ctx: StageContext): HitId | null => {
    const pushed = ctx.state.focus
    return typeof pushed === 'string' ? pushed : ctx.hover
  }

  const place = (sat: Sat, time: number): void => {
    const el = elements[sat.orbit]!
    const arc = arcs[sat.orbit]
    const phase = sat.phase + time / ORBIT_PERIOD
    // Linger on the arc that is in view; without one, plain Kepler motion.
    const mean = arc ? dwell(phase, arc.from, arc.to, DWELL_SHARE) : TAU * phase
    orbitPoint(position, el, trueAnomaly(mean, el.eccentricity))
    for (const m of sat.markers) nodes.setPosition(m, position.x, position.y, position.z)
  }

  return {
    init(ctx) {
      const list = Array.isArray(ctx.state.satellites) ? (ctx.state.satellites as Satellite[]) : []
      const view = ctx.state.view
      preset = PRESETS[typeof view === 'string' && view in PRESETS ? (view as PresetName) : 'dome']
      elements = preset.orbits.map((o) => ({
        radius: o.radius,
        eccentricity: o.eccentricity ?? 0,
        inclination: o.inclination ?? 0,
        node: o.node ?? 0,
        periapsis: o.periapsis ?? 0,
        ...(o.aim ? orbitToward(o.aim.far, o.aim.roll) : null),
      }))
      solid = ctx.state.globe !== 'lattice'
      solidity = solid ? 1 : 0
      occluder = ctx.occluder(1)

      // The globe leans toward the camera so its pole sits just inside the horizon. Only the band of
      // latitudes that can come into view is built.
      const g = preset.globe
      lean = ctx.group()
      lean.rotation.set(g.lean[0], 0, g.lean[1])
      spin = ctx.group(lean)
      // The longest meridians stop on the last parallel, so the pole is a clean ring rather than a knot.
      const capLatitude = 90 - 180 / (g.parallels + 1)
      globeLines = ctx.lines(globe({ meridians: g.meridians, parallels: g.parallels, segments: g.segments, south: g.south, north: g.north, capLatitude }), {
        parent: spin,
        occluder,
        reveal: 0,
        revealStagger: 0.7,
      })

      orbitLines = preset.orbits.map((o, i) =>
        ctx.lines(ring({ ...elements[i]!, segments: 320, phase: 180 }), {
          occluder,
          reveal: 0,
          dash: o.dashed ? [7, 6] : null,
        }),
      )

      // Satellites: the incoming role rides the dashed orbit; the rest fill the slots in order.
      const specs: NodeSpec[] = []
      let slot = 0
      for (const data of list) {
        const where = data.status === 'incoming' ? preset.incoming : preset.slots[slot++ % preset.slots.length]!
        const sat: Sat = { data, orbit: where.orbit, phase: where.phase, markers: [], label: null, emphasis: 0, dim: 0 }
        if (data.status === 'incoming') {
          sat.markers.push(specs.push({ position: [0, 0, 0], kind: 'dashedRing', radius: 6, opacity: 0 }) - 1)
        } else if (data.status === 'current') {
          sat.markers.push(specs.push({ position: [0, 0, 0], kind: 'ring', radius: 7, opacity: 0 }) - 1)
          sat.markers.push(specs.push({ position: [0, 0, 0], kind: 'dot', radius: 3, opacity: 0 }) - 1)
        } else {
          sat.markers.push(specs.push({ position: [0, 0, 0], kind: 'dot', radius: 2.5, opacity: 0 }) - 1)
        }
        sats.push(sat)
      }
      nodes = ctx.nodes(specs, { occluder, halo: 3 })
      for (const sat of sats) {
        sat.label = ctx.labels.add({
          text: sat.data.short,
          sub: sat.data.year,
          id: sat.data.id,
          node: { nodes, index: sat.markers[0]! },
          gap: sat.data.status === 'past' ? 8 : 12,
          priority: sat.data.status === 'current' ? 2 : sat.data.status === 'incoming' ? 1 : 0,
        })
        sat.label.opacity = 0
      }
    },

    resize(ctx) {
      // Aim the camera so the horizon sits where the composition wants it at this aspect ratio.
      const cam = solveCamera(ctx.size.aspect, preset.composition)
      ctx.camera.fov = cam.fov
      ctx.camera.position.set(0, 0, cam.distance)
      ctx.camera.rotation.set(cam.pitch, 0, 0)
      ctx.camera.updateProjectionMatrix()

      // One depth cue for everything: the nearest ground is front, the far ends of the orbits are back.
      const limb = Math.sqrt(cam.distance * cam.distance - 1)
      const nearest = cam.distance - 1
      let reach = 1
      for (const el of elements) reach = Math.max(reach, el.radius * (1 + el.eccentricity))
      globeLines.fade = [nearest + 0.3 * (limb - nearest), limb + 0.45 * (limb - nearest)]
      for (const l of orbitLines) l.fade = [limb * 0.92, cam.distance + reach * 0.8]

      // Where each orbit can be seen at this stage size; the satellites linger there (see dwell in shapes.ts).
      const inset = { left: 16, right: 16, top: 16, bottom: ctx.size.height * 0.16 }
      arcs = elements.map((el) => visibleArc(ctx, el, { occluder, inset }))
    },

    onState(ctx, patch: StageState) {
      if (patch.globe !== undefined) solid = patch.globe !== 'lattice'
      ctx.invalidate()
    },

    update(ctx, time, dt) {
      let moving = false

      // Load: the globe draws on first, the orbits follow, then the satellites arrive.
      const drawn = ctx.intro(DRAW)
      globeLines.reveal = easeHero(drawn)
      for (let i = 0; i < orbitLines.length; i++) orbitLines[i]!.reveal = ease(ctx.intro(DRAW * 0.8, 0.35 + i * 0.12))
      const arriving = ctx.intro(ARRIVE, DRAW * 0.75)
      const arrived = ease(arriving)
      if (arriving < 1) moving = true

      // Solid globe (far side hidden) or see-through lattice: eased so the two can be compared in place.
      const solidTarget = solid ? 1 : 0
      if (solidity !== solidTarget) {
        solidity = ctx.reducedMotion ? solidTarget : damp(solidity, solidTarget, 0.12, dt)
        moving = true
      }
      globeLines.occlusion = solidity
      const behind = 0.72 + 0.28 * solidity
      for (const l of orbitLines) l.occlusion = behind
      nodes.occlusion = behind

      spin.rotation.y = (time / GLOBE_PERIOD) * TAU + ctx.drag.yaw
      lean.rotation.x = preset.globe.lean[0] + ctx.drag.pitch * 0.5

      // Focus: the satellite under the pointer (or pushed in from the page) comes forward, the rest step back.
      const focus = focusOf(ctx)
      for (let i = 0; i < sats.length; i++) {
        const sat = sats[i]!
        place(sat, time)
        const on = focus === sat.data.id
        const off = focus !== null && !on
        const e = ctx.reducedMotion ? (on ? 1 : 0) : damp(sat.emphasis, on ? 1 : 0, on ? 0.05 : 0.11, dt)
        const d = ctx.reducedMotion ? (off ? 1 : 0) : damp(sat.dim, off ? 1 : 0, 0.11, dt)
        if (e !== sat.emphasis || d !== sat.dim) moving = true
        sat.emphasis = e
        sat.dim = d
        for (const m of sat.markers) {
          nodes.setEmphasis(m, e)
          nodes.setOpacity(m, arrived * (1 - 0.45 * d))
        }
        if (sat.label) {
          sat.label.emphasis = on
          sat.label.opacity = clamp01(arrived * 1.2)
        }
      }
      for (let i = 0; i < orbitLines.length; i++) {
        let e = 0
        for (const sat of sats) if (sat.orbit === i) e = Math.max(e, sat.emphasis)
        orbitLines[i]!.emphasis = e * 0.55
      }
      return moving || drawn < 1
    },

    hit(ctx, x, y) {
      const marker = nodes.pick(ctx, x, y, 10)
      if (marker >= 0) {
        for (const sat of sats) if (sat.markers.includes(marker)) return sat.data.id
      }
      return ctx.labels.pick(x, y)
    },
  }
}

export default scene
