import type { ReactNode } from 'react'

export interface VisuallyHiddenProps {
  as?: 'span' | 'div' | 'p' | 'h2' | 'h3'
  id?: string
  children: ReactNode
}

/** Text for assistive technology only. Styled by `.visually-hidden` in src/styles/utilities.css. */
export function VisuallyHidden({ as: Tag = 'span', id, children }: VisuallyHiddenProps) {
  return (
    <Tag id={id} className="visually-hidden">
      {children}
    </Tag>
  )
}
