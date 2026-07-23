// Client-side security-regression guard (production gate). This is a static
// source scan that locks in the verified-clean invariants of the frontend so a
// future change cannot silently reintroduce a known client-side vulnerability
// class. It is deterministic and dependency-free (no network, no build), so it
// runs on every PR/merge in CI and fails loudly on regression.
//
// Scope is honest: this app is a client-only SPA (no backend, no server auth,
// no DB), so server/API categories (SQLi, session tokens, rate limiting) are
// N/A. What IS attackable here is the bundle itself and the DOM — which is what
// these assertions cover. Transport/CSP headers are guarded separately by
// securityHeaders.test.ts.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = resolve(__dirname, '..', 'src');

function walk(dir: string, ext: RegExp): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = resolve(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p, ext));
    else if (ext.test(p)) out.push(p);
  }
  return out;
}

const files = walk(SRC, /\.tsx?$/).filter((f) => !/\.test\./.test(f));
const sources = files.map((f) => ({ f, t: readFileSync(f, 'utf8') }));
const hits = (re: RegExp) => sources.filter(({ t }) => re.test(t)).map(({ f }) => f.replace(/.*[\\/]src[\\/]/, 'src/'));

describe('security — client-side source invariants', () => {
  it('no raw HTML injection sinks (XSS): dangerouslySetInnerHTML / innerHTML / outerHTML', () => {
    // React auto-escapes JSX; a raw-HTML sink is the primary way to defeat that.
    expect(hits(/dangerouslySetInnerHTML|\.innerHTML\b|\.outerHTML\b/)).toEqual([]);
  });

  it('no dynamic code execution: eval / new Function', () => {
    expect(hits(/\beval\s*\(|new\s+Function\s*\(/)).toEqual([]);
  });

  it('no javascript: URIs (href/src injection vector)', () => {
    expect(hits(/javascript:/i)).toEqual([]);
  });

  it('every window.open to a new tab is opened with noopener (reverse-tabnabbing safe)', () => {
    // Any window.open( statement in the codebase must carry noopener so the
    // opened page cannot reach back through window.opener.
    for (const { f, t } of sources) {
      for (const line of t.split('\n')) {
        if (line.includes('window.open(')) {
          expect(line, `${f.replace(/.*[\\/]src[\\/]/, 'src/')}: window.open without noopener`).toMatch(/noopener/);
        }
      }
    }
  });

  it('no hardcoded secret material in the shipped source (it would be inlined into the public bundle)', () => {
    // VITE_* client vars are inlined at build time, so a real secret in source
    // = a secret in the public bundle. Catch the common shapes.
    expect(hits(/sk-[A-Za-z0-9]{20}|AKIA[0-9A-Z]{16}|-----BEGIN (?:RSA )?PRIVATE KEY/)).toEqual([]);
  });

  it('production build does not emit source maps (no shipped original source/symbols)', () => {
    // Vite's default is sourcemap:false in prod; assert it is never turned on,
    // which would ship readable source + symbol names to the public.
    const vite = readFileSync(resolve(__dirname, '..', 'vite.config.ts'), 'utf8');
    expect(vite).not.toMatch(/sourcemap:\s*true/);
    expect(vite).not.toMatch(/build:\s*\{[^}]*sourcemap:\s*(true|'inline'|"inline")/s);
  });
});
