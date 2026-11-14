'use client'

import { createElement } from 'react'
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'
import { cx } from '@/lib/cx'
import { revealRef } from '@/lib/reveal'

export type RevealTag =
  | 'div'
  | 'section'
  | 'article'
  | 'header'
  | 'footer'
  | 'aside'
  | 'figure'
  | 'ul'
  | 'ol'
  | 'li'
  | 'dl'
  | 'p'
  | 'span'

export interface RevealProps extends HTMLAttributes<HTMLElement> {
  /** The element to render. Default `div`. */
  as?: RevealTag
  /**
   * Stagger step, 0 to 5. Each step waits one --stagger (80ms). Use it for items that enter
   * together (a row of cards), never to delay a block on its own.
   */
  delay?: number
  children?: ReactNode
}

/**
 * The one entrance: a fade with a 16px rise, once, the first time the block is seen.
 * Without JavaScript, and under reduced motion without travel, the content is simply there.
 * The mechanism is CSS in src/styles/base.css plus one shared observer in src/lib/reveal.ts.
 */
export function Reveal({ as = 'div', delay = 0, className, style, children, ...rest }: RevealProps) {
  const step = Math.max(0, Math.min(5, Math.round(delay)))
  const vars = step > 0 ? ({ ...style, '--reveal-i': step } as CSSProperties) : style
  return createElement(as, { ...rest, ref: revealRef, className: cx('reveal', className), style: vars }, children)
}
