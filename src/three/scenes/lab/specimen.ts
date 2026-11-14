import { ring } from '../../core/shapes'
import type { Polyline } from '../../core/shapes'
import type { SceneFactory } from '../../core/types'

/*
 * Lab test card: every stroke style, marker kind and label side in one still frame, facing the camera, so
 * hairline weight, dash edges and marker crispness can be judged at DPR 1 and 2.
 */

const arc = (radius: number): Polyline[] => ring({ radius, inclination: 90, segments: 160, arc: 0.74, phase: 133 })

const scene: SceneFactory = () => ({
  init(ctx) {
    // Arcs from the outside in: 1px, emphasis, 2px, pixel dashes, counted dashes, a partial reveal, 0.5px.
    ctx.lines(arc(1.0), { fade: false })
    ctx.lines(arc(0.9), { fade: false, emphasis: 1 })
    ctx.lines(arc(0.8), { fade: false, width: 2 })
    ctx.lines(arc(0.7), { fade: false, dash: [6, 5] })
    ctx.lines(arc(0.6), { fade: false, dash: { count: 36, ratio: 0.5 } })
    ctx.lines(arc(0.5), { fade: false, reveal: 0.62 })
    ctx.lines(arc(0.4), { fade: false, width: 0.5 })
    // Straight strokes at shallow angles: the hardest case for even weight.
    ctx.lines(
      [
        [
          [-1.02, -0.78, 0],
          [1.02, -0.72, 0],
        ],
        [
          [-1.02, -0.86, 0],
          [1.02, -0.86, 0],
        ],
        [
          [-1.02, -0.94, 0],
          [1.02, -1.0, 0],
        ],
      ],
      { fade: false },
    )

    const row = (y: number, opacity: number, emphasis: number) =>
      (['dot', 'ring', 'dashedRing'] as const).map((kind, i) => ({ position: [-0.16 + i * 0.16, y, 0] as [number, number, number], kind, opacity, emphasis }))
    const nodes = ctx.nodes([...row(0.14, 1, 0), ...row(0, 1, 1), ...row(-0.14, 0.45, 0)])

    ctx.labels.add({ text: 'Right', sub: '2026', node: { nodes, index: 2 }, side: 'right' })
    ctx.labels.add({ text: 'Left', sub: '2025', node: { nodes, index: 0 }, side: 'left' })
    ctx.labels.add({ text: 'Top', node: { nodes, index: 1 }, side: 'top' })
    ctx.labels.add({ text: 'Bottom', node: { nodes, index: 7 }, side: 'bottom' })
  },
  resize(ctx) {
    ctx.frame(1.08, 0.94)
  },
})

export default scene
