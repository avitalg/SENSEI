import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const mobileCss = readFileSync(join(process.cwd(), 'src', 'components', 'mobile', 'mobile.css'), 'utf8');
const patientsCss = readFileSync(join(process.cwd(), 'src', 'pages', 'patients.css'), 'utf8');
const dashboardCss = readFileSync(join(process.cwd(), 'src', 'pages', 'dashboard.css'), 'utf8');
const reportCss = readFileSync(join(process.cwd(), 'src', 'pages', 'report.css'), 'utf8');
const dayViewSource = readFileSync(join(process.cwd(), 'src', 'components', 'mobile', 'MobileDayView.tsx'), 'utf8');
const mobilePatientSource = readFileSync(join(process.cwd(), 'src', 'components', 'mobile', 'MobilePatient.tsx'), 'utf8');
const uploadSource = readFileSync(join(process.cwd(), 'src', 'pages', 'UploadPage.tsx'), 'utf8');
const reportSource = readFileSync(join(process.cwd(), 'src', 'pages', 'NextMeetingReportPage.tsx'), 'utf8');

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
    const compactValueRule = patientsCss.indexOf('.pat-row .pat-cell[data-label] {');
    const emptyValueRule = patientsCss.indexOf('.pat-row .pat-col-phone.is-empty');
    expect(emptyValueRule).toBeGreaterThan(compactValueRule);
    expect(patientsCss).toContain('.pat-row .pat-col-time.is-empty { display: none; }');
  });

  it('keeps primary mobile workflow controls at a real or expanded 44px target', () => {
    expect(dayViewSource).toContain('minHeight: 44');
    expect(mobileCss).toMatch(/\.mob-back\s*\{[\s\S]*?width:\s*44px;[\s\S]*?height:\s*44px;/);
    expect(mobilePatientSource).toContain('className="mob-back tap44"');
    expect(dashboardCss).toContain('.calh-today-btn, .calh-new-btn, .calh-seg-btn, .calh-icon-btn { min-height: 44px; }');
    expect(dashboardCss).toContain('.calh-icon-btn { width: 44px; }');
    expect(dashboardCss).toContain('@media (min-width: 768px) and (max-width: 1024px)');
    expect(patientsCss).toMatch(/@media \(max-width: 1000px\)[\s\S]*?\.pat-open-btn \{ min-height: 44px; \}/);
    expect(uploadSource).toContain('className="upl-policy-link tap44"');
    expect(reportCss).toMatch(/\.rep-refresh-btn\s*\{[\s\S]*?min-height:\s*44px;/);
    expect(reportSource).toContain('className="rep-crumb tap44"');
    expect(reportSource).toContain('className="rep-history-link tap44"');
  });
});
