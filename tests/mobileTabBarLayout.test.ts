// Mobile shell + tab bar layout contract — keeps the bottom nav pinned to the
// viewport edges on iOS/Android. Static CSS assertions (same style as the
// sidebar 100dvh contract) so a regression to height-only sizing can't land
// quietly and reopen a gap under the tab bar.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

describe('mobile tab bar — viewport pin contract', () => {
  const css = fs.readFileSync('src/components/mobile/mobile.css', 'utf8');
  const html = fs.readFileSync('index.html', 'utf8');

  it('shell is pinned with position:fixed + inset:0 (not height-only dvh)', () => {
    expect(css).toMatch(/\.mob-shell\s*\{[^}]*position:\s*fixed/s);
    expect(css).toMatch(/\.mob-shell\s*\{[^}]*inset:\s*0/s);
    expect(css).toMatch(/\.mob-shell\s*\{[^}]*overflow:\s*hidden/s);
  });

  it('page scroll lives in .mob-content; tab bar is in-flow (not position:fixed)', () => {
    expect(css).toMatch(/\.mob-content\s*\{[^}]*overflow-y:\s*auto/s);
    expect(css).toMatch(/\.mob-tabbar\s*\{[^}]*flex-shrink:\s*0/s);
    expect(css).not.toMatch(/\.mob-tabbar\s*\{[^}]*position:\s*fixed/s);
  });

  it('day-view meeting list is not a nested scroller (single page scroll)', () => {
    // .mob-list must not reclaim leftover flex height with its own overflow —
    // that left appointments in a tiny inner pane under tall focus cards.
    const listRule = css.match(/\.mob-list\s*\{[^}]*\}/);
    expect(listRule, '.mob-list rule present').toBeTruthy();
    expect(listRule![0]).not.toMatch(/overflow-y\s*:/);
    expect(listRule![0]).not.toMatch(/flex\s*:\s*1/);
  });

  it('safe-area padding keeps a 0px fallback (no Android double-gap)', () => {
    expect(css).toMatch(/env\(safe-area-inset-bottom,\s*0px\)/);
  });

  it('viewport-fit=cover enables safe-area env on notched devices', () => {
    expect(html).toMatch(/viewport-fit=cover/);
  });
});
