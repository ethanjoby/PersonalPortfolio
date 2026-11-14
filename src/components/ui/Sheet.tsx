import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'
import { cx } from '@/lib/cx'
import { ArrowIcon } from './ArrowIcon'
import './Sheet.css'

export interface SheetRow {
  /** The mono key on the left: what the row names. */
  key: string
  /** The value. Plain text, or nodes when a row holds a list. */
  value: ReactNode
  /** A muted note: under the value, or in a third column once the sheet is 40rem wide. */
  note?: ReactNode
  /** Makes the whole row a link (an in-page anchor or a URL). */
  href?: string
  /** For a link row that leaves the site: new tab, rel, up-right arrow, hint for assistive technology. */
  external?: boolean
}

export interface SheetProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  as?: 'div' | 'section' | 'aside' | 'article'
  /** Left side of the mono header strip. */
  title: ReactNode
  /** Right side of the header strip: a short readout such as a role or a count. */
  meta?: ReactNode
  rows: readonly SheetRow[]
  /** `paper` is the inverted sheet (ink on paper white). `dark` is a surface on the page. */
  tone?: 'paper' | 'dark'
  /** Fine grain. Paper only. */
  grain?: boolean
  /** Width of the key column, any CSS length. Default 5.5rem. */
  keyWidth?: string
  /** Width of the value column when the sheet is wide enough to put notes beside values. Default 11rem. */
  valueWidth?: string
  /** Optional footer content under the rows. */
  children?: ReactNode
}

/**
 * The spec sheet: a mono header strip, then key and value rows. Rows may be links.
 * No window chrome, no decoration: every string in it is a real fact.
 *
 * The sheet lays itself out by its own width, not the viewport's: keys sit above values when it is
 * narrow, beside them from 24rem, and notes move into a third column from 40rem. It is a size
 * container, so it needs a width from its context (a grid column, or an explicit width).
 */
export function Sheet({
  as: Tag = 'div',
  title,
  meta,
  rows,
  tone = 'paper',
  grain = false,
  keyWidth,
  valueWidth,
  className,
  style,
  children,
  ...rest
}: SheetProps) {
  const vars =
    keyWidth || valueWidth
      ? ({
          ...style,
          ...(keyWidth ? { '--sheet-key-w': keyWidth } : null),
          ...(valueWidth ? { '--sheet-value-w': valueWidth } : null),
        } as CSSProperties)
      : style
  return (
    <Tag {...rest} className={cx('sheet', grain && tone === 'paper' && 'grain', className)} data-tone={tone} style={vars}>
      <div className="sheet-head">
        <span className="sheet-title">{title}</span>
        {meta ? <span className="sheet-meta">{meta}</span> : null}
      </div>
      <dl className="sheet-rows">
        {rows.map((row) => (
          <div className={cx('sheet-row', row.href && 'sheet-row-link')} key={row.key}>
            <dt className="sheet-key">{row.key}</dt>
            <dd className={cx('sheet-value', row.note && 'sheet-value-split')}>
              {row.href ? (
                <a
                  className="sheet-main sheet-link"
                  href={row.href}
                  target={row.external ? '_blank' : undefined}
                  rel={row.external ? 'noopener noreferrer' : undefined}
                >
                  {row.value}
                  {row.external ? <span className="visually-hidden"> (opens in a new tab)</span> : null}
                </a>
              ) : (
                <span className="sheet-main">{row.value}</span>
              )}
              {row.note ? <span className="sheet-note">{row.note}</span> : null}
              {row.href ? <ArrowIcon className="sheet-arrow" direction={row.external ? 'up-right' : 'right'} /> : null}
            </dd>
          </div>
        ))}
      </dl>
      {children ? <div className="sheet-foot">{children}</div> : null}
    </Tag>
  )
}
