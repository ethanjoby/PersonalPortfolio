import { cx } from '@/lib/cx'
import './Hairline.css'

export interface HairlineProps {
  /** The emphasized hairline (20% instead of 10%). */
  strong?: boolean
  /** A vertical rule. The parent must be a flex or grid container. */
  vertical?: boolean
  className?: string
}

/** A 1px rule in the tone of the surface it sits on. Decorative: hidden from assistive technology. */
export function Hairline({ strong = false, vertical = false, className }: HairlineProps) {
  return (
    <div
      className={cx('hairline', strong && 'hairline-strong', vertical && 'hairline-vertical', className)}
      aria-hidden="true"
    />
  )
}
