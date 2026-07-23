import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const mobileCss = readFileSync(join(process.cwd(), 'src', 'components', 'mobile', 'mobile.css'), 'utf8');

describe('mobile style integrity', () => {
  it('keeps the shared safe-area bottom sheet after removing the global capture FAB', () => {
    expect(mobileCss).toContain('.mob-sheet-scrim');
    expect(mobileCss).toContain('.mob-sheet {');
    expect(mobileCss).toContain('safe-area-inset-bottom');
    expect(mobileCss).toContain('overscroll-behavior: contain');
    expect(mobileCss).not.toContain('.mob-fab');
  });

  it('preserves reduced-motion handling and mobile form target sizes', () => {
    expect(mobileCss).toContain('@media (prefers-reduced-motion: reduce)');
    expect(mobileCss).toContain('.mob-shell .doc-mobile-category');
    expect(mobileCss).toContain('min-height: 44px !important');
  });
});
