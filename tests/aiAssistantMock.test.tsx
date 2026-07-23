// Demo/offline mode: with no backend configured, the assistant keeps its original
// deterministic canned answers so the client-only build behaves exactly as before.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import AiAssistant from '../src/components/layout/AiAssistant';
import { AI_WELCOME_MESSAGE } from '../src/data/seed';

afterEach(() => { cleanup(); localStorage.clear(); });

function mount() {
  return render(
    <AppStoreProvider>
      <AiAssistant />
    </AppStoreProvider>,
  );
}

describe('AiAssistant — demo mode (no backend)', () => {
  it('shows the Hebrew welcome message in RTL', () => {
    mount();
    fireEvent.click(document.querySelector('[aria-label="שאל את סנסיי"]') as HTMLElement);
    const message = [...document.querySelectorAll('[role="log"] [dir="rtl"]')]
      .find((el) => el.textContent === AI_WELCOME_MESSAGE);
    expect(message).toBeTruthy();
    expect(message?.textContent).toBe('שלום שגב, אני Sensei. אני כאן כדי לחשוב איתך. אפשר להתייעץ איתי על דילמות, להתכונן לפגישות, לזהות מגמות ודפוסים ולהרחיב את נקודת המבט באמצעות כיווני חשיבה נוספים.');
  });

  it('migrates a persisted legacy greeting without deleting the conversation', async () => {
    localStorage.setItem('sensei_session_react_v1', JSON.stringify({
      aiMessages: [
        { role: 'ai', text: 'שלום שגב' },
        { role: 'me', text: 'שאלה שמורה' },
        { role: 'ai', text: 'תשובה שמורה' },
      ],
    }));
    mount();
    fireEvent.click(document.querySelector('[aria-label="שאל את סנסיי"]') as HTMLElement);
    await waitFor(() => expect(document.body.textContent).toContain(AI_WELCOME_MESSAGE));
    expect(document.body.textContent).toContain('שאלה שמורה');
    expect(document.body.textContent).toContain('תשובה שמורה');
  });

  it('opens from the FAB and answers with the canned response', async () => {
    mount();

    fireEvent.click(document.querySelector('[aria-label="שאל את סנסיי"]') as HTMLElement);
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();

    const input = document.querySelector('[aria-label="הקלדת שאלה"]') as HTMLTextAreaElement;
    fireEvent.input(input, { target: { value: 'מי המטופלים בסיכון גבוה?' } });
    fireEvent.click(document.querySelector('[aria-label="שליחה"]') as HTMLElement);

    // The user's message shows immediately; the canned answer arrives after the delay.
    await waitFor(
      () => expect(document.body.textContent).toContain('סומנו ברמת סיכון גבוהה'),
      { timeout: 2000 },
    );
  });

  it('uses an accessible multiline composer and blocks empty submissions', () => {
    mount();
    fireEvent.click(document.querySelector('[aria-label="שאל את סנסיי"]') as HTMLElement);

    const input = document.querySelector('[aria-label="הקלדת שאלה"]') as HTMLTextAreaElement;
    const send = document.querySelector('[aria-label="שליחה"]') as HTMLButtonElement;
    expect(input.tagName).toBe('TEXTAREA');
    expect(send.disabled).toBe(true);

    fireEvent.input(input, { target: { value: 'שורה ראשונה\nשורה שנייה' } });
    expect(send.disabled).toBe(false);
  });

  it('exposes header actions and suggestion chips as native buttons', () => {
    mount();
    fireEvent.click(document.querySelector('[aria-label="שאל את סנסיי"]') as HTMLElement);

    expect(document.querySelector('[aria-label="הרחבה למסך מלא"]')?.tagName).toBe('BUTTON');
    expect(document.querySelector('[aria-label="סגירה"]')?.tagName).toBe('BUTTON');
    expect(document.querySelector('.shell-ai-chip')?.tagName).toBe('BUTTON');
  });

  it('closes with Escape and returns keyboard focus to the launcher', async () => {
    mount();
    fireEvent.click(document.querySelector('[aria-label="שאל את סנסיי"]') as HTMLElement);
    expect(document.querySelector('[role="dialog"]')).toBeTruthy();

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      const launcher = document.querySelector('.shell-fab');
      expect(document.querySelector('[role="dialog"]')).toBeNull();
      expect(document.activeElement).toBe(launcher);
    });
  });

  it('clicking a suggestion chip sends that exact question', async () => {
    mount();
    fireEvent.click(document.querySelector('[aria-label="שאל את סנסיי"]') as HTMLElement);

    const chip = [...document.querySelectorAll('.shell-ai-chip')].find(
      (el) => el.textContent === 'מתי נפגשתי לאחרונה עם סימבה?',
    );
    expect(chip).toBeTruthy();
    fireEvent.click(chip as HTMLElement);

    // The chip's exact question is sent as the user's message.
    await waitFor(() =>
      expect(document.body.textContent).toContain('מתי נפגשתי לאחרונה עם סימבה?'),
    );
    // And a real, patient-specific answer follows — Simba (p5) is a keyed name
    // with matching PTSD data, so the suggestion never dead-ends on the generic
    // fallback.
    await waitFor(
      () => expect(document.body.textContent).toContain('סימבה (מפגש 5'),
      { timeout: 2000 },
    );
  });
  it('starter chips are shown when fresh and hidden once the user has asked', async () => {
    mount();
    fireEvent.click(document.querySelector('[aria-label="שאל את סנסיי"]') as HTMLElement);
    // fresh (seed greeting only, no user message) → starter chips present
    expect(document.querySelectorAll('.shell-ai-chip').length).toBeGreaterThan(0);
    const chip = [...document.querySelectorAll('.shell-ai-chip')].find(
      (el) => el.textContent === 'מתי נפגשתי לאחרונה עם סימבה?',
    ) as HTMLElement;
    fireEvent.click(chip);
    await waitFor(() => expect(document.body.textContent).toContain('מתי נפגשתי לאחרונה עם סימבה?'));
    // once the user has asked, the starter chips stop competing for panel space
    expect(document.querySelectorAll('.shell-ai-chip').length).toBe(0);
  });
});
