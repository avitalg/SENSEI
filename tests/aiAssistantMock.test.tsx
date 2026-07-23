// Demo/offline mode: with no backend configured, the assistant keeps its original
// deterministic canned answers so the client-only build behaves exactly as before.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import AiAssistant from '../src/components/layout/AiAssistant';

afterEach(() => { cleanup(); localStorage.clear(); });

function mount() {
  return render(
    <AppStoreProvider>
      <AiAssistant />
    </AppStoreProvider>,
  );
}

describe('AiAssistant — demo mode (no backend)', () => {
  it('opens from the FAB and answers with the canned response', async () => {
    mount();

    fireEvent.click(document.querySelector('[aria-label="שאל את סנסיי"]') as HTMLElement);
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();

    const input = document.querySelector('[aria-label="הקלדת שאלה"]') as HTMLInputElement;
    fireEvent.input(input, { target: { value: 'מי המטופלים בסיכון גבוה?' } });
    fireEvent.click(document.querySelector('[aria-label="שליחה"]') as HTMLElement);

    // The user's message shows immediately; the canned answer arrives after the delay.
    await waitFor(
      () => expect(document.body.textContent).toContain('סומנו ברמת סיכון גבוהה'),
      { timeout: 2000 },
    );
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
