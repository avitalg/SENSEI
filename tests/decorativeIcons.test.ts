// A11y invariant (WCAG 1.1.1): an icon inside an already-labelled interactive
// control is decorative — the control's aria-label is its accessible name, so
// the SVG must be aria-hidden to avoid a redundant/meaningless "graphic"
// announcement. This static guard keeps that true as new icon-buttons are added.
import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (p.endsWith('.tsx')) out.push(p)
  }
  return out
}

describe('decorative icons in labelled buttons are aria-hidden', () => {
  it('no <button aria-label="…"> has a child <svg> that lacks aria-hidden', () => {
    const files = walk(join(process.cwd(), 'src'))
    const offenders: string[] = []
    // <button …aria-label="…"…> immediately followed by <svg …> without aria-hidden
    const re = /<button [^>]*aria-label="[^"]*"[^>]*>\s*<svg ((?:(?!aria-hidden)[^>])*)>/g
    for (const f of files) {
      const s = readFileSync(f, 'utf8')
      if (re.test(s)) offenders.push(f.replace(process.cwd() + '/', ''))
      re.lastIndex = 0
    }
    expect(offenders, `labelled icon-button with a non-hidden decorative <svg>:\n${offenders.join('\n')}`).toEqual([])
  })
})
