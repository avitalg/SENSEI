// The global Escape cascade must dismiss the surface the user is actually
// looking at, i.e. the TOPMOST one. Stacking (from the components' zIndex):
// nav drawer 200 > command palette / shortcuts 180 > dialog 160 > AI panel 150.
//
// The regression this locks: the cascade checked the non-modal AI panel BEFORE
// the modal dialog, so with both open Escape closed the panel *behind* the
// dialog. Because the dialog covers it and holds focus, the first Escape looked
// like it did nothing, and the modal needed a second press to dismiss.
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AppStoreProvider, useApp } from '../src/store/AppStore';

function Harness() {
  const { S, set } = useApp();
  return (
    <div>
      <button data-testid="open-both" onClick={() => set({ aiOpen: true, dialog: 'create' })}>both</button>
      <button data-testid="open-palette" onClick={() => set({ cmdOpen: true, dialog: 'create' })}>palette</button>
      <span data-testid="ai">{String(!!S.aiOpen)}</span>
      <span data-testid="dialog">{String(S.dialog)}</span>
      <span data-testid="cmd">{String(!!S.cmdOpen)}</span>
    </div>
  );
}

const mount = () => render(<AppStoreProvider><Harness /></AppStoreProvider>);
const esc = () => act(() => { fireEvent.keyDown(window, { key: 'Escape' }); });
const val = (id: string) => screen.getByTestId(id).textContent;

afterEach(() => { cleanup(); localStorage.clear(); });

describe('global Escape cascade — topmost overlay first', () => {
  it('closes the modal dialog before the AI panel behind it', () => {
    mount();
    fireEvent.click(screen.getByTestId('open-both'));
    expect(val('dialog')).toBe('create');
    expect(val('ai')).toBe('true');

    esc();
    expect(val('dialog'), 'the dialog (z-160, modal) closes first').toBe('null');
    expect(val('ai'), 'the AI panel behind it stays open').toBe('true');

    esc();
    expect(val('ai'), 'a second Escape then closes the AI panel').toBe('false');
  });

  it('still closes the command palette before a dialog underneath it', () => {
    // The palette (z-180) sits ABOVE the dialog, so it must keep priority —
    // guards against "fixing" the order by simply moving dialog to the top.
    mount();
    fireEvent.click(screen.getByTestId('open-palette'));
    esc();
    expect(val('cmd')).toBe('false');
    expect(val('dialog'), 'the dialog underneath survives the first Escape').toBe('create');

    esc();
    expect(val('dialog')).toBe('null');
  });
});
