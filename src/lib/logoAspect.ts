import { readFileSync } from 'node:fs'
import path from 'node:path'

/*
 * Server only (it reads files): import it from server components, never from a 'use client' file.
 */

const cache = new Map<string, number>()

/**
 * Width divided by height of a logo in public/ (SVG or PNG), read from the file itself when the page is built.
 * `logoAspect('/logos/color/dark/replit.svg')`. Returns 1 when the file does not say.
 */
export function logoAspect(publicPath: string): number {
  const known = cache.get(publicPath)
  if (known !== undefined) return known
  const aspect = read(publicPath)
  cache.set(publicPath, aspect)
  return aspect
}

function read(publicPath: string): number {
  try {
    const file = readFileSync(path.join(/* turbopackIgnore: true */ process.cwd(), 'public', publicPath))
    if (/\.png$/i.test(publicPath)) {
      // PNG: width and height are the first two fields of the IHDR chunk.
      return ratio(file.readUInt32BE(16), file.readUInt32BE(20))
    }
    const tag = /<svg[^>]*>/.exec(file.toString('utf8'))?.[0] ?? ''
    const box = /viewBox\s*=\s*["']\s*[-\d.eE]+[\s,]+[-\d.eE]+[\s,]+([-\d.eE]+)[\s,]+([-\d.eE]+)/.exec(tag)
    if (box) return ratio(Number(box[1]), Number(box[2]))
    return ratio(Number(/\swidth\s*=\s*["']([\d.]+)/.exec(tag)?.[1]), Number(/\sheight\s*=\s*["']([\d.]+)/.exec(tag)?.[1]))
  } catch {
    return 1
  }
}

function ratio(width: number, height: number): number {
  return width > 0 && height > 0 ? width / height : 1
}
