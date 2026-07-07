// A11y invariant (WCAG 2.1.1, Keyboard): a non-native control that carries
// role="button" and an onClick must ALSO wire a keyboard handler — unlike a
// native <button>, an <a>/<div>/<span> with role="button" gets no automatic
// Enter/Space activation, so keyboard-only users cannot operate it without one.
// The canonical helper is onKeyActivate (src/utils/a11y.ts). This guard keeps
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

describe('non-native role="button" controls are keyboard-operable', () => {
  it('every <a>/<div>/<span>/<li> with role="button" + onClick also has onKeyDown/Up/Press', () => {
    const offenders: string[] = []
    const tag = /<(a|div|span|li)\b((?:[^>]|\n)*?)>/g
    for (const f of walk(join(process.cwd(), 'src'))) {
      const s = readFileSync(f, 'utf8')
      let m: RegExpExecArray | null
      while ((m = tag.exec(s))) {
        const attrs = m[2]
        if (/role="button"/.test(attrs) && /onClick/.test(attrs) && !/onKey(Down|Up|Press)/.test(attrs)) {
          offenders.push(`${f.replace(process.cwd() + '/', '')}:${s.slice(0, m.index).split('\n').length}`)
        }
      }
    }
    expect(offenders, `role="button" control missing a keyboard handler:\n${offenders.join('\n')}`).toEqual([])
  })
})
