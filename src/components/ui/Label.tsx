import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'
import './Label.css'

export interface LabelProps {
  /** Render as a heading when the label names a section and nothing else does. */
  as?: 'span' | 'p' | 'div' | 'h2' | 'h3' | 'figcaption' | 'dt'
  /** `label` is 13px (section labels, sheet keys), `micro` is 11px (captions, coordinates). */
  size?: 'label' | 'micro'
  id?: string
  className?: string
  children: ReactNode
}

/** A mono uppercase readout label. It names data; it is never a sentence. */
export function Label({ as: Tag = 'span', size = 'label', id, className, children }: LabelProps) {
  return (
    <Tag id={id} className={cx('label', size === 'micro' && 'label-micro', className)}>
      {children}
    </Tag>
  )
}
