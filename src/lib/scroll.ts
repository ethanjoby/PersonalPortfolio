/*
 * Scroll progress: one passive scroll listener, read in requestAnimationFrame, for the whole page.
 *
 * Subscribers get a 0 to 1 progress for their element and write it straight to the DOM (a custom
 * property, a class). No React state, no layout thrash: every frame reads all rectangles first,
 * then calls back. Nothing runs while the page is not scrolling or resizing. Client only.
 */

export interface ProgressOptions {
  /** Viewport fraction (0 = top, 1 = bottom) where the element's TOP edge sits at progress 0. Default 0.9. */
  start?: number
  /** Viewport fraction where the element's BOTTOM edge sits at progress 1. Default 0.5. */
  end?: number
}

export type ProgressCallback = (progress: number, el: Element) => void

interface Subscriber {
  callback: ProgressCallback
  start: number
  end: number
  /** Last value delivered; -1 before the first delivery. */
  last: number
}

const subscribers = new Map<Element, Subscriber>()
/** Scratch lists reused every frame, so a scroll frame allocates nothing. */
const changedEls: Element[] = []
const changedValues: number[] = []
let frame = 0
let listening = false

function progressOf(top: number, height: number, viewport: number, remaining: number, sub: Subscriber): number {
  const startLine = viewport * sub.start
  let endLine = viewport * sub.end
  // Near the end of the page the element may never climb as far as the end line.
  // Finish where its bottom edge will rest when the page cannot scroll any further.
  const restingBottom = top + height - remaining
  if (restingBottom > endLine) endLine = restingBottom
  const travel = startLine - endLine + height
  if (travel <= 0) return remaining <= 1 ? 1 : 0
  const progress = (startLine - top) / travel
  return progress <= 0 ? 0 : progress >= 1 ? 1 : progress
}

function flush(): void {
  frame = 0
  const viewport = window.innerHeight
  const remaining = Math.max(0, document.documentElement.scrollHeight - viewport - window.scrollY)

  // Read.
  changedEls.length = 0
  changedValues.length = 0
  for (const [el, sub] of subscribers) {
    const rect = el.getBoundingClientRect()
    const progress = progressOf(rect.top, rect.height, viewport, remaining, sub)
    if (progress !== sub.last) {
      changedEls.push(el)
      changedValues.push(progress)
    }
  }

  // Write.
  for (let i = 0; i < changedEls.length; i++) {
    const el = changedEls[i]
    const progress = changedValues[i]
    if (el === undefined || progress === undefined) continue
    const sub = subscribers.get(el)
    if (!sub) continue
    sub.last = progress
    sub.callback(progress, el)
  }
}

function schedule(): void {
  if (frame === 0) frame = requestAnimationFrame(flush)
}

function listen(): void {
  if (listening) return
  listening = true
  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', schedule, { passive: true })
}

function unlisten(): void {
  if (!listening) return
  listening = false
  window.removeEventListener('scroll', schedule)
  window.removeEventListener('resize', schedule)
  if (frame !== 0) {
    cancelAnimationFrame(frame)
    frame = 0
  }
}

/**
 * Reports how far `el` has travelled through the viewport, 0 to 1, whenever it changes.
 * The first report arrives on the next animation frame. Returns the unsubscribe function.
 *
 *   useEffect(() => observeProgress(ref.current!, (p, el) => {
 *     (el as HTMLElement).style.setProperty('--p', p.toFixed(3))
 *   }), [])
 */
export function observeProgress(el: Element, callback: ProgressCallback, options: ProgressOptions = {}): () => void {
  subscribers.set(el, {
    callback,
    start: options.start ?? 0.9,
    end: options.end ?? 0.5,
    last: -1,
  })
  listen()
  schedule()
  return () => {
    subscribers.delete(el)
    if (subscribers.size === 0) unlisten()
  }
}
