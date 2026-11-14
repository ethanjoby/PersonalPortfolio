'use client'

import { Fragment, useEffect, useMemo, useRef } from 'react'
import type { CSSProperties } from 'react'
import { cx } from '@/lib/cx'
import { observeProgress } from '@/lib/scroll'
import { useReducedMotion } from '@/lib/useReducedMotion'
import './Statement.css'

export interface StatementProps {
  /** The sentence. Plain text: it is split on spaces. */
  text: string
  /** Heading level. Default `h2`. */
  as?: 'h2' | 'h3'
  align?: 'start' | 'center'
  id?: string
  className?: string
}

/** Viewport fractions between which the words light up: block top at 92% to block bottom at 65%. */
const RANGE = { start: 0.92, end: 0.65 } as const

/**
 * A section statement whose words brighten from 0.3 to 1 as the block first travels up the
 * viewport. It only ever brightens: once read, it stays lit. With JavaScript off, under reduced
 * motion, or when the block is already on screen at load, every word is fully visible.
 * Assistive technology gets the whole sentence from aria-label.
 */
export function Statement({ text, as: Tag = 'h2', align = 'start', id, className }: StatementProps) {
  const ref = useRef<HTMLHeadingElement>(null)
  const reduced = useReducedMotion()
  const words = useMemo(() => text.split(/\s+/).filter(Boolean), [text])

  useEffect(() => {
    const el = ref.current
    if (!el || reduced) return

    let armed = false
    let peak = 0
    let stop: (() => void) | null = null

    const release = () => {
      stop?.()
      stop = null
      el.removeAttribute('data-live')
      el.style.removeProperty('--statement-p')
    }

    stop = observeProgress(
      el,
      (progress) => {
        if (!armed) {
          // Already on screen or scrolled past when the page loaded: leave it fully lit.
          if (progress > 0) {
            release()
            return
          }
          armed = true
          el.style.setProperty('--statement-p', '0')
          el.setAttribute('data-live', '')
          return
        }
        if (progress <= peak) return
        peak = progress
        if (progress >= 1) {
          release()
          return
        }
        el.style.setProperty('--statement-p', progress.toFixed(4))
      },
      RANGE,
    )

    return release
  }, [reduced, text])

  return (
    <Tag
      ref={ref}
      id={id}
      className={cx('statement', align === 'center' && 'statement-center', className)}
      aria-label={text}
      style={{ '--statement-n': words.length } as CSSProperties}
    >
      {words.map((word, index) => (
        <Fragment key={index}>
          <span className="statement-word" aria-hidden="true" style={{ '--statement-i': index } as CSSProperties}>
            {word}
          </span>
          {index < words.length - 1 ? ' ' : null}
        </Fragment>
      ))}
    </Tag>
  )
}
