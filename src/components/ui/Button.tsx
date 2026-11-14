import type { ComponentPropsWithRef, ReactNode } from 'react'
import { cx } from '@/lib/cx'
import { ArrowIcon } from './ArrowIcon'
import type { ArrowDirection } from './ArrowIcon'
import './Button.css'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost'

interface ButtonOwnProps {
  /**
   * `primary`: the one action of a view (paper fill on the dark page, ink fill on paper).
   * `secondary`: a quiet filled control. `ghost`: text only until hovered.
   */
  variant?: ButtonVariant
  /** Adds an arrow after the label. `true` picks the direction: right, or up-right when `external`. */
  arrow?: boolean | ArrowDirection
  disabled?: boolean
  className?: string
  children: ReactNode
}

type ButtonAsLink = ButtonOwnProps &
  Omit<ComponentPropsWithRef<'a'>, keyof ButtonOwnProps | 'href'> & {
    /** With `href` the button renders an <a>. */
    href: string
    /** Opens in a new tab, with rel set and a hint for assistive technology. */
    external?: boolean
  }

type ButtonAsButton = ButtonOwnProps &
  Omit<ComponentPropsWithRef<'button'>, keyof ButtonOwnProps> & {
    href?: undefined
    external?: undefined
  }

export type ButtonProps = ButtonAsLink | ButtonAsButton

function arrowFor(arrow: boolean | ArrowDirection, external: boolean): ArrowDirection | null {
  if (arrow === true) return external ? 'up-right' : 'right'
  return arrow || null
}

/**
 * The site's one button. 36px tall with a pointer, 44px on touch. Its tone follows the surface it
 * sits on: inside a paper Panel or Sheet the primary turns ink.
 */
export function Button(props: ButtonProps) {
  const { variant = 'secondary', arrow = false, disabled = false, className, children, ...rest } = props
  const classes = cx('btn', `btn-${variant}`, className)

  if (rest.href !== undefined) {
    const { href, external = false, target, rel, ...anchor } = rest
    const direction = arrowFor(arrow, external)
    const content = (
      <>
        <span className="btn-label">{children}</span>
        {direction ? <ArrowIcon direction={direction} /> : null}
        {external ? <span className="visually-hidden"> (opens in a new tab)</span> : null}
      </>
    )
    if (disabled) {
      // A link that cannot be followed: no href, announced as a disabled link.
      return (
        <a {...anchor} className={classes} role="link" aria-disabled="true">
          {content}
        </a>
      )
    }
    return (
      <a
        {...anchor}
        className={classes}
        href={href}
        target={external ? '_blank' : target}
        rel={external ? 'noopener noreferrer' : rel}
      >
        {content}
      </a>
    )
  }

  const { type = 'button', ...button } = rest
  const direction = arrowFor(arrow, false)
  return (
    <button {...button} className={classes} type={type} disabled={disabled}>
      <span className="btn-label">{children}</span>
      {direction ? <ArrowIcon direction={direction} /> : null}
    </button>
  )
}
