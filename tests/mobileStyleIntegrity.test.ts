import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const mobileCss = readFileSync(join(process.cwd(), 'src', 'components', 'mobile', 'mobile.css'), 'utf8');
const patientsCss = readFileSync(join(process.cwd(), 'src', 'pages', 'patients.css'), 'utf8');

describe('mobile style integrity', () => {
  it('keeps the shared safe-area bottom sheet after removing the global capture FAB', () => {
    expect(mobileCss).toContain('.mob-sheet-scrim');
    expect(mobileCss).toContain('.mob-sheet {');
    expect(mobileCss).toContain('safe-area-inset-bottom');
    expect(mobileCss).toContain('overscroll-behavior: contain');
    expect(mobileCss).not.toContain('.mob-fab');
  });

  it('keeps the AI launcher compact, reachable, and clear of the safe area', () => {
    expect(mobileCss).toContain('.mob-shell .shell-fab');
    expect(mobileCss).toContain('safe-area-inset-bottom');
    expect(mobileCss).toContain('width:48px;height:48px');
    expect(mobileCss).toContain('inset-inline-end:16px');
  });

  it('preserves reduced-motion handling and mobile form target sizes', () => {
    expect(mobileCss).toContain('@media (prefers-reduced-motion: reduce)');
    expect(mobileCss).toContain('.mob-shell .doc-mobile-category');
    expect(mobileCss).toContain('min-height: 44px !important');
    expect(mobileCss).toMatch(/\.mob-iconbtn\s*\{[\s\S]*?width:\s*44px;[\s\S]*?height:\s*44px;/);
  });

  it('switches the patient roster to cards before wide-phone columns become cramped', () => {
    expect(patientsCss).toContain('@media (max-width: 640px)');
    expect(patientsCss).toContain('.pat-thead { display: none; }');
    expect(patientsCss).toContain('.pat-mobile-capture { display: inline-flex; width: 44px; height: 44px; }');
    expect(patientsCss).toContain('.pat-open-btn { min-height: 44px; }');
    expect(patientsCss).toContain('.pat-row-actions .rowmenu-trigger { width: 44px !important; height: 44px !important; }');
  });
});
