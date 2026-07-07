// A11y invariant (WCAG 2.1.1, Keyboard): a non-native control that carries an
// interactive role (or an href-less <a> acting as a control) with an onClick must
// ALSO be focusable and wire a keyboard handler — unlike a native <button>, these
// get no automatic Enter/Space activation, so keyboard-only users cannot operate
// them. The canonical helper is onKeyActivate (src/utils/a11y.ts). This guard keeps
// every such control operable as new ones are added.
import { describe, expect, it, vi } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { onKeyActivate } from '../src/utils/a11y'

describe('onKeyActivate helper', () => {
  const ev = (key: string) => { const e: any = { key, preventDefault: vi.fn() }; return e }
  it('fires the handler and prevents default on Enter and Space', () => {
    for (const key of ['Enter', ' ']) {
      const fn = vi.fn(); const e = ev(key)
      onKeyActivate(fn)(e)
      expect(fn).toHaveBeenCalledOnce()
      expect(e.preventDefault).toHaveBeenCalledOnce()
    }
  })
  it('ignores other keys (Tab, Escape, ArrowDown)', () => {
    for (const key of ['Tab', 'Escape', 'ArrowDown', 'a']) {
      const fn = vi.fn(); const e = ev(key)
      onKeyActivate(fn)(e)
      expect(fn).not.toHaveBeenCalled()
      expect(e.preventDefault).not.toHaveBeenCalled()
    }
  })
})

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (p.endsWith('.tsx')) out.push(p)
  }
  return out
}

// Brace-aware opening-tag scanner. A naive /<a[^>]*>/ regex truncates at the `>`
// inside inline arrow handlers (`onClick={() => f()}`), which previously let
// role="button" controls with an inline onClick slip past this guard. This walks
// the source tracking string/brace depth so each tag's full attribute text is
// captured. Returns [{ tag, text (full <...>), line }].
function openTags(src: string, name: string): { text: string; line: number }[] {
  const out: { text: string; line: number }[] = []
  const pat = '<' + name
  let i = 0
  while (true) {
    const k = src.indexOf(pat, i)
    if (k < 0) break
    const after = src[k + pat.length]
    if (after && /[A-Za-z0-9]/.test(after)) { i = k + pat.length; continue } // e.g. <article
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

const hasKey = (t: string) => /onKey(Down|Up|Press)/.test(t)

describe('non-native interactive controls are keyboard-operable', () => {
  it('role="button" controls with onClick also handle keyboard (brace-aware)', () => {
    const offenders: string[] = []
    for (const f of walk(join(process.cwd(), 'src'))) {
      for (const name of ['a', 'div', 'span', 'li']) {
        for (const { text, line } of openTags(readFileSync(f, 'utf8'), name)) {
          if (/role="button"/.test(text) && /onClick/.test(text) && !hasKey(text)) {
            offenders.push(`${f.replace(process.cwd() + '/', '')}:${line}`)
          }
        }
      }
    }
    expect(offenders, `role="button" control missing a keyboard handler:\n${offenders.join('\n')}`).toEqual([])
  })

  it('self-operated role="radio"/"tab"/"switch"/"checkbox" with onClick handle keyboard', () => {
    // role="option" is excluded — a parent combobox drives it via aria-activedescendant.
    const offenders: string[] = []
    for (const f of walk(join(process.cwd(), 'src'))) {
      for (const name of ['a', 'div', 'span', 'li']) {
        for (const { text, line } of openTags(readFileSync(f, 'utf8'), name)) {
          if (/role="(radio|tab|switch|checkbox)"/.test(text) && /onClick/.test(text) && !hasKey(text)) {
            offenders.push(`${f.replace(process.cwd() + '/', '')}:${line}`)
          }
        }
      }
    }
    expect(offenders, `self-operated ARIA-role control missing a keyboard handler:\n${offenders.join('\n')}`).toEqual([])
  })

  it('href-less <a onClick> link controls are focusable and keyboard-operable', () => {
    // An <a> without href is not focusable or Enter/Space-activatable by default,
    // so an <a onClick> acting as a control needs tabIndex + a keyboard handler.
    const offenders: string[] = []
    for (const f of walk(join(process.cwd(), 'src'))) {
      for (const { text, line } of openTags(readFileSync(f, 'utf8'), 'a')) {
        if (/onClick/.test(text) && !/href=/.test(text) && (!/tabIndex/.test(text) || !hasKey(text))) {
          offenders.push(`${f.replace(process.cwd() + '/', '')}:${line}`)
        }
      }
    }
    expect(offenders, `href-less <a onClick> not keyboard-accessible:\n${offenders.join('\n')}`).toEqual([])
  })
})
