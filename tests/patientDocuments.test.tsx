// Patient Profile — Documents section: the built-in clinical letter plus a real
// add/categorize/delete flow for uploaded documents (metadata persisted).
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

const doc = { id: 'd1', name: 'הפניה_רופא.pdf', category: 'אחר', addedAt: '2026-07-01T10:00:00Z', size: 1200 };

describe('patient profile — documents section', () => {
  it('shows the clinical letter and an upload control', async () => {
    mount({ view: 'app', route: 'patient', patientId: 'aladdin' });
    await settle();
    await waitFor(() => expect(document.body.textContent).toContain('מסמכים'));
    expect(document.body.textContent).toContain('מכתב קליני');
    expect(document.querySelector('[aria-label="העלאת מסמך"]'), 'upload control').toBeTruthy();
    // clinical letter is openable
    expect(document.querySelector('[aria-label="פתיחת המכתב הקליני"]')).toBeTruthy();
  });

  it('lists an uploaded document with categorize + delete, and deletes it', async () => {
    mount({ view: 'app', route: 'patient', patientId: 'aladdin', documentsByPatient: { aladdin: [doc] } });
    await settle();
    await waitFor(() => expect(document.body.textContent).toContain('הפניה_רופא.pdf'));
    // categorization is available
    expect(document.querySelector('[aria-label="קטגוריה · הפניה_רופא.pdf"]')).toBeTruthy();
    // delete removes it from the store
    fireEvent.click(document.querySelector('[aria-label="מחיקת הפניה_רופא.pdf"]') as HTMLElement);
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(PKEY) || '{}');
      expect((stored.documentsByPatient?.aladdin || []).length).toBe(0);
    }, { timeout: 2000 });
  });

  it('deleting a document offers a one-click undo that restores it', async () => {
    mount({ view: 'app', route: 'patient', patientId: 'aladdin', documentsByPatient: { aladdin: [doc] } });
    await settle();
    await waitFor(() => expect(document.body.textContent).toContain('הפניה_רופא.pdf'));
    fireEvent.click(document.querySelector('[aria-label="מחיקת הפניה_רופא.pdf"]') as HTMLElement);
    // the toast carries an undo action (delete is destructive → recoverable)
    const undo = await waitFor(() => {
      const b = document.querySelector('.shell-toast-action') as HTMLElement;
      expect(b, 'undo action on the delete toast').toBeTruthy();
      return b;
    });
    fireEvent.click(undo);
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(PKEY) || '{}');
      expect((stored.documentsByPatient?.aladdin || []).map((d: any) => d.id)).toEqual(['d1']);
    });
    expect(document.body.textContent).toContain('הפניה_רופא.pdf');
  });
});
