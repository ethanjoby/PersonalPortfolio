import type { ComponentPropsWithRef, ReactNode } from 'react'
import { cx } from '@/lib/cx'
import { ArrowIcon } from './ArrowIcon'
import './ExternalLink.css'

export interface ExternalLinkProps extends Omit<ComponentPropsWithRef<'a'>, 'href' | 'target' | 'rel'> {
  href: string
  /** Hide the up-right arrow (for a link whose label is already an address, for example). */
  bare?: boolean
  children: ReactNode
}

/**
 * A text link that leaves the site. Opens in a new tab, sets rel, shows an up-right arrow, and
 * tells assistive technology that a new tab opens.
 */
export function ExternalLink({ href, bare = false, className, children, ...rest }: ExternalLinkProps) {
  return (
    <a {...rest} className={cx('link', 'ext-link', className)} href={href} target="_blank" rel="noopener noreferrer">
      {children}
      {bare ? null : <ArrowIcon direction="up-right" />}
      <span className="visually-hidden"> (opens in a new tab)</span>
    </a>
  )
}
