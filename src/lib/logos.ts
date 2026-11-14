/*
 * Every logo in public/logos exists in three versions with the same file name:
 *   /logos/<file>              white, one color (the default: for the dark page when color is not wanted)
 *   /logos/color/dark/<file>   brand colors, adjusted to read on the dark page
 *   /logos/color/light/<file>  brand colors as published, for white surfaces (for example the enamel face of a 3D coin)
 */

export type LogoSurface = 'light' | 'dark'

/** The brand-color version of a logo path for the given surface. `logoOn('light', '/logos/replit.svg')`. */
export function logoOn(surface: LogoSurface, path: string): string {
  return path.replace(/^\/logos\//, `/logos/color/${surface}/`)
}
