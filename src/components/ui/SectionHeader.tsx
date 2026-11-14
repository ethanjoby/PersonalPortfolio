import { cx } from '@/lib/cx'
import { Label } from './Label'
import { Statement } from './Statement'
import './SectionHeader.css'

export interface SectionHeaderProps {
  /** Prefix for the ids this header creates: `<id>-label` and `<id>-statement`. Use the section id. */
  id: string
  /** The mono section label, for example "Experience". */
  label: string
  /** The statement, rendered as the section's h2. */
  statement: string
  /**
   * `split` (default): label in columns 1 to 4, statement in columns 6 to 12, stacked below 64rem.
   * `center`: label above a centered statement.
   */
  layout?: 'split' | 'center'
  className?: string
}

/**
 * The header of a section: mono label plus statement.
 * Point the section at the label: `<section id="x" aria-labelledby="x-label">`.
 */
export function SectionHeader({ id, label, statement, layout = 'split', className }: SectionHeaderProps) {
  return (
    <header className={cx('section-header', `section-header-${layout}`, className)}>
      <Label as="p" id={`${id}-label`} className="section-header-label">
        {label}
      </Label>
      <Statement
        id={`${id}-statement`}
        text={statement}
        align={layout === 'center' ? 'center' : 'start'}
        className="section-header-statement"
      />
    </header>
  )
}
