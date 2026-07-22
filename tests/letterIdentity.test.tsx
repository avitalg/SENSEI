// The clinical letter is an exportable, signed document, so its signatory —
// body attribution AND footer — must come from the therapist's saved profile
// (single source of truth), never a hardcoded identity. A therapist with a
// non-default name/license must not export a letter attributed to someone else.
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';

const PKEY = 'sensei_session_react_v1';
const settle = () => act(() => new Promise((r) => setTimeout(r, 80)));
afterEach(() => { cleanup(); localStorage.clear(); });

const CUSTOM = { name: 'ד״ר מיה ברקוביץ', title: 'פסיכולוגית שיקומית', gender: 'f', email: 'maya@clinic.example', phone: '050-000-0000', license: '99-777111', org: 'מרפאה', bio: '', avatar: '', avatarColor: '#123456' };

describe('clinical letter — signatory comes from the saved profile (no hardcoded identity)', () => {
  it('attributes the letter body + signature to the profile, not the seed default', async () => {
    localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), view: 'app', route: 'letter', patientId: 'p1', profile: CUSTOM }));
    render(<AppStoreProvider><App /></AppStoreProvider>);
    await settle();
    const main = await waitFor(() => { const m = document.querySelector('#main-content'); expect(m?.textContent).toContain('מכתב קליני'); return m!; });
    const text = main.textContent || '';
    // signatory identity is the saved profile
    expect(text).toContain('ד״ר מיה ברקוביץ');
    expect(text).toContain('99-777111');
    expect(text).toContain('maya@clinic.example');
    // and NOT the hardcoded seed clinician that used to be baked into the body
    expect(text).not.toContain('רותם שגב');
    expect(text).not.toContain('27-104882');
  });
});
