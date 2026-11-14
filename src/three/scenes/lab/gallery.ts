import type { Group } from 'three'
import { easeHero } from '../../core/anim'
import type { WireLines } from '../../core/lines'
import type { NodeSpec } from '../../core/nodes'
import {
  cone,
  fitToUnit,
  funnel,
  gitGraph,
  gitGraphNodes,
  globe,
  graph,
  graphNodes,
  helix,
  lattice,
  merge,
  planeGrid,
  ring,
  saddle,
  sheets,
  strata,
  sweep,
  torus,
  tree,
  treeNodes,
  waveSurface,
} from '../../core/shapes'
import type { Polyline, Vec3 } from '../../core/shapes'
import type { SceneFactory, StageContext } from '../../core/types'

/*
 * Lab gallery: one small on-demand stage per shape generator. Each rests in a tilted still pose, draws on
 * once when it first comes into view, and can be dragged. Nothing here moves on its own.
 */

interface Entry {
  /** Lines drawn at the default weight. */
  shape: () => Polyline[]
  /** Optional second set drawn dashed or emphasised. */
  accent?: () => Polyline[]
  accentDash?: boolean
  nodes?: () => NodeSpec[]
  /** Resting tilt in radians: [x, y]. */
  tilt?: [number, number]
  /** Radius to frame. Default 1.1. */
  radius?: number
}

const dots = (points: Vec3[], kind: NodeSpec['kind'] = 'dot'): NodeSpec[] => points.map((position) => ({ position, kind }))

export const GALLERY = {
  globe: { shape: () => globe(), tilt: [0.42, -0.5] },
  ring: {
    shape: () =>
      merge(
        ring({ radius: 1, inclination: 18, node: 20 }),
        ring({ radius: 0.82, inclination: 64, node: 110, eccentricity: 0.25 }),
        ring({ radius: 0.6, inclination: 128, node: 40 }),
      ),
    accent: () => ring({ radius: 0.96, inclination: 78, node: -30, eccentricity: 0.45, periapsis: 200 }),
    accentDash: true,
    tilt: [0.3, 0.2],
  },
  torus: { shape: () => torus(), tilt: [0.62, 0.3] },
  saddle: { shape: () => saddle(), tilt: [0.34, 0.68] },
  waveSurface: { shape: () => waveSurface({ cross: 9 }), tilt: [0.5, -0.5], radius: 1.15 },
  helix: { shape: () => helix(), tilt: [0.12, 0.4], radius: 1.05 },
  lattice: { shape: () => lattice(), tilt: [0.4, 0.62] },
  strata: { shape: () => strata(), tilt: [0.3, -0.55] },
  cone: { shape: () => cone(), tilt: [0.5, 0.3], radius: 1.2 },
  sweep: {
    shape: () => sweep(),
    nodes: () => dots([[-0.5, 0, -0.35], [0.1, 0, -0.62], [0.52, 0, -0.1], [-0.14, 0, 0.2]], 'ring'),
    tilt: [0.9, 0.35],
    radius: 1.15,
  },
  tree: { shape: () => tree(), nodes: () => dots(treeNodes().leaves.filter((_, i) => i % 5 === 0), 'ring'), tilt: [0.1, 0.5] },
  gitGraph: {
    shape: () => gitGraph(),
    nodes: () => {
      const g = gitGraphNodes()
      return [...dots(g.commits), ...dots(g.merges, 'ring'), ...dots(g.heads, 'ring')]
    },
    tilt: [0.18, -0.42],
    radius: 1.15,
  },
  funnel: { shape: () => funnel({ spokes: 12 }), nodes: () => dots([[0, -0.85, 0]]), tilt: [0.45, 0.3] },
  planeGrid: {
    shape: () => planeGrid({ part: 'grid' }),
    accent: () => planeGrid({ part: 'paths' }),
    tilt: [0.62, -0.62],
    radius: 1.35,
  },
  sheets: { shape: () => sheets({ rules: 6, fan: 4 }), tilt: [0.16, -0.55] },
  graph: {
    shape: () => graph(),
    nodes: () => graphNodes().map((position, i): NodeSpec => ({ position, kind: i % 5 === 0 ? 'ring' : 'dot' })),
    tilt: [0.2, 0.4],
  },
} satisfies Record<string, Entry>

export type GalleryName = keyof typeof GALLERY
export const GALLERY_NAMES = Object.keys(GALLERY) as GalleryName[]

/** The shape of a gallery entry, fitted to the unit sphere (the morph demo reuses these). */
export function galleryShape(name: GalleryName): Polyline[] {
  const entry: Entry = GALLERY[name]
  return fitToUnit(merge(entry.shape(), entry.accent ? entry.accent() : []))
}

export function shapeScene(name: GalleryName): SceneFactory {
  return () => {
    const entry: Entry = GALLERY[name]
    let group: Group
    let lines: WireLines
    let accent: WireLines | null = null
    const tilt = entry.tilt ?? [0.35, 0.5]

    return {
      init(ctx: StageContext) {
        group = ctx.group()
        lines = ctx.lines(entry.shape(), { parent: group, reveal: 0, revealStagger: 0.5 })
        if (entry.accent) {
          accent = ctx.lines(entry.accent(), {
            parent: group,
            reveal: 0,
            emphasis: entry.accentDash ? 0 : 1,
            dash: entry.accentDash ? { count: 48, ratio: 0.5 } : null,
            fade: false,
          })
        }
        if (entry.nodes) ctx.nodes(entry.nodes(), { parent: group })
      },
      resize(ctx: StageContext) {
        ctx.frame(entry.radius ?? 1.1, 0.9)
      },
      update(ctx: StageContext) {
        const t = ctx.intro(1.1, 0.1)
        lines.reveal = easeHero(t)
        if (accent) accent.reveal = easeHero(ctx.intro(1.1, 0.35))
        group.rotation.x = tilt[0] + ctx.drag.pitch
        group.rotation.y = tilt[1] + ctx.drag.yaw
        return ctx.intro(1.1, 0.35) < 1
      },
    }
  }
}
