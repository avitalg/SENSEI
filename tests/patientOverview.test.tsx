// Patient Profile — the structured Patient Overview (summary / goals / challenges
// / prep notes) replaces the single free-text note, with a separate Therapist
// Notes area kept alongside.
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';

const PKEY = 'sensei_session_react_v1';
function mount(patch: Record<string, any>) {
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), ...patch }));
  return render(<AppStoreProvider><App /></AppStoreProvider>);
}
const settle = () => act(() => new Promise((r) => setTimeout(r, 120)));
afterEach(() => { cleanup(); localStorage.clear(); });

describe('patient profile — structured overview + therapist notes', () => {
  it('shows the four overview sections, plus a distinct therapist-notes area', async () => {
    mount({ view: 'app', route: 'patient', patientId: 'p5' });
    await settle();
    await waitFor(() => expect(document.body.textContent).toContain('סקירת מטופל'));
    const t = document.body.textContent || '';
    expect(t).toContain('סיכום הטיפול הנוכחי');
    expect(t).toContain('מטרות הטיפול המרכזיות');
    expect(t).toContain('אתגרים נוכחיים');
    expect(t).toContain('הערות לקראת הפגישה הקרובה');
    // Simba-specific content is seeded
    expect(t).toContain('מופאסה');
    // separate therapist-notes area (free text)
    expect(t).toContain('הערות המטפל');
  });

  it('every offline roster patient gets a bespoke (non-placeholder) overview; non-roster ids share the default', async () => {
    const { patientOverviewDefault } = await import('../src/data/patientOverview');
    const generic = patientOverviewDefault('zz-nope');
    expect(generic.summary).toContain('מטופל בטיפול מתמשך'); // neutral default
    for (const id of ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7']) {
      const o = patientOverviewDefault(id);
      expect(o.summary, `${id} must have a bespoke summary`).not.toBe(generic.summary);
      // all four sections are filled per patient
      expect(o.goals).toBeTruthy();
      expect(o.challenges).toBeTruthy();
      expect(o.prep).toBeTruthy();
    }
    // spot-check the arcs surface in the overview copy
    expect(patientOverviewDefault('p1').summary).toContain('חרדת ביצוע');
    expect(patientOverviewDefault('p6').summary).toContain('ACT');
    expect(patientOverviewDefault('p7').summary).toContain('טראומה מורכבת');
  });

  it('edits and persists an overview field', async () => {
    mount({ view: 'app', route: 'patient', patientId: 'p1' });
    await settle();
    fireEvent.click(await waitFor(() => document.querySelector('[aria-label="עריכת סקירת המטופל"]') as HTMLElement));
    const goals = await waitFor(() => document.querySelector('[aria-label="מטרות הטיפול המרכזיות"]') as HTMLTextAreaElement);
    fireEvent.change(goals, { target: { value: 'מטרה מותאמת אישית' } });
    fireEvent.click([...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'שמירה') as HTMLElement);
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(PKEY) || '{}');
      expect(stored.overviewOverrides?.p1?.goals).toBe('מטרה מותאמת אישית');
    }, { timeout: 2000 });
    expect(document.body.textContent).toContain('מטרה מותאמת אישית');
  });
});
