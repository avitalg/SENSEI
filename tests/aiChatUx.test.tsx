// Chat-UX behaviours for the live "שאל את סנסיי" panel (Milestone 2):
//   2a — the FULL transcript (text + tool chips) survives a refresh.
//   2b — the "+" button starts a new session (greeting only) and clears storage.
//   2c — the corner grip drag-resizes the panel and the size is persisted.
//
// No Playwright in this repo — these drive the real component via Testing Library
// exactly like tests/aiAssistantLive.test.tsx, mocking the AI-SDK SSE stream. A
// "refresh" is modelled by pre-seeding localStorage (the persisted session) and
// mounting fresh, so the restore path (readPersistedValue → useChat seed) is what
// is under test, not the AI-SDK in-memory store.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';

vi.mock('../src/services/apiClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/services/apiClient')>();
  return { ...actual, isApiConfigured: () => true, API_BASE_URL: 'http://localhost:8000' };
});

import { AppStoreProvider } from '../src/store/AppStore';
import AiAssistant from '../src/components/layout/AiAssistant';

const PKEY = 'sensei_session_react_v1';
const GREETING = 'שלום ד״ר שגב, אני סנסיי. אפשר לשאול אותי על מגמות, סיכונים והכנה לפגישות, בהתבסס על הסיכומים שכבר נותחו.';

// Write a persisted session so the next mount restores from it (a "refresh").
function seedSession(patch: Record<string, unknown>): void {
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), ...patch }));
}

function readSession(): Record<string, any> {
  return JSON.parse(localStorage.getItem(PKEY) || '{}');
}

// The exact stored UIMessage shape the backend/AI-SDK produces for a tool turn.
function toolTranscript() {
  return [
    { id: 'u1', role: 'user', parts: [{ type: 'text', text: 'מי הבא ביומן?' }] },
    {
      id: 'a1',
      role: 'assistant',
      parts: [
        {
          type: 'tool-http_get',
          toolCallId: 'c1',
          state: 'output-available',
          input: { path: '/assistant/context/agenda' },
          output: { status: 200, body: [{ patient_name: 'דנה' }] },
        },
        { type: 'text', text: 'הפגישה הבאה היא עם דנה' },
      ],
    },
  ];
}

const TOOL_FRAMES = [
  'data: {"type":"start"}\n\n',
  'data: {"type":"tool-input-available","toolCallId":"c1","toolName":"http_get","input":{"path":"/assistant/context/agenda"}}\n\n',
  'data: {"type":"tool-output-available","toolCallId":"c1","output":{"status":200,"body":[{"patient_name":"דנה"}]}}\n\n',
  'data: {"type":"text-start","id":"0"}\n\n',
  'data: {"type":"text-delta","id":"0","delta":"הפגישה הבאה היא עם דנה"}\n\n',
  'data: {"type":"text-end","id":"0"}\n\n',
  'data: {"type":"finish"}\n\n',
  'data: [DONE]\n\n',
];

function sseResponse(frames: string[]): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      for (const frame of frames) controller.enqueue(encoder.encode(frame));
      controller.close();
    },
  });
  return new Response(body, {
    status: 200,
    headers: { 'content-type': 'text/event-stream', 'x-vercel-ai-ui-message-stream': 'v1' },
  });
}

function openPanel(): void {
  fireEvent.click(document.querySelector('[aria-label="שאל את סנסיי"]') as HTMLElement);
}

// Force the debounced persistence to flush to storage synchronously.
function flushPersist(): void {
  fireEvent(window, new Event('pagehide'));
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn(async () => sseResponse(TOOL_FRAMES));
  vi.stubGlobal('fetch', fetchMock);
  // jsdom lacks pointer-capture; the resize grip calls it during a drag.
  if (!Element.prototype.setPointerCapture) Element.prototype.setPointerCapture = () => {};
  if (!Element.prototype.releasePointerCapture) Element.prototype.releasePointerCapture = () => {};
});

afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('AiAssistant — chat UX (live mode)', () => {
  // ---- 2a: persistence across refresh ----
  it('restores a persisted transcript WITH its tool chip on load (2a)', async () => {
    seedSession({ aiUiMessages: toolTranscript() });
    render(<AppStoreProvider><AiAssistant /></AppStoreProvider>);
    openPanel();

    // Restored text bubbles (no network needed).
    await waitFor(() => expect(document.body.textContent).toContain('הפגישה הבאה היא עם דנה'));
    expect(document.body.textContent).toContain('מי הבא ביומן?');
    expect(fetchMock).not.toHaveBeenCalled();

    // Restored tool chip — collapsed line naming the API path, expands to the body.
    const chip = [...document.querySelectorAll('[aria-expanded]')].find((b) =>
      b.textContent?.includes('/assistant/context/agenda'),
    ) as HTMLElement;
    expect(chip).toBeTruthy();
    fireEvent.click(chip);
    await waitFor(() => expect(document.body.textContent).toContain('"status": 200'));

    // Flush so the restore-triggered debounce timer doesn't survive into a later test.
    flushPersist();
  });

  it('persists the full transcript (text + tool parts) after a reply completes (2a)', async () => {
    render(<AppStoreProvider><AiAssistant /></AppStoreProvider>);
    openPanel();
    fireEvent.input(document.querySelector('[aria-label="הקלדת שאלה"]') as HTMLInputElement, { target: { value: 'מי הבא?' } });
    fireEvent.click(document.querySelector('[aria-label="שליחה"]') as HTMLElement);

    await waitFor(() => expect(document.body.textContent).toContain('הפגישה הבאה היא עם דנה'));

    // onFinish (which writes aiUiMessages) fires only after the WHOLE stream drains,
    // strictly after the reply text renders — so retry flush+read together until the
    // persisted transcript actually contains the tool part, avoiding a stale read.
    await waitFor(() => {
      flushPersist();
      expect(JSON.stringify(readSession().aiUiMessages ?? [])).toContain('tool-http_get');
    });

    const saved = readSession();
    const serialized = JSON.stringify(saved.aiUiMessages);
    expect(serialized).toContain('tool-http_get'); // the tool part survived
    expect(serialized).toContain('הפגישה הבאה היא עם דנה'); // and the answer text
    // Demo mode's text-only key is untouched (still just the greeting).
    expect(JSON.stringify(saved.aiMessages ?? [])).not.toContain('הפגישה הבאה היא עם דנה');
  });

  // ---- 2b: new session ----
  it('the "+" button resets to the greeting and clears the persisted transcript (2b)', async () => {
    seedSession({ aiUiMessages: toolTranscript() });
    render(<AppStoreProvider><AiAssistant /></AppStoreProvider>);
    openPanel();
    await waitFor(() => expect(document.body.textContent).toContain('הפגישה הבאה היא עם דנה'));

    fireEvent.click(document.querySelector('[aria-label="שיחה חדשה"]') as HTMLElement);

    // Transcript gone, greeting shown.
    await waitFor(() => expect(document.body.textContent).not.toContain('הפגישה הבאה היא עם דנה'));
    expect(document.body.textContent).toContain(GREETING);

    // Persisted key emptied.
    flushPersist();
    expect(readSession().aiUiMessages).toEqual([]);
  });

  // ---- 2c: drag-to-resize ----
  it('drag-resizes the panel and persists the new size (2c)', async () => {
    // Force a known text direction so the anchor branch is deterministic (the app
    // is RTL: the panel is pinned to its inline-end / physical-left edge).
    const realGCS = window.getComputedStyle.bind(window);
    vi.spyOn(window, 'getComputedStyle').mockImplementation(((el: Element, pseudo?: string) => {
      const cs = realGCS(el, pseudo as any);
      return new Proxy(cs, {
        get(t, p) {
          if (p === 'direction') return 'rtl';
          const v = (t as any)[p];
          return typeof v === 'function' ? v.bind(t) : v;
        },
      });
    }) as typeof window.getComputedStyle);

    render(<AppStoreProvider><AiAssistant /></AppStoreProvider>);
    openPanel();
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.style.width).toBe('390px'); // default before any drag

    // Pin the anchor corner (bottom + inline-end / left) at a known rect.
    dialog.getBoundingClientRect = () => ({ left: 100, right: 490, top: 100, bottom: 620, width: 390, height: 520, x: 100, y: 100, toJSON() {} }) as DOMRect;

    // jsdom has no PointerEvent constructor; a MouseEvent typed as a pointer event
    // still triggers React's onPointer* handlers and carries clientX/clientY.
    const pointer = (type: string, x: number, y: number): MouseEvent => {
      const ev = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y });
      Object.defineProperty(ev, 'pointerId', { value: 1, configurable: true });
      return ev;
    };

    const grip = document.querySelector('[aria-label="שינוי גודל החלון"]') as HTMLElement;
    fireEvent(grip, pointer('pointerdown', 480, 110));
    fireEvent(grip, pointer('pointermove', 560, 60));
    // rtl anchor.x = left(100): w = 560-100 = 460; h = bottom(620) - 60 = 560.
    await waitFor(() => expect(dialog.style.width).toBe('460px'));
    expect(dialog.style.height).toBe('560px');

    fireEvent(grip, pointer('pointerup', 560, 60));
    flushPersist();
    expect(readSession().aiPanelSize).toEqual({ w: 460, h: 560 });
  });

  it('restores a persisted panel size on load (2c)', () => {
    seedSession({ aiPanelSize: { w: 520, h: 500 } });
    render(<AppStoreProvider><AiAssistant /></AppStoreProvider>);
    openPanel();
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.style.width).toBe('520px');
    expect(dialog.style.height).toBe('500px');
    flushPersist(); // clear the restore-triggered debounce timer
  });
});
