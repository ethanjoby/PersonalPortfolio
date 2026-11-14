'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { ArrowIcon } from '@/components/ui/ArrowIcon'
import { Button } from '@/components/ui/Button'
import './Nav.css'

interface NavLink {
  readonly label: string
  readonly href: string
}

export interface NavBarProps {
  name: string
  links: readonly NavLink[]
  github: string
  cta: NavLink
}

/** Below this width the links collapse into the menu. Keep in step with Nav.css. */
const DESKTOP_QUERY = '(min-width: 48rem)'

export function NavBar({ name, links, github, cta }: NavBarProps) {
  const [scrolled, setScrolled] = useState(false)
  const [active, setActive] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const sentinelRef = useRef<HTMLSpanElement>(null)
  const headerRef = useRef<HTMLElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()

  // The hairline under the bar: a sentinel at the top of the page leaves the viewport once the
  // page has scrolled. No scroll listener.
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1]
      if (entry) setScrolled(!entry.isIntersecting)
    })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  // The link for the section in view: the section crossing a line 40% down the viewport.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const visible = new Set<string>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const href = `#${entry.target.id}`
          if (entry.isIntersecting) visible.add(href)
          else visible.delete(href)
        }
        let current: string | null = null
        for (const link of links) {
          if (visible.has(link.href)) current = link.href
        }
        setActive(current)
      },
      { rootMargin: '-40% 0px -59% 0px' },
    )
    for (const link of links) {
      const target = link.href.startsWith('#') ? document.getElementById(link.href.slice(1)) : null
      if (target) observer.observe(target)
    }
    return () => observer.disconnect()
  }, [links])

  // While the menu is open: Escape closes it and returns focus to the button; a press or focus
  // outside the header closes it; so does growing past the breakpoint.
  useEffect(() => {
    if (!open) return
    const header = headerRef.current
    const media = window.matchMedia(DESKTOP_QUERY)

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setOpen(false)
      buttonRef.current?.focus()
    }
    const onOutside = (event: Event) => {
      if (header && event.target instanceof Node && !header.contains(event.target)) setOpen(false)
    }
    const onMedia = () => {
      if (media.matches) setOpen(false)
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onOutside)
    document.addEventListener('focusin', onOutside)
    media.addEventListener('change', onMedia)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onOutside)
      document.removeEventListener('focusin', onOutside)
      media.removeEventListener('change', onMedia)
    }
  }, [open])

  const close = () => setOpen(false)

  return (
    <>
      <span ref={sentinelRef} className="nav-sentinel" aria-hidden="true" />
      <header ref={headerRef} className="nav" data-scrolled={scrolled} data-open={open}>
        <div className="nav-bar wrap">
          <a className="nav-wordmark" href="#top" onClick={close}>
            <span>{name}</span>
          </a>

          <nav className="nav-links" aria-label="Primary">
            <ul className="nav-list" role="list">
              {links.map((link) => (
                <li key={link.href}>
                  <a className="nav-link" href={link.href} aria-current={active === link.href ? 'location' : undefined}>
                    <span className="nav-link-text">{link.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="nav-actions">
            <Button className="nav-github" variant="secondary" href={github} external>
              GitHub
            </Button>
            <Button variant="primary" href={cta.href} arrow>
              {cta.label}
            </Button>
          </div>

          <Button
            ref={buttonRef}
            className="nav-menu-button"
            variant="secondary"
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen((value) => !value)}
          >
            Menu
            <svg className="nav-menu-glyph" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
              <path className="nav-menu-glyph-a" d="M3 6h10" />
              <path className="nav-menu-glyph-b" d="M3 10h10" />
            </svg>
          </Button>
        </div>

        <div id={menuId} className="nav-menu" inert={!open}>
          <nav className="wrap" aria-label="Primary">
            <ul className="nav-menu-list" role="list">
              {links.map((link) => (
                <li key={link.href}>
                  <a
                    className="nav-menu-link"
                    href={link.href}
                    aria-current={active === link.href ? 'location' : undefined}
                    onClick={close}
                  >
                    <span className="nav-link-text">{link.label}</span>
                  </a>
                </li>
              ))}
              <li>
                <a className="nav-menu-link" href={github} target="_blank" rel="noopener noreferrer" onClick={close}>
                  <span className="nav-link-text">GitHub</span>
                  <ArrowIcon direction="up-right" />
                  <span className="visually-hidden"> (opens in a new tab)</span>
                </a>
              </li>
            </ul>
            <div className="nav-menu-actions">
              <Button variant="primary" href={cta.href} arrow onClick={close}>
                {cta.label}
              </Button>
            </div>
          </nav>
        </div>
      </header>
    </>
  )
}
