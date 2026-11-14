/** Joins class names, skipping anything that is not a non-empty string. `cx('btn', active && 'is-active', className)` */
export type ClassValue = string | number | bigint | boolean | null | undefined

export function cx(...parts: ClassValue[]): string {
  let out = ''
  for (const part of parts) {
    if (typeof part === 'string' && part) out = out ? `${out} ${part}` : part
  }
  return out
}
