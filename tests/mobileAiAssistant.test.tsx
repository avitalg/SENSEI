// The "שאל את סנסיי" AI assistant on mobile: it now renders inside MobileApp
// (not just the desktop AppShell), the open panel is full-screen, and it has no
// drag-resize grip. Same matchMedia mobile gating as mobileScreens.test.tsx.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';
import { MOBILE_QUERY } from '../src/hooks/useIsMobile';

const { isApiConfiguredMock } = vi.hoisted(() => ({ isApiConfiguredMock: vi.fn(() => false) }));

vi.mock('../src/services/apiClient', async (importActual) => {
  const actual = await importActual<typeof import('../src/services/apiClient')>();
  return { ...actual, isApiConfigured: isApiConfiguredMock };
});

const PKEY = 'sensei_session_react_v1';

// matches=true only for the mobile query renders MobileApp; all-false renders the
// desktop AppShell. Everything else (theme/reduced-motion queries) resolves false.
function setViewport(mobile: boolean) {
  window.matchMedia = ((q: string) => ({
    matches: mobile && q === MOBILE_QUERY,
    media: q,
    addEventListener: () => {}, removeEventListener: () => {},
    addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
  })) as any;
}
function mount() {
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), view: 'app', route: 'dashboard' }));
  return render(<AppStoreProvider><App /></AppStoreProvider>);
}

beforeEach(() => { isApiConfiguredMock.mockReturnValue(false); });
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe('mobile AI assistant', () => {
  it('renders the minimized launcher inside the mobile shell, and opens a full-screen panel with no resize grip', async () => {
    setViewport(true);
    const { container } = mount();
    await waitFor(() => expect(container.querySelector('.mob-shell')).toBeTruthy());

    // Minimized: the launcher ("sensei dot") is present in the mobile shell.
    const launcher = container.querySelector('[aria-label="שאל את סנסיי"]') as HTMLButtonElement;
    expect(launcher, 'minimized launcher present on mobile').toBeTruthy();
    expect(container.querySelector('[role="dialog"]'), 'panel closed until opened').toBeNull();

    // Open it → full-screen panel, and the desktop resize grip is absent.
    fireEvent.click(launcher);
    const dialog = await waitFor(() => {
      const d = container.querySelector('[role="dialog"][aria-label="שאל את סנסיי"]');
      expect(d).toBeTruthy();
      return d as HTMLElement;
    });
    expect(dialog.style.width, 'panel is full-screen width on mobile').toBe('100%');
    expect(dialog.style.height, 'panel is full-screen height on mobile').toBe('100%');
    expect(container.querySelector('[aria-label="שינוי גודל החלון"]'), 'no resize grip on mobile').toBeNull();
  });

  it('desktop keeps the windowed panel with a resize grip', async () => {
    setViewport(false);
    const { container } = mount();
    const launcher = await waitFor(() => {
      const b = container.querySelector('[aria-label="שאל את סנסיי"]');
      expect(b).toBeTruthy();
      return b as HTMLButtonElement;
    });
    fireEvent.click(launcher);
    const dialog = await waitFor(() => {
      const d = container.querySelector('[role="dialog"][aria-label="שאל את סנסיי"]');
      expect(d).toBeTruthy();
      return d as HTMLElement;
    });
    // Windowed (not full-screen) and the resize grip is present.
    expect(dialog.style.width, 'desktop panel is the fixed windowed width').toBe('390px');
    expect(container.querySelector('[aria-label="שינוי גודל החלון"]'), 'resize grip present on desktop').toBeTruthy();
  });
});
