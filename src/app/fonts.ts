import localFont from 'next/font/local'

/*
 * Self-hosted variable fonts (SIL Open Font License, see src/fonts/OFL.txt): Archivo for headings, Space Grotesk for text
 * (the pairing the UI/UX Pro Max design system recommends for portfolios) and JetBrains Mono for small data.
 * Each exposes a CSS variable that src/styles/tokens.css builds its font stacks on.
 */

export const fontDisplay = localFont({
  src: '../fonts/Archivo-Variable.woff2',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
  variable: '--ff-display',
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
})

export const fontText = localFont({
  src: '../fonts/SpaceGrotesk-Variable.woff2',
  weight: '300 700',
  style: 'normal',
  display: 'swap',
  variable: '--ff-text',
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
})

export const fontMono = localFont({
  src: '../fonts/JetBrainsMono-Variable.woff2',
  weight: '100 800',
  style: 'normal',
  display: 'swap',
  variable: '--ff-mono',
  fallback: ['ui-monospace', 'SF Mono', 'Menlo', 'Consolas', 'monospace'],
})

export const fontVariables = `${fontDisplay.variable} ${fontText.variable} ${fontMono.variable}`
