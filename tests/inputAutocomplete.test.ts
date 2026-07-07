// A11y + UX invariant (WCAG 2.1/2.2 AA 1.3.5, Identify Input Purpose): a password
// input must declare its autocomplete purpose so password managers and assistive
// tech can fill/save it (current-password vs new-password). Guards the auth,
// reset, and account password fields against silently dropping the attribute.
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

// Brace-aware opening-tag scanner (shared shape with keyboardActivation guard):
// avoids the /<input[^>]*>/ pitfall of truncating at `>` inside {…} expressions.
function openTags(src: string, name: string): { text: string; line: number }[] {
  const out: { text: string; line: number }[] = []
  const pat = '<' + name
  let i = 0
  while (true) {
    const k = src.indexOf(pat, i)
    if (k < 0) break
    const after = src[k + pat.length]
    if (after && /[A-Za-z0-9]/.test(after)) { i = k + pat.length; continue }
    let j = k + pat.length, depth = 0, q: string | null = null
    for (; j < src.length; j++) {
      const c = src[j]
      if (q) { if (c === q) q = null }
      else if (c === '"' || c === '\'') q = c
      else if (c === '{') depth++
      else if (c === '}') depth--
      else if (c === '>' && depth === 0) break
    }
    out.push({ text: src.slice(k, j + 1), line: src.slice(0, k).split('\n').length })
    i = j + 1
  }
  return out
}

describe('password inputs declare their autocomplete purpose (WCAG 1.3.5)', () => {
  it('every <input type="password"> has an autoComplete attribute', () => {
    const offenders: string[] = []
    for (const f of walk(join(process.cwd(), 'src'))) {
      for (const { text, line } of openTags(readFileSync(f, 'utf8'), 'input')) {
        if (/type="password"/.test(text) && !/autoComplete=/.test(text)) {
          offenders.push(`${f.replace(process.cwd() + '/', '')}:${line}`)
        }
      }
    }
    expect(offenders, `password input missing autoComplete:\n${offenders.join('\n')}`).toEqual([])
  })
})
