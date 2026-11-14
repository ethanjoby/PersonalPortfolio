/*
 * Reveal on first view: one shared IntersectionObserver for the whole page.
 *
 * The hidden state is CSS (src/styles/base.css) and exists only under html.js-reveal, which the
 * inline script in the root layout sets before first paint. This module marks an element with
 * data-in the first time it enters the viewport and then stops watching it. No React state.
 * Client only.
 */

/** Must match the delay of the reveal-failsafe animation in src/styles/base.css. */
const FAILSAFE_MS = 3000

/** A block starts its entrance once its top edge is this far above the bottom of the viewport. */
const ROOT_MARGIN = '0px 0px -8% 0px'

let observer: IntersectionObserver | null = null
const callbacks = new WeakMap<Element, () => void>()

function show(el: Element): void {
  el.setAttribute('data-in', '')
  const callback = callbacks.get(el)
  if (callback) {
    callbacks.delete(el)
    callback()
  }
}

function onEntries(entries: IntersectionObserverEntry[]): void {
  for (const entry of entries) {
    // In view, or already scrolled past (a reload halfway down the page, a jump to an anchor).
    if (entry.isIntersecting || entry.boundingClientRect.bottom <= 0) {
      observer?.unobserve(entry.target)
      show(entry.target)
    }
  }
}

function arm(): IntersectionObserver | null {
  const root = document.documentElement
  if (observer) {
    // Keep both flags in place in case React reset the attributes of <html> (a development remount).
    root.classList.add('js-reveal', 'reveal-ready')
    return observer
  }
  if (typeof IntersectionObserver === 'undefined') return null
  // The inline script did not run or found no IntersectionObserver: nothing is hidden.
  if (!root.classList.contains('js-reveal')) return null
  // Hydration came after the CSS failsafe had already shown everything: leave it shown.
  if (performance.now() >= FAILSAFE_MS) return null
  observer = new IntersectionObserver(onEntries, { rootMargin: ROOT_MARGIN, threshold: 0 })
  // From here on the CSS failsafe is off, so nothing carrying the class may be left unwatched:
  // pick up every hidden block already in the document, whoever rendered it.
  for (const el of document.querySelectorAll('.reveal:not([data-in])')) observer.observe(el)
  root.classList.add('reveal-ready')
  return observer
}

/**
 * Reveals `el` (an element carrying the `reveal` class) the first time it is seen.
 * `onReveal` runs once, at that moment. Returns a function that stops watching.
 */
export function observeReveal(el: Element, onReveal?: () => void): () => void {
  if (el.hasAttribute('data-in')) return () => {}
  const io = arm()
  if (!io) {
    if (onReveal) callbacks.set(el, onReveal)
    show(el)
    return () => {}
  }
  if (onReveal) callbacks.set(el, onReveal)
  io.observe(el)
  return () => {
    io.unobserve(el)
    callbacks.delete(el)
  }
}

/**
 * A ref callback for client components: `<div ref={revealRef} className="reveal">`.
 * Stable identity, cleans up after itself (React 19 ref cleanup).
 */
export function revealRef(el: Element | null): (() => void) | undefined {
  return el ? observeReveal(el) : undefined
}
