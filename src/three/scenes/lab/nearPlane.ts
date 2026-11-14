import type { Group } from 'three'
import { helix, lattice, merge, transform } from '../../core/shapes'
import type { SceneFactory } from '../../core/types'

/*
 * Lab near-plane test: the camera sits inside the geometry, so many segments start behind the camera or
 * cross the near plane. Correct output is ordinary lines running off the edges of the frame. A wrong
 * near-plane path shows as streaks across the whole stage or missing lines. Drag to look around.
 */

const scene: SceneFactory = () => {
  let group: Group
  return {
    init(ctx) {
      group = ctx.group()
      const tunnel = transform(helix({ radius: 0.7, height: 9, turns: 7, rungs: 0, segments: 420 }), { rotate: [90, 0, 0] })
      ctx.lines(merge(lattice({ size: [3.2, 3.2, 9], cells: [4, 4, 9] }), tunnel), { parent: group, fade: [0.05, 5] })
    },
    resize(ctx) {
      ctx.camera.position.set(0.18, 0.12, 0.4)
      ctx.camera.lookAt(0, 0, -4)
      ctx.camera.fov = 62
      ctx.camera.updateProjectionMatrix()
    },
    update(ctx) {
      group.rotation.y = ctx.drag.yaw
      group.rotation.x = ctx.drag.pitch
    },
  }
}

export default scene
