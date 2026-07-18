// Help & Support hub — FAQ, troubleshooting, contact, feedback, legal, version.
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';

const PKEY = 'sensei_session_react_v1';
afterEach(() => { cleanup(); localStorage.clear(); });

describe('help & support hub', () => {
  it('renders every hub section with contact, feedback, and version details', async () => {
    localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), view: 'app', route: 'help' }));
    render(<AppStoreProvider><App /></AppStoreProvider>);
    await act(() => new Promise((r) => setTimeout(r, 80)));
    await waitFor(() => expect(document.body.textContent).toContain('שאלות נפוצות'));
    const t = document.body.textContent!;
    for (const section of ['פתרון תקלות', 'קיצורי מקלדת', 'צריכים עזרה נוספת', 'אודות ומידע משפטי', 'שליחת משוב', 'גרסה']) {
      expect(t, section).toContain(section);
    }
    expect(document.querySelector('a[href^="mailto:support@sensei.co.il"]')).toBeTruthy();
  });
});
