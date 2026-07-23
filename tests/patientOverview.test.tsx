// Patient Profile — the structured Patient Overview (summary / goals /
// challenges) replaces the single free-text note, with a separate Therapist
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
  it('presents the overview as a semantic, responsive clinical snapshot', async () => {
    mount({ view: 'app', route: 'patient', patientId: 'simba' });
    const overviewTab = await waitFor(() => {
      const tab = [...document.querySelectorAll('button.pw-tab')].find((el) => el.textContent?.includes('סקירה')) as HTMLButtonElement | undefined;
      if (!tab) throw new Error('patient overview tab is not ready');
      return tab;
    });
    fireEvent.click(overviewTab);
    const overview = await waitFor(() => document.querySelector('.pd-overview'));
    expect(overview?.querySelector('dl.pd-overview-grid')).toBeTruthy();
    expect(overview?.querySelectorAll('dt.pd-overview-label')).toHaveLength(3);
    expect(overview?.querySelector('.pd-overview-card--summary')).toBeTruthy();
  });

  it('shows the three overview sections, plus a distinct therapist-notes area', async () => {
    mount({ view: 'app', route: 'patient', patientId: 'simba' });
    await settle();
    await waitFor(() => expect(document.body.textContent).toContain('סקירת מטופל'));
    const t = document.body.textContent || '';
    expect(t).toContain('סיכום הטיפול הנוכחי');
    expect(t).toContain('מטרות הטיפול המרכזיות');
    expect(t).toContain('אתגרים נוכחיים');
    // Simba-specific content is seeded
    expect(t).toContain('בקניון');
    // separate therapist-notes area (free text)
    expect(t).toContain('הערות המטפל');
  });

  it('every offline roster patient gets a source-backed overview; non-roster ids remain explicitly unknown', async () => {
    const { patientOverviewDefault } = await import('../src/data/patientOverview');
    const generic = patientOverviewDefault('zz-nope');
    expect(generic.summary).toBe('לא צוין במאגר ההדגמה.');
    for (const id of ['aladdin', 'bruce_wayne', 'dumbo', 'elsa', 'simba', 'forrest_gump', 'harry_potter']) {
      const o = patientOverviewDefault(id);
      expect(o.summary, `${id} must have a bespoke summary`).not.toBe(generic.summary);
      // all sections are filled per patient
      expect(o.goals).toBeTruthy();
      expect(o.challenges).toBeTruthy();
    }
    // spot-check the arcs surface in the overview copy
    expect(patientOverviewDefault('aladdin').summary).toContain('יתום שגדל ברחובות');
    expect(patientOverviewDefault('forrest_gump').summary).toContain('ACT');
    expect(patientOverviewDefault('harry_potter').summary).toContain('טראומה מורכבת');
  });

  it('edits and persists an overview field', async () => {
    mount({ view: 'app', route: 'patient', patientId: 'aladdin' });
    await settle();
    fireEvent.click(await waitFor(() => document.querySelector('[aria-label="עריכת סקירת המטופל"]') as HTMLElement));
    const goals = await waitFor(() => document.querySelector('[aria-label="מטרות הטיפול המרכזיות"]') as HTMLTextAreaElement);
    fireEvent.change(goals, { target: { value: 'מטרה מותאמת אישית' } });
    fireEvent.click([...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'שמירה') as HTMLElement);
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(PKEY) || '{}');
      expect(stored.overviewOverrides?.aladdin?.goals).toBe('מטרה מותאמת אישית');
    }, { timeout: 2000 });
    expect(document.body.textContent).toContain('מטרה מותאמת אישית');
  });
});
