import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';

const PKEY = 'sensei_session_react_v1';
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 80)));

afterEach(() => {
  cleanup();
  localStorage.clear();
});

async function openNotifications() {
  localStorage.setItem(PKEY, JSON.stringify({
    __savedAt: Date.now(),
    view: 'app',
    route: 'notifications',
    notifRead: [],
    notifArchived: [],
    notifFilter: 'all',
  }));
  render(<AppStoreProvider><App /></AppStoreProvider>);
  await settle();
  await waitFor(() => expect(document.querySelector('#main-content')?.textContent).toContain('מרכז ההתראות'));
}

describe('notification center — canonical repository mode', () => {
  it('shows an honest empty state because the repository has no notification events', async () => {
    await openNotifications();
    const text = document.querySelector('#main-content')?.textContent || '';
    expect(text).toContain('0 התראות שלא נקראו מתוך 0 פעילות');
    expect(text).toContain('אין התראות פעילות כרגע');
    expect(text).not.toContain('סיכום AI מוכן');
    expect(text).not.toContain('פגישה בוטלה');
  });

  it('keeps every category filter empty without inventing records', async () => {
    await openNotifications();
    const riskFilter = [...document.querySelectorAll('[role="button"]')]
      .find((node) => node.getAttribute('aria-label') === 'סינון: דגלי סיכון') as HTMLElement;
    fireEvent.click(riskFilter);
    await waitFor(() => expect(document.querySelector('#main-content')?.textContent).toContain('אין דגלי סיכון'));
  });
});
