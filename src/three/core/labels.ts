import { Vector3 } from 'three'
import type { WireNodes } from './nodes'
import { eyeOf } from './occluder'
import type { Occluder } from './occluder'
import type { Vec3, XYZ } from './shapes'
import type { HitId, ScreenPoint, StageContext } from './types'

/*
 * The DOM label layer. Labels are real text elements (crisp at any DPR, selectable by nothing: the layer is
 * aria-hidden because the same facts live in the page's own markup) positioned every drawn frame with a
 * transform computed from projected coordinates.
 *
 * - No layout reads in the frame loop: sizes are measured once when a label is added or its text changes.
 * - A greedy collision pass (highest priority first) keeps labels off each other, off every marker, off the
 *   stage edge and off any "avoid" rectangles. A label that cannot be placed fades out.
 * - A label keeps the side it is on until that side stops fitting, so nothing flickers; when it must change
 *   side it fades out, swaps, and fades in.
 * - Opacity never rests below the text contrast floor: a label is either readable or gone.
 */

export type LabelSide = 'right' | 'left' | 'top' | 'bottom'

export interface LabelSpec {
  /** Main text (rendered uppercase mono). */
  text: string
  /** Secondary text in a muted tone, after the main text (a year, a unit). */
  sub?: string
  /** Returned by `labels.pick()` so a label works as a hit target for its point. */
  id?: HitId
  /** World position. Or attach to a marker with `node`, and the label follows it. */
  position?: Vec3 | XYZ
  node?: { nodes: WireNodes; index: number }
  /** Preferred side of the point. Default 'right'. */
  side?: LabelSide
  /** Sides the label may move to when its preferred side is taken. Default all four. */
  sides?: LabelSide[]
  /** CSS pixels between the point and the start of the leader line. Default 9. */
  gap?: number
  /** Length of the leader line in CSS pixels; 0 for none. Default 12. */
  leader?: number
  /** Higher wins a collision. Emphasised labels always win. Default 0. */
  priority?: number
  /** Sphere to test against. Defaults to the attached markers' occluder. */
  occluder?: Occluder | null
  /** What happens behind the occluder: 'hide' (default) or 'dim' (drops to the contrast floor). */
  occluded?: 'hide' | 'dim'
}

export interface AvoidRect {
  /** CSS pixels from the stage's top left corner. */
  x: number
  y: number
  width: number
  height: number
}

/** Lowest resting opacity of a visible label. Keeps 11px text above 4.5:1 on both tones. */
const DIM_FLOOR = 0.85
const LEADER_PAD = 4
const EDGE = 4
const BOX_PAD = 3
const ANCHOR = 7
const FADE_SECONDS = 0.06
/** Extra clearance, in CSS pixels, a label needs before it takes a new place. */
const SPARE = 8
const ALL_SIDES: LabelSide[] = ['right', 'left', 'top', 'bottom']

const _screen: ScreenPoint = { x: 0, y: 0, depth: 0, visible: false }
const _eye = new Vector3()
const _delta = new Vector3()

export class WireLabel {
  /** World position. Written by the layer when the label is attached to a marker; otherwise yours to move. */
  readonly position = new Vector3()
  id: HitId | null
  /** Bright "now" state: full white text, and it wins collisions. */
  emphasis = false
  /** 0..1 multiplier, for fading a label in with an intro. Values between 0 and 1 are meant to be transient. */
  opacity = 1
  /** Take the label off without removing it. */
  hidden = false
  priority: number

  /** @internal */ readonly el: HTMLDivElement
  /** @internal */ readonly textEl: HTMLSpanElement
  /** @internal */ subEl: HTMLSpanElement | null = null
  /** @internal */ readonly node: { nodes: WireNodes; index: number } | null
  /** @internal */ readonly occluder: Occluder | null
  /** @internal */ readonly occludedMode: 'hide' | 'dim'
  /** @internal */ readonly preferred: LabelSide
  /** @internal */ readonly sides: LabelSide[]
  /** @internal */ readonly gap: number
  /** @internal */ readonly leader: number
  /** @internal */ side: LabelSide
  /** @internal */ w = 0
  /** @internal */ h = 0
  /** @internal */ sx = 0
  /** @internal */ sy = 0
  /** @internal */ depth = 0
  /** @internal */ front = false
  /** @internal */ vis = 1
  /** @internal */ shown = false
  /** @internal */ nextSide: LabelSide
  /** @internal */ alpha = 0
  /** @internal */ x = 0
  /** @internal */ y = 0
  /** @internal */ lastX = NaN
  /** @internal */ lastY = NaN
  /** @internal */ lastAlpha = -1
  /** @internal */ lastOn = false
  /** @internal */ measured = false

  private readonly layer: LabelLayer

  /** @internal */
  constructor(layer: LabelLayer, spec: LabelSpec) {
    this.layer = layer
    this.id = spec.id ?? null
    this.priority = spec.priority ?? 0
    this.node = spec.node ?? null
    this.occluder = spec.occluder === undefined ? (spec.node?.nodes.occluder ?? null) : spec.occluder
    this.occludedMode = spec.occluded ?? 'hide'
    this.preferred = spec.side ?? 'right'
    this.sides = spec.sides ?? ALL_SIDES
    this.gap = spec.gap ?? 9
    this.leader = spec.leader ?? 12
    this.side = this.preferred
    this.nextSide = this.preferred
    const p = spec.position
    if (p) {
      if (Array.isArray(p)) this.position.set(p[0], p[1], p[2])
      else this.position.set(p.x, p.y, p.z)
    }

    const el = document.createElement('div')
    el.className = 'stageview-label'
    el.dataset.side = this.side
    el.style.setProperty('--leader', `${this.leader}px`)
    if (this.leader > 0) {
      const line = document.createElement('i')
      line.className = 'stageview-label-leader'
      el.appendChild(line)
    }
    const text = document.createElement('span')
    text.className = 'stageview-label-text'
    text.textContent = spec.text
    el.appendChild(text)
    this.el = el
    this.textEl = text
    if (spec.sub) this.setSub(spec.sub)
  }

  /** Change the text. Sizes are re-measured before the next frame. */
  setText(text: string, sub?: string): void {
    this.textEl.textContent = text
    this.setSub(sub ?? '')
    this.measured = false
    this.layer.requestMeasure()
  }

  private setSub(sub: string): void {
    if (!sub) {
      this.subEl?.remove()
      this.subEl = null
      return
    }
    if (!this.subEl) {
      this.subEl = document.createElement('span')
      this.subEl.className = 'stageview-label-sub'
      this.el.appendChild(this.subEl)
    }
    this.subEl.textContent = sub
  }

  /** Remove the label from the layer. */
  remove(): void {
    this.layer.remove(this)
  }
}

export class LabelLayer {
  /**
   * Optional depth cue: `[near, far]` distances from the camera in world units. Labels ease from full opacity at
   * `near` to the contrast floor at `far`. Off by default.
   */
  depthRange: [number, number] | null = null

  private readonly el: HTMLDivElement
  private readonly labels: WireLabel[] = []
  private order: WireLabel[] = []
  private avoidRects: AvoidRect[] = []
  private metricsDirty = false
  private readonly onMeasureNeeded: () => void

  /** @internal */
  constructor(container: HTMLElement, live: boolean, onMeasureNeeded: () => void) {
    const el = document.createElement('div')
    el.className = 'stageview-labels'
    el.setAttribute('aria-hidden', 'true')
    if (live) el.dataset.live = 'true'
    container.appendChild(el)
    this.el = el
    this.onMeasureNeeded = onMeasureNeeded
  }

  /** Add a label. It fades in on the next drawn frame. */
  add(spec: LabelSpec): WireLabel {
    const label = new WireLabel(this, spec)
    this.labels.push(label)
    this.order.push(label)
    this.el.appendChild(label.el)
    this.requestMeasure()
    return label
  }

  remove(label: WireLabel): void {
    const i = this.labels.indexOf(label)
    if (i < 0) return
    this.labels.splice(i, 1)
    this.order = this.labels.slice()
    label.el.remove()
    this.onMeasureNeeded()
  }

  clear(): void {
    for (const l of this.labels) l.el.remove()
    this.labels.length = 0
    this.order.length = 0
  }

  get count(): number {
    return this.labels.length
  }

  /** Rectangles (stage CSS pixels) that labels must stay out of, for example the area behind a headline. */
  avoid(rects: AvoidRect[]): void {
    this.avoidRects = rects.slice()
    this.onMeasureNeeded()
  }

  /** The id of the label under a point in stage CSS pixels, or null. Lets a label act as its marker's hit area. */
  pick(x: number, y: number): HitId | null {
    for (const l of this.order) {
      if (l.id === null || l.alpha < 0.3 || !l.shown) continue
      if (x >= l.x - BOX_PAD && x <= l.x + l.w + BOX_PAD && y >= l.y - BOX_PAD && y <= l.y + l.h + BOX_PAD) return l.id
    }
    return null
  }

  /** @internal Called by labels when their text changes. */
  requestMeasure(): void {
    this.metricsDirty = true
    this.onMeasureNeeded()
  }

  /** @internal Read label sizes. Runs only after labels were added or changed, a resize, or a font load. */
  measure(): void {
    this.metricsDirty = false
    const labels = this.labels
    for (const l of labels) {
      l.w = l.el.offsetWidth
      l.h = l.el.offsetHeight
    }
    for (const l of labels) {
      l.measured = true
      // Leader offsets in whole pixels, so the 1px leader never lands on a half pixel.
      l.el.style.setProperty('--ly', `${Math.floor(l.h / 2)}px`)
      l.el.style.setProperty('--lx', `${Math.floor(l.w / 2)}px`)
    }
  }

  /** @internal Mark sizes stale (the stage calls this on resize and when fonts finish loading). */
  invalidateMetrics(): void {
    this.metricsDirty = true
  }

  /**
   * @internal Project, resolve collisions, and write transforms. Returns true while any label is still fading.
   */
  update(ctx: StageContext, dt: number): boolean {
    const labels = this.labels
    const n = labels.length
    if (n === 0) return false
    if (this.metricsDirty) this.measure()

    const W = ctx.size.width
    const H = ctx.size.height
    const dpr = ctx.size.dpr
    _eye.copy(eyeOf(ctx.camera))
    const range = this.depthRange

    for (let i = 0; i < n; i++) {
      const l = labels[i]!
      if (l.node) l.node.nodes.getWorld(l.node.index, l.position)
      ctx.project(l.position, _screen)
      l.sx = _screen.x
      l.sy = _screen.y
      l.depth = _screen.depth
      l.front = _screen.visible
      let vis = 1
      if (l.occluder && l.front) {
        const soft = ctx.worldPerPx(_delta.subVectors(l.position, _eye).length()) * 14
        const strength = l.node ? l.node.nodes.occlusion : 1
        vis = 1 - strength * l.occluder.occlusion(l.position, _eye, soft)
      }
      l.vis = vis
    }

    // Order: emphasised first, then priority, then nearest. Insertion sort: tiny, stable, no allocation.
    const order = this.order
    for (let i = 1; i < order.length; i++) {
      const l = order[i]!
      let j = i - 1
      while (j >= 0 && before(l, order[j]!)) {
        order[j + 1] = order[j]!
        j--
      }
      order[j + 1] = l
    }

    let animating = false
    for (let i = 0; i < order.length; i++) {
      const l = order[i]!
      let shown = false
      const candidate =
        !l.hidden && l.front && l.measured && l.w > 0 && l.opacity > 0.01 && !(l.occludedMode === 'hide' && l.vis < 0.5)
      if (candidate && l.sx >= -EDGE && l.sx <= W + EDGE && l.sy >= -EDGE && l.sy <= H + EDGE) {
        // Staying needs only to fit; taking a new place needs room to spare, so a label does not settle
        // somewhere it will be squeezed out of a moment later. A label that is not showing yet takes a roomy
        // place if there is one, and otherwise any place that fits.
        const settled = l.alpha > 0.04
        shown = settled ? this.choose(l, i, W, H, 0, SPARE) : this.choose(l, i, W, H, SPARE, SPARE) || this.choose(l, i, W, H, 0, 0)
      }
      l.shown = shown

      let target = 0
      if (shown) {
        let depthFactor = 1
        if (range) {
          const t = (l.depth - range[0]) / Math.max(range[1] - range[0], 1e-6)
          depthFactor = 1 - (1 - DIM_FLOOR) * (t < 0 ? 0 : t > 1 ? 1 : t)
        }
        const occ = l.occludedMode === 'dim' ? DIM_FLOOR + (1 - DIM_FLOOR) * l.vis : l.vis
        target = l.opacity * depthFactor * occ
        if (l.nextSide !== l.side) {
          // Change side while invisible.
          if (l.alpha > 0.04) {
            target = 0
          } else {
            l.side = l.nextSide
            l.el.dataset.side = l.side
          }
        }
      }

      if (dt > 0 && l.alpha !== target) {
        const next = l.alpha + (target - l.alpha) * (1 - Math.exp(-dt / FADE_SECONDS))
        l.alpha = Math.abs(target - next) < 0.01 ? target : next
      }
      if (l.alpha !== target) animating = true

      // Position for the side it is on now; snapped to device pixels so the text stays sharp.
      place(l, l.side)
      const x = Math.round(l.x * dpr) / dpr
      const y = Math.round(l.y * dpr) / dpr
      if (l.alpha > 0 || l.lastAlpha > 0) {
        if (x !== l.lastX || y !== l.lastY) {
          l.el.style.transform = `translate(${x}px,${y}px)`
          l.lastX = x
          l.lastY = y
        }
      }
      const a = Math.round(l.alpha * 50) / 50
      if (a !== l.lastAlpha) {
        l.el.style.opacity = String(a)
        l.lastAlpha = a
      }
      if (l.emphasis !== l.lastOn) {
        l.el.classList.toggle('is-on', l.emphasis)
        l.lastOn = l.emphasis
      }
    }
    return animating
  }

  /** Pick a side: the one it is on first (so it stays put), then its preferred side, then the others. */
  private choose(l: WireLabel, orderIndex: number, W: number, H: number, stay: number, move: number): boolean {
    if (this.fits(l, l.side, orderIndex, W, H, stay)) {
      l.nextSide = l.side
      return true
    }
    if (l.preferred !== l.side && this.fits(l, l.preferred, orderIndex, W, H, move)) {
      l.nextSide = l.preferred
      return true
    }
    for (let s = 0; s < l.sides.length; s++) {
      const side = l.sides[s]!
      if (side === l.side || side === l.preferred) continue
      if (this.fits(l, side, orderIndex, W, H, move)) {
        l.nextSide = side
        return true
      }
    }
    return false
  }

  private fits(l: WireLabel, side: LabelSide, orderIndex: number, W: number, H: number, spare: number): boolean {
    place(l, side)
    const x0 = l.x - BOX_PAD - spare
    const y0 = l.y - BOX_PAD - spare
    const x1 = l.x + l.w + BOX_PAD + spare
    const y1 = l.y + l.h + BOX_PAD + spare
    if (l.x < EDGE || l.y < EDGE || l.x + l.w > W - EDGE || l.y + l.h > H - EDGE) return false
    const order = this.order
    // Labels already placed this frame (everything earlier in the order that is shown).
    for (let j = 0; j < orderIndex; j++) {
      const o = order[j]!
      if (!o.shown) continue
      const side0 = o.x
      if (x0 < side0 + o.w && x1 > side0 && y0 < o.y + o.h && y1 > o.y) return false
    }
    // Every other label's point: text never sits on a marker.
    for (let j = 0; j < order.length; j++) {
      const o = order[j]!
      if (o === l || !o.front || o.hidden) continue
      if (x0 < o.sx + ANCHOR && x1 > o.sx - ANCHOR && y0 < o.sy + ANCHOR && y1 > o.sy - ANCHOR) return false
    }
    const avoid = this.avoidRects
    for (let j = 0; j < avoid.length; j++) {
      const r = avoid[j]!
      if (x0 < r.x + r.width && x1 > r.x && y0 < r.y + r.height && y1 > r.y) return false
    }
    return true
  }

  /** @internal */
  dispose(): void {
    this.clear()
    this.el.remove()
  }
}

function before(a: WireLabel, b: WireLabel): boolean {
  if (a.emphasis !== b.emphasis) return a.emphasis
  if (a.priority !== b.priority) return a.priority > b.priority
  return a.depth < b.depth - 1e-4
}

/** Write the label's top left corner for a side into l.x, l.y. */
function place(l: WireLabel, side: LabelSide): void {
  const reach = l.gap + l.leader + (l.leader > 0 ? LEADER_PAD : 0)
  if (side === 'right') {
    l.x = l.sx + reach
    l.y = l.sy - (Math.floor(l.h / 2) + 0.5)
  } else if (side === 'left') {
    l.x = l.sx - reach - l.w
    l.y = l.sy - (Math.floor(l.h / 2) + 0.5)
  } else if (side === 'top') {
    l.x = l.sx - (Math.floor(l.w / 2) + 0.5)
    l.y = l.sy - reach - l.h
  } else {
    l.x = l.sx - (Math.floor(l.w / 2) + 0.5)
    l.y = l.sy + reach
  }
}
