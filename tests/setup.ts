import '@testing-library/jest-dom'
import { beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// jsdom shares one window.location.hash across a file's tests. Deep-link
// routing (src/nav/urlHash.ts) reads it on mount, so a fragment left by one
// test would leak into the next and select the wrong route. Reset before every
// test to keep the suite order-independent and deterministic.
beforeEach(() => { if (window.location.hash) window.location.hash = '' })

// Load the Hebrew-grammar layer the same way index.html does in production,
// so tests exercise the real window.HG code paths (gendered microcopy) instead
// of the guarded fallbacks. Without this, HG-dependent screens run untested.
try {
  const hgSrc = readFileSync(join(process.cwd(), 'public/hebrew-grammar.js'), 'utf8')
  ;(0, eval)(hgSrc) // indirect eval → runs in global scope, sets window.HG
} catch { /* leave HG undefined; guards must handle it */ }

// jsdom lacks a few browser APIs the app uses.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false, media: query, onchange: null,
    addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as any
}
if (!window.scrollTo) window.scrollTo = (() => {}) as any
if (!Element.prototype.scrollTo) (Element.prototype as any).scrollTo = () => {}
