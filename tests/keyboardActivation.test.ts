// WCAG 2.1.1 guard — every FOCUSABLE non-native control must be operable by
// keyboard, not just by mouse. An element with role="button"/"radio"/"switch"
// and tabIndex={0} is reachable via Tab; if it only wires onClick, Enter/Space
// do nothing and the control is a dead end for keyboard and switch users.
//
// This scans source rather than rendering, so a NEW violation anywhere in the
// app fails the build — the class of bug cannot silently return. Use the
// canonical onKeyActivate helper (src/utils/a11y.ts) to satisfy it.
//
// Deliberately NOT flagged: tabIndex={-1} elements (removed from the tab order
// on purpose, e.g. the AI panel's pointer-only drag-resize grip) — there is no
// keyboard affordance to provide because there is nothing to activate.
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const INTERACTIVE_ROLES = ['button', 'radio', 'switch', 'checkbox', 'menuitem', 'tab', 'link'];

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) sourceFiles(p, out);
    else if (/\.tsx$/.test(e.name)) out.push(p);
  }
  return out;
}

// Slice out the JSX opening tag surrounding `at`, brace-aware so style={{…}}
// and arrow handlers don't terminate the tag early.
function enclosingTag(src: string, at: number): string {
  const start = src.lastIndexOf('<', at);
  let depth = 0, end = at;
  for (; end < src.length; end++) {
    const c = src[end];
    if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (c === '>' && depth === 0) break;
  }
  return src.slice(start, end + 1);
}

function violations(): string[] {
  const hits: string[] = [];
  for (const file of sourceFiles('src')) {
    const src = readFileSync(file, 'utf8');
    for (const role of INTERACTIVE_ROLES) {
      const needle = `role="${role}"`;
      let i = 0;
      while ((i = src.indexOf(needle, i)) !== -1) {
        const tag = enclosingTag(src, i);
        // Only focusable controls; tabIndex={-1} is intentionally unreachable.
        if (/tabIndex=\{0\}/.test(tag) && !/onKeyDown/.test(tag)) {
          const line = src.slice(0, i).split('\n').length;
          hits.push(`${file.split(/[\\/]/).join('/')}:${line} (role="${role}")`);
        }
        i += needle.length;
      }
    }
  }
  return hits;
}

describe('keyboard activation (WCAG 2.1.1)', () => {
  it('every focusable role="button"-style control has an onKeyDown handler', () => {
    expect(violations(), 'add onKeyDown={onKeyActivate(fn)} — see src/utils/a11y.ts').toEqual([]);
  });

  it('the canonical helper activates on Enter and Space only, and prevents default', async () => {
    const { onKeyActivate } = await import('../src/utils/a11y');
    for (const key of ['Enter', ' ']) {
      let fired = 0, prevented = 0;
      onKeyActivate(() => { fired++; })({ key, preventDefault: () => { prevented++; } } as any);
      expect(fired, key).toBe(1);
      expect(prevented, key).toBe(1);
    }
    let other = 0;
    onKeyActivate(() => { other++; })({ key: 'a', preventDefault: () => {} } as any);
    expect(other).toBe(0);
  });
});
