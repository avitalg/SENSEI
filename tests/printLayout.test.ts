// Print-layout drift guard. The clinical letter prints via window.print() and a
// global @media print block that hides app chrome BY CLASS NAME. That contract
// is invisible in normal QA — a class rename breaks printing silently. This test
// pins it: every selector the print rules hide must still exist in the app, and
// the letter screen must keep its no-print chrome + print trigger.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const root = resolve(__dirname, '..');
const globalCss = readFileSync(resolve(root, 'src/styles/global.css'), 'utf8');

function allSrc(): string {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(tsx?|css)$/.test(name)) out.push(readFileSync(p, 'utf8'));
    }
  };
  walk(resolve(root, 'src'));
  return out.join('\n');
}
const src = allSrc();

describe('print layout — selector contract', () => {
  const printBlock = globalCss.slice(globalCss.indexOf('@media print'));
  it('has a print block that hides app chrome and dialogs', () => {
    expect(printBlock).toContain('@media print');
    expect(printBlock).toContain("[role='dialog']");
  });

  it('every class the print rules hide still exists somewhere in src (no silent drift)', () => {
    const classes = [...printBlock.matchAll(/\.([a-z][a-z0-9-]+)/g)].map((m) => m[1]);
    expect(classes.length).toBeGreaterThan(3);
    for (const cls of classes) {
      expect(src.includes(cls), `print rule hides ".${cls}" but no such class exists in src — printing silently broke`).toBe(true);
    }
  });

  it('the letter screen keeps its print trigger and no-print chrome', () => {
    const letter = readFileSync(resolve(root, 'src/pages/LetterPage.tsx'), 'utf8');
    expect(letter).toContain('window.print()');
    expect(letter).toContain('no-print');
  });
});

describe('history directory rows — UA button-border reset (white-lines regression)', () => {
  // <button> with only borderTop overridden inherits the UA default border on
  // the other three sides — which renders WHITE in dark mode (the reported
  // "white boxes" around directory rows). The style must reset `border` first.
  it("mh-dir-row style resets border before applying the top divider", () => {
    const src = readFileSync(resolve(root, 'src/pages/PatientMeetingHistoryPage.tsx'), 'utf8');
    const rowStyle = src.match(/className="mh-dir-row"[\s\S]{0,400}?style=\{\{([\s\S]*?)\}\}/)?.[1] || '';
    expect(rowStyle, 'row style found').toBeTruthy();
    expect(rowStyle).toContain("border: 'none'");
    expect(rowStyle.indexOf("border: 'none'")).toBeLessThan(rowStyle.indexOf('borderTop'));
  });
});
