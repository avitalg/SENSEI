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

// Deterministic canned answers. Names + clinical framing are kept in sync with
// the real mock roster (data/mockPatients · data/patientOverview) so a suggested
// question never dead-ends on a generic reply or references a patient who does
// not exist — every keyed name below is an actual patient with matching data.
function aiAnswer(q: string): string {
  const t = q || '';
  if (t.includes('סיכון גבוה') || t.includes('מי המטופלים')) return 'כרגע שלושה מטופלים מסומנים בסיכון גבוה, כולם בעיבוד טראומה פעיל: סימבה (PTSD, טיפול משולב EMDR ו-CPT), פורסט (טראומת קרב) והארי (טראומה מורכבת על רקע ילדות). מומלץ לתעדף את סימבה ופורסט · בשניהם העבודה נוגעת כעת בליבת הזיכרון הטראומטי.';
  if (t.includes('סימבה')) return 'סימבה נמצא בשלב אינטגרציה מרשים. בפגישה האחרונה (החמישית ברצף) הוא הגיע עם גוף משוחרר יותר ויציבה זקופה, שיתף שהצליח להביט אל כוכבי השמיים בלי תחושת המחנק, וקיבל החלטה אקטיבית לסיים את תקופת ההימנעות ולחזור לארץ התקווה. זו מגמה של צמיחה פוסט-טראומטית · לקראת הפגישה הבאה כדאי לבדוק את ההתמודדות עם החזרה לסביבה המקורית ואת שמירת הגבולות.';
  if (t.includes('מיכל')) return 'מיכל כהן עובדת על גבולות ודפוס ריצוי ביחסים בין-אישיים. לאחרונה הצליחה לומר "לא" לבקשה של אמה בלי שהאשמה תציף אותה · צעד משמעותי בעבודת הגבולות. כדאי להמשיך לחזק את ההבחנה בין אחריות לאשמה ולתרגל הצבת גבולות במצבים נוספים.';
  if (t.includes('דנה')) return 'לקראת הפגישה הבאה עם דנה לוי: לחזק את חוויית ההצלחה מההצגה בעבודה, לחבר אותה לתחושת מסוגלות כללית, ולהציע משימת חשיפה הדרגתית נוספת ברמת קושי בינונית. שווה גם לבדוק את איכות השינה.';
  if (t.includes('שינה')) return 'נושא השינה חוזר סביב תקופות לחץ. אצל דנה הוא קשור ישירות לחרדת הביצוע בעבודה, ואצל הארי נרשם לאחרונה שיפור ניכר בשינה לאחר עיבוד זיכרון הליבה ב-EMDR. כדאי לשקול תרגול היגיינת שינה ותיעוד יומן שינה קצר.';
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
