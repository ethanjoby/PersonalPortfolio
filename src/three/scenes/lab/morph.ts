import type { Group } from 'three'
import { DUR, Tween, ease } from '../../core/anim'
import type { WireLines } from '../../core/lines'
import { matchFigure, morphFigure, toFigure } from '../../core/shapes'
import type { SceneFactory, StageContext, StageState } from '../../core/types'
import { GALLERY_NAMES, galleryShape } from './gallery'

/*
 * Lab morph demo: one set of lines that eases between every figure. Clicking the stage (or pushing
 * state.index from React) moves to the next one. This is the reference for the experience section's figure.
 *
 * How it stays readable: every figure is resampled to the same rows x points, and before each transition
 * `matchFigure` pairs each line with the nearest line of the target, so lines travel instead of crossing.
 * Under reduced motion nothing travels: the shape fades out, swaps, and fades back in.
 */

const ROWS = 48
const POINTS = 40
/** Share of the duration spent staggering the rows. */
const SPREAD = 0.3

export const MORPH_NAMES = GALLERY_NAMES

const scene: SceneFactory = () => {
  const figures = MORPH_NAMES.map((name) => toFigure(galleryShape(name), ROWS, POINTS))
  let group: Group
  let lines: WireLines
  let from = figures[0]!
  let to = figures[0]!
  let index = 0
  const progress = new Tween(1)
  const fade = new Tween(1)
  let pendingSwap = false

  const go = (ctx: StageContext, next: number): void => {
    const count = figures.length
    const target = figures[((next % count) + count) % count]!
    index = next
    if (ctx.reducedMotion) {
      // No travel: fade out, swap at the bottom, fade in. 250ms in total.
      to = target
      pendingSwap = true
      fade.to(0, 0.12, ease)
      return
    }
    // Start from wherever the lines are now, so an interrupted morph never jumps.
    from = lines.positions.slice()
    to = matchFigure(from, target, ROWS, POINTS)
    progress.set(0)
    progress.to(1, DUR.standard + 0.2, (t) => t)
  }

  return {
    init(ctx) {
      group = ctx.group()
      index = typeof ctx.state.index === 'number' ? ctx.state.index : 0
      const first = figures[((index % figures.length) + figures.length) % figures.length]!
      from = first
      to = first
      lines = ctx.lines({ figure: first, rows: ROWS, points: POINTS }, { parent: group })
    },
    resize(ctx) {
      ctx.frame(1.1, 0.9)
    },
    onState(ctx, patch: StageState) {
      if (typeof patch.index === 'number' && patch.index !== index) go(ctx, patch.index)
    },
    update(ctx, _time, dt) {
      let moving = false
      if (progress.active) {
        moving = progress.step(dt)
        // Writes straight into the GPU buffer's array: no allocation, no rebuild.
        morphFigure(lines.positions, from, to, progress.value, ROWS, SPREAD, ease)
        lines.commit()
      }
      if (fade.active && fade.step(dt)) moving = true
      if (pendingSwap && fade.value === 0) {
        pendingSwap = false
        lines.setPositions(to)
        from = to
        fade.to(1, 0.13, ease)
        moving = true
      }
      lines.opacity = fade.value
      group.rotation.x = 0.36 + ctx.drag.pitch
      group.rotation.y = 0.5 + ctx.drag.yaw
      return moving
    },
    hit() {
      // The whole stage is one target: a click asks for the next figure.
      return 'next'
    },
  }
}

export default scene
