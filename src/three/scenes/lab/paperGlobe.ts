import type { Group } from 'three'
import { easeHero } from '../../core/anim'
import type { WireLines } from '../../core/lines'
import { globe, globePoint } from '../../core/shapes'
import type { SceneFactory } from '../../core/types'

/*
 * Lab: a globe in the 'onPaper' tone (ink strokes read from the --wire-*-ink tokens), with one ringed,
 * labelled point. See-through lattice with depth fade: on paper the far side reads as a lighter pencil line.
 * This is the reference for the contact panel's globe. It rests still, draws on once, and can be dragged.
 */

/** San Francisco. */
const LATITUDE = 37.77
const LONGITUDE = -122.42

const scene: SceneFactory = () => {
  let group: Group
  let lines: WireLines
  const place = globePoint(LATITUDE, LONGITUDE)
  // Turn the globe so the point faces the camera, a little left of centre.
  const facing = Math.atan2(-place[0], place[2]) - 0.42

  return {
    init(ctx) {
      group = ctx.group()
      lines = ctx.lines(globe({ meridians: 24, parallels: 11, segments: 128 }), { parent: group, reveal: 0, revealStagger: 0.6 })
      const occluder = ctx.occluder(1, group)
      const nodes = ctx.nodes(
        [
          { position: place, kind: 'ring', radius: 6 },
          { position: place, kind: 'dot', radius: 2 },
        ],
        { parent: group, occluder, occlusion: 0.75 },
      )
      const text = typeof ctx.state.label === 'string' ? ctx.state.label : ''
      if (text) ctx.labels.add({ text, node: { nodes, index: 0 }, side: 'right', gap: 10 })
    },
    resize(ctx) {
      ctx.frame(1, 0.92)
    },
    update(ctx) {
      lines.reveal = easeHero(ctx.intro(1.3, 0.1))
      group.rotation.x = 0.38 + ctx.drag.pitch
      group.rotation.y = facing + ctx.drag.yaw
      return ctx.intro(1.3, 0.1) < 1
    },
  }
}

export default scene
