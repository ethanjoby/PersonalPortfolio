'use client'

import { useLayoutEffect } from 'react'

/**
 * Safeguard for html.js-reveal. The inline script in the root layout sets the class before first
 * paint, which is all a production build needs. In development React's Strict Mode can remount
 * <html> and reset it to the attributes it knows from JSX, which would drop the class (see
 * "Re-applying attributes in development" in Next's guide on preventing flash before hydration).
 * This puts the class back before the next paint. It changes nothing when the class is already
 * there. Renders nothing.
 */
export function JsFlag() {
  useLayoutEffect(() => {
    if ('IntersectionObserver' in window) document.documentElement.classList.add('js-reveal')
  }, [])
  return null
}
