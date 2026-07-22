// Regression tests for the modal focus-trap hook: Tab/Shift+Tab must cycle
// within the overlay (not escape to the background), and focus must return to
// the trigger when the overlay closes.
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useFocusTrap } from '../src/hooks/useFocusTrap';

function Harness() {
  const [open, setOpen] = useState(false);
  const ref = useFocusTrap<HTMLDivElement>(open);
  return (
    <div>
      <button data-testid="trigger" onClick={() => setOpen(true)}>open</button>
      <button data-testid="background">background control</button>
      {open && (
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-labelledby="t"
          aria-describedby="d"
          onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
        >
          <h2 id="t">title</h2>
          <p id="d">desc</p>
          <button data-testid="first">first</button>
          <button data-testid="mid">mid</button>
          <button data-testid="last" onClick={() => setOpen(false)}>close</button>
        </div>
      )}
    </div>
  );
}

// Overlay containing a roving-tabindex item (tabIndex={-1}) ahead of the real
// controls — the ShareMenu / menu-widget pattern.
function TabIndexHarness() {
  const [open, setOpen] = useState(false);
  const ref = useFocusTrap<HTMLDivElement>(open);
  return (
    <div>
      <button data-testid="trigger" onClick={() => setOpen(true)}>open</button>
      {open && (
        <div ref={ref} role="dialog" aria-label="d">
          <button data-testid="roving" tabIndex={-1}>inactive menu item</button>
          <span data-testid="grip" role="button" tabIndex={-1}>pointer-only grip</span>
          <button data-testid="real-first">first</button>
          <button data-testid="real-last">last</button>
        </div>
      )}
    </div>
  );
}

// Two independently-opened overlays, as the app allows (palette over a dialog).
function NestedHarness() {
  const [outer, setOuter] = useState(false);
  const [inner, setInner] = useState(false);
  const outerRef = useFocusTrap<HTMLDivElement>(outer);
  const innerRef = useFocusTrap<HTMLDivElement>(inner);
  return (
    <div>
      <button data-testid="trigger" onClick={() => setOuter(true)}>open</button>
      {outer && (
        <div ref={outerRef} role="dialog" aria-label="outer">
          <button data-testid="open-inner" onClick={() => setInner(true)}>open inner</button>
          <button data-testid="outer-last">outer last</button>
        </div>
      )}
      {inner && (
        <div ref={innerRef} role="dialog" aria-label="inner">
          <button data-testid="inner-first">inner first</button>
          <button data-testid="inner-last">inner last</button>
        </div>
      )}
    </div>
  );
}

afterEach(cleanup);

describe('useFocusTrap', () => {
  it('moves focus into the overlay when it opens', () => {
    render(<Harness />);
    fireEvent.click(screen.getByTestId('trigger'));
    expect(document.activeElement).toBe(screen.getByTestId('first'));
  });

  it('Tab on the last element wraps to the first (does not escape)', () => {
    render(<Harness />);
    fireEvent.click(screen.getByTestId('trigger'));
    screen.getByTestId('last').focus();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Tab' });
    expect(document.activeElement).toBe(screen.getByTestId('first'));
  });

  it('Shift+Tab on the first element wraps to the last', () => {
    render(<Harness />);
    fireEvent.click(screen.getByTestId('trigger'));
    screen.getByTestId('first').focus();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(screen.getByTestId('last'));
  });

  it('restores focus to the trigger when the overlay closes', () => {
    render(<Harness />);
    const trigger = screen.getByTestId('trigger');
    trigger.focus();
    fireEvent.click(trigger);
    // close via the inner button
    fireEvent.click(screen.getByTestId('last'));
    expect(document.activeElement).toBe(trigger);
  });

  it('pulls focus BACK into the overlay after it has escaped to the background', () => {
    // Clicking the backdrop / background leaves focus on <body> (or a background
    // control). A container-bound listener never sees the next Tab, so the trap
    // silently stops trapping — focus then walks the page behind the modal.
    render(<Harness />);
    fireEvent.click(screen.getByTestId('trigger'));
    (document.activeElement as HTMLElement).blur();
    expect(document.body.contains(document.activeElement)).toBe(true);
    fireEvent.keyDown(document.body, { key: 'Tab' });
    expect(document.activeElement).toBe(screen.getByTestId('first'));

    // Shift+Tab from outside enters at the LAST control, not the first.
    screen.getByTestId('background').focus();
    fireEvent.keyDown(document.body, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(screen.getByTestId('last'));
  });

  it('ignores tabindex="-1" elements — they are not tabbable cycle boundaries', () => {
    render(<TabIndexHarness />);
    fireEvent.click(screen.getByTestId('trigger'));
    // The roving-tabindex item is first in DOM order but must NOT take focus.
    expect(document.activeElement).toBe(screen.getByTestId('real-first'));
    screen.getByTestId('real-last').focus();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Tab' });
    expect(document.activeElement).toBe(screen.getByTestId('real-first'));
  });

  it('with nested overlays, only the innermost trap handles Tab', () => {
    render(<NestedHarness />);
    fireEvent.click(screen.getByTestId('trigger'));      // outer
    fireEvent.click(screen.getByTestId('open-inner'));   // inner over it
    screen.getByTestId('inner-last').focus();
    fireEvent.keyDown(document.body, { key: 'Tab' });
    // cycles within the INNER overlay, never jumping out to the outer one
    expect(document.activeElement).toBe(screen.getByTestId('inner-first'));
  });

  it('Escape closes a labelled modal dialog and returns focus to the trigger', () => {
    // Mirrors the upload conflict modal wiring: ref-trapped dialog with
    // aria-labelledby/aria-describedby and an Escape handler.
    render(<Harness />);
    const trigger = screen.getByTestId('trigger');
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-labelledby')).toBe('t');
    expect(dialog.getAttribute('aria-describedby')).toBe('d');
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});
