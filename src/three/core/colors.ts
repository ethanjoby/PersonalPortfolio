/*
 * CSS color parsing for the --wire-* tokens. No three.js imports.
 * Values stay in display sRGB and straight (not premultiplied) alpha; the shaders premultiply.
 */

/** r, g, b, a in 0..1. */
export type RGBA = [number, number, number, number]

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

function channel(token: string): number {
  const t = token.trim()
  if (t.endsWith('%')) return clamp01(parseFloat(t) / 100)
  return clamp01(parseFloat(t) / 255)
}

function alpha(token: string | undefined): number {
  if (token === undefined) return 1
  const t = token.trim()
  if (t.endsWith('%')) return clamp01(parseFloat(t) / 100)
  return clamp01(parseFloat(t))
}

/**
 * Parse `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb()` and `rgba()` (comma or space syntax).
 * Returns `fallback` for anything else, so a missing token never breaks a scene.
 */
export function parseCssColor(input: string, fallback: RGBA): RGBA {
  const s = input.trim().toLowerCase()
  if (s.startsWith('#')) {
    const hex = s.slice(1)
    if (!/^[0-9a-f]+$/.test(hex)) return fallback
    if (hex.length === 3 || hex.length === 4) {
      const v = hex.split('').map((c) => parseInt(c + c, 16) / 255)
      return [v[0] ?? 0, v[1] ?? 0, v[2] ?? 0, v[3] ?? 1]
    }
    if (hex.length === 6 || hex.length === 8) {
      const v = [0, 2, 4, 6].map((i) => (i < hex.length ? parseInt(hex.slice(i, i + 2), 16) / 255 : 1))
      return [v[0] ?? 0, v[1] ?? 0, v[2] ?? 0, v[3] ?? 1]
    }
    return fallback
  }
  const m = /^rgba?\(([^)]+)\)$/.exec(s)
  if (m && m[1]) {
    const parts = m[1]
      .replace(/\//g, ' ')
      .split(/[\s,]+/)
      .filter(Boolean)
    if (parts.length >= 3) {
      const r = channel(parts[0]!)
      const g = channel(parts[1]!)
      const b = channel(parts[2]!)
      const a = alpha(parts[3])
      if ([r, g, b, a].every((n) => Number.isFinite(n))) return [r, g, b, a]
    }
  }
  return fallback
}
