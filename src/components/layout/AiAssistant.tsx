// "שאל את סנסיי" AI assistant — entry point + demo (mock) mode.
//
// Two modes, chosen once at mount by whether a backend is configured:
// - Live (VITE_API_BASE_URL set): streams answers from the senseiapi /assistant/chat
//   endpoint. The live controller (AiAssistantLive) is the only consumer of the AI
//   SDK, so it is lazy-loaded here — the ~heavy @ai-sdk/react + ai packages are then
//   split into their own chunk and never ship in the default client-only build.
// - Demo (no backend): deterministic canned answers, no network — the original mock,
//   kept so the client-only build and offline/CI runs behave exactly as before.
// Both render the same presentational panel (AiPanel); the disclaimer stays either way.
import { lazy, Suspense, useEffect, useRef } from 'react';
import { useApp } from '../../store/AppStore';
import { repoPatients } from '../../data/mockPatientsRepo';
import { isApiConfigured } from '../../services/apiClient';
import { AiFab, AiPanel, type PanelMessage } from './AiPanel';

const LiveAssistant = lazy(() => import('./AiAssistantLive'));

export default function AiAssistant() {
  // The backend is either configured for the whole session or not, so choosing the
  // mode at a component boundary keeps hook order stable in both branches.
  if (!isApiConfigured()) return <MockAssistant />;
  // While the live controller's chunk loads, keep the launcher instant.
  return (
    <Suspense fallback={<AiFabFallback />}>
      <LiveAssistant />
    </Suspense>
  );
}

// The closed FAB shown until the lazy live controller resolves. Opening it flips
// the store flag; the controller then mounts already-open and renders the panel.
function AiFabFallback() {
  const { set } = useApp();
  return <AiFab onOpen={() => set({ aiOpen: true })} />;
}

// Deterministic canned answers — derived at call time from the canonical
// mock-patient repository, so every referenced patient, risk flag and next-step
// exists verbatim in the dataset. A suggested question never dead-ends on a
// generic reply or cites a patient who does not exist.
function aiAnswer(q: string): string {
  const t = q || '';
  const roster = repoPatients();
  if (t.includes('סיכון גבוה') || t.includes('מי המטופלים')) {
    const high = roster.filter((p) => p.sessions.some((s) => s.risk?.levelKey === 'high'));
    if (high.length) {
      const names = high.map((p) => p.name + (p.approach ? ' (' + p.approach.split('(')[0].trim() + ')' : '')).join(', ');
      return 'לפי דגלי הסיכון בסיכומי המפגשים, ' + high.length + ' מטופלים סומנו ברמת סיכון גבוהה במהלך הטיפול: ' + names + '. מומלץ לעיין בדגל הסיכון של המפגש הרלוונטי בתיק של כל אחד מהם.';
    }
    return 'לא סומנו דגלי סיכון גבוהים בסיכומים שנותחו.';
  }
  for (const p of roster) {
    const first = p.name.split(' ')[0];
    if (first && t.includes(first)) {
      const last = p.sessions[p.sessions.length - 1];
      if (!last) return p.name + ' · אין מפגשים מתועדים במאגר.';
      const when = last.date ? ' (מפגש ' + last.num + ', ' + last.date + ')' : '';
      return p.name + when + ': ' + last.insight + (last.nextFocus ? ' לקראת ההמשך: ' + last.nextFocus + '.' : '');
    }
  }
  if (t.includes('שינה')) {
    const rel = roster.filter((p) => p.sessions.some((s) => (s.summary + s.insight + s.topics.join(' ')).includes('שינה')));
    if (rel.length) return 'נושא השינה עולה בתיעוד של ' + rel.map((p) => p.name).join(', ') + '. אפשר לפתוח את סיכומי המפגשים הרלוונטיים לפרטים.';
  }
  return 'על סמך הסיכומים שנותחו, המגמה הכללית יציבה עם מוקדי תשומת לב בודדים. אפשר לשאול אותי על מטופל ספציפי, על מי שבסיכון גבוה, או מה כדאי להכין לפגישה הקרובה.';
}

// --- Demo mode: the original canned assistant, unchanged in behaviour ------------

function MockAssistant() {
  const { S, set } = useApp();
  const aiTimer = useRef<any>(null);

  useEffect(() => () => clearTimeout(aiTimer.current), []);

  const sendAI = (text: string) => {
    const q = (text || '').trim();
    if (!q) return;
    set((s: any) => ({ aiMessages: [...s.aiMessages, { role: 'me', text: q }], aiInput: '', aiTyping: true }));
    clearTimeout(aiTimer.current);
    aiTimer.current = setTimeout(() => {
      set((s: any) => ({ aiMessages: [...s.aiMessages, { role: 'ai', text: aiAnswer(q) }], aiTyping: false }));
    }, 900);
  };

  const messages: PanelMessage[] = S.aiMessages.map((m: any) => ({ me: m.role === 'me', text: m.text }));

  return (
    <AiPanel
      open={S.aiOpen}
      onOpen={() => set({ aiOpen: true })}
      onClose={() => set({ aiOpen: false })}
      messages={messages}
      typing={S.aiTyping}
      input={S.aiInput || ''}
      onInput={(v) => set({ aiInput: v })}
      onSend={sendAI}
    />
  );
}
