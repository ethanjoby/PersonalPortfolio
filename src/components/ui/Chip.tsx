import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'
import './Chip.css'

export interface ChipProps {
  /**
   * `outline` is the default tag. `fill` is a quiet filled tag. `dashed` marks something that has
   * not happened yet (the incoming role), so the state never rests on tone alone.
   */
  variant?: 'outline' | 'fill' | 'dashed'
  as?: 'span' | 'li'
  className?: string
  children: ReactNode
}

/** A small mono tag for a fact: a status, a year, a tool. Not interactive. */
export function Chip({ variant = 'outline', as: Tag = 'span', className, children }: ChipProps) {
  return <Tag className={cx('chip', `chip-${variant}`, className)}>{children}</Tag>
}
