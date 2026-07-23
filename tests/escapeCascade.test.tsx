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

const escape = () => act(() => {
  fireEvent.keyDown(window, { key: 'Escape' });
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('global Escape cascade', () => {
  it('closes a modal before the AI panel behind it', () => {
    render(<AppStoreProvider><Harness /></AppStoreProvider>);
    fireEvent.click(screen.getByTestId('open-both'));
    escape();
    expect(screen.getByTestId('dialog')).toHaveTextContent('null');
    expect(screen.getByTestId('ai')).toHaveTextContent('true');
    escape();
    expect(screen.getByTestId('ai')).toHaveTextContent('false');
  });

  it('keeps the command palette above a dialog', () => {
    render(<AppStoreProvider><Harness /></AppStoreProvider>);
    fireEvent.click(screen.getByTestId('open-palette'));
    escape();
    expect(screen.getByTestId('cmd')).toHaveTextContent('false');
    expect(screen.getByTestId('dialog')).toHaveTextContent('create');
    escape();
    expect(screen.getByTestId('dialog')).toHaveTextContent('null');
  });
});
