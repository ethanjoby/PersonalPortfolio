import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { meta, profile } from '@/content/content'
import { fontVariables } from './fonts'
import { JsFlag } from './JsFlag'
import '@/styles/tokens.css'
import '@/styles/base.css'
import '@/styles/utilities.css'

/*
 * Canonical and Open Graph URLs need an absolute base. profile.siteUrl wins when it is set;
 * otherwise Vercel's production domain is used when the build runs there.
 */
const siteUrl: string = profile.siteUrl
const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL
const metadataBase = siteUrl ? new URL(siteUrl) : vercelHost ? new URL(`https://${vercelHost}`) : undefined

/*
 * The tab icon is the waving hand emoji, at the owner's request: an inline SVG that holds the one character, so it is
 * drawn with the visitor's own emoji font and no image file is needed. The old "EV" mark is still in
 * src/app/mark.svg, unused.
 */
const WAVE_ICON = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text x="50" y="50" font-size="84" text-anchor="middle" dominant-baseline="central">👋</text></svg>',
)}`

export const metadata: Metadata = {
  ...(metadataBase ? { metadataBase } : {}),
  title: meta.title,
  description: meta.description,
  icons: { icon: [{ url: WAVE_ICON, type: 'image/svg+xml', sizes: 'any' }] },
  verification: { google: 'KASPv3Z-AcjVmBlrc7yxTUWq92W4ZkGt5QRAJHlBxdg' },
  ...(siteUrl ? { alternates: { canonical: '/' } } : {}),
  openGraph: {
    type: 'website',
    title: meta.title,
    description: meta.description,
    ...(siteUrl ? { url: '/' } : {}),
  },
}

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  colorScheme: 'dark',
}

/*
 * Runs before first paint. Reveal styles hide content only under html.js-reveal, so with
 * JavaScript off (or without IntersectionObserver) the prerendered page reads in full.
 */
const JS_REVEAL = "if('IntersectionObserver'in window)document.documentElement.classList.add('js-reveal')"

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // The inline script adds a class to <html> before hydration: that attribute difference is expected.
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: JS_REVEAL }} />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
        <JsFlag />
      </body>
    </html>
  )
}
