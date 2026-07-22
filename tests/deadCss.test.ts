// Dead-CSS ratchet — a class defined in a stylesheet but referenced by no
// component ships to every user and misleads the next maintainer (it reads like
// live styling). This counts them and holds the line: lower the baseline as they
// are removed, never raise it. Same idiom as the hardcoded-hex ratchet in
// canonical.test.ts.
//
// The remaining entries are all rules living INSIDE @media blocks. They were left
// in place deliberately: removing a media-query rule can empty or unbalance the
// block around it, and several selectors (e.g. two different `max-width:860px`
// blocks in tokens.css) repeat, so a mechanical edit is genuinely unsafe. Remove
// them by hand, one at a time, and drop BASELINE accordingly.
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { sourceLines, stripLineComment } from './sourceScan';

const SRC = 'src';
function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}

const all = walk(SRC);
// Strip comments so a class merely *mentioned* in prose never counts as "used".
const codeText = all
  .filter((f) => /\.(ts|tsx)$/.test(f))
  .map((f) => readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''))
  .map((t) => sourceLines(t).map(stripLineComment).join('\n'))
  .join('\n');

function unreferenced(): string[] {
  const dead: string[] = [];
  const seen = new Set<string>();
  for (const f of all.filter((x) => /\.css$/.test(x))) {
    const css = readFileSync(f, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/url\([^)]*\)/g, ''); // font paths / data URIs are not selectors
    // A class selector sits at a selector position — never mid-token, so
    // "www.w3.org" and "Heebo.ttf" are not mistaken for classes.
    for (const m of css.matchAll(/(?:^|[\s,{}>+~()[])\.(-?[a-zA-Z_][\w-]*)/g)) {
      const cls = m[1];
      const key = `${f}|${cls}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const esc = cls.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      if (!new RegExp(`(^|[^\\w-])${esc}([^\\w-]|$)`).test(codeText)) {
        dead.push(`${f.split(/[\\/]/).join('/')} .${cls}`);
      }
    }
  }
  return dead.sort();
}

describe('CSS hygiene — unreferenced classes do not grow', () => {
  const BASELINE = 7;
  it(`count <= ${BASELINE}`, () => {
    const dead = unreferenced();
    expect(dead.length, `unreferenced CSS classes:\n${dead.join('\n')}`).toBeLessThanOrEqual(BASELINE);
  });

  it('detects a newly-orphaned class (guard is not vacuous)', () => {
    // Prove the matcher actually resolves usage rather than passing by accident:
    // a class that IS referenced must not be reported, an invented one must be.
    const esc = (c: string) => new RegExp(`(^|[^\\w-])${c}([^\\w-]|$)`).test(codeText);
    expect(esc('app-sidebar'), 'a live class is seen as referenced').toBe(true);
    expect(esc('zz-not-a-real-class'), 'an invented class is not').toBe(false);
  });
});
