import { cx } from '@/lib/cx'
import './ArrowIcon.css'

export type ArrowDirection = 'right' | 'up-right' | 'down'

export interface ArrowIconProps {
  /** `right` for in-page moves, `up-right` for links that leave the site, `down` for downloads. */
  direction?: ArrowDirection
  className?: string
}

/** A hairline arrow, 1em square, drawn in the current text color. Always decorative. */
export function ArrowIcon({ direction = 'right', className }: ArrowIconProps) {
  return (
    <svg
      className={cx('arrow-icon', className)}
      data-dir={direction}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M2.5 8h11M9 3.5 13.5 8 9 12.5" />
    </svg>
  )
}
