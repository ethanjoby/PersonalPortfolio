import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from '@/lib/cx'
import './Panel.css'

export interface PanelProps extends HTMLAttributes<HTMLElement> {
  as?: 'div' | 'section' | 'article' | 'aside' | 'li' | 'figure'
  /**
   * `dark` is a raised surface on the page. `paper` is the inversion: everything inside reads
   * the ink tones automatically (text, hairlines, buttons, focus ring).
   */
  tone?: 'dark' | 'paper'
  /** Corner radius step: 2 = 10px (cards), 3 = 16px (large panels), 4 = 24px (the companies container). */
  radius?: 2 | 3 | 4
  /** Inner padding. `none` when the content must reach the edge (a cropped figure). */
  pad?: 'none' | 'md' | 'lg'
  /** Fine grain. Paper only. */
  grain?: boolean
  children?: ReactNode
}

/** A flat, bordered, lightly rounded surface. Depth comes from the surface step, never a shadow. */
export function Panel({
  as: Tag = 'div',
  tone = 'dark',
  radius = 2,
  pad = 'md',
  grain = false,
  className,
  children,
  ...rest
}: PanelProps) {
  return (
    <Tag
      {...rest}
      className={cx('panel', `panel-r${radius}`, `panel-pad-${pad}`, grain && tone === 'paper' && 'grain', className)}
      data-tone={tone}
    >
      {children}
    </Tag>
  )
}
