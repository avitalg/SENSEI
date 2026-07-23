// Notifications catalog — shared by the notifications center and app-bar popover.
// Patient references derive from the canonical mock-patient repository: names,
// ids, meeting times and risk mentions all come from real dataset entries (the
// relative "when" labels are demo scaffolding for the notifications center).
import { repoPatients } from './mockPatientsRepo';

const roster = repoPatients();
const at = (i: number) => roster[i % Math.max(roster.length, 1)];
// A patient whose dataset actually contains a high-risk session — the risk
// notification cites a real flag, not an invented one.
const highRisk = roster.find((p) => p.sessions.some((s) => s.risk?.levelKey === 'high')) || at(0);
const highRiskSession = highRisk.sessions.find((s) => s.risk?.levelKey === 'high');

export const NOTIFS: any[] = [
  { id: 'n1', kind: 'summary', pid: at(0).id, title: 'סיכום AI מוכן', text: 'ניתוח הפגישה של ' + at(0).name + ' הושלם וזמין לצפייה', time: 'לפני 8 דק׳', group: 'היום' },
  { id: 'n2', kind: 'risk', pid: highRisk.id, title: 'דגל סיכון חדש', text: 'זוהו סימני אזהרה בפגישה ' + (highRiskSession ? highRiskSession.num : 1) + ' של ' + highRisk.name, time: 'לפני 40 דק׳', group: 'היום' },
  { id: 'n3', kind: 'reminder', pid: at(1).id, title: 'פגישה מתקרבת', text: at(1).name + ' · פגישה שבועית בשעה ' + (at(1).sessions[0]?.time || '10:00'), time: 'היום ' + (at(1).sessions[0]?.time || '10:00'), group: 'היום' },
  { id: 'n4', kind: 'summary', pid: at(2).id, title: 'סיכום AI מוכן', text: 'ניתוח הפגישה של ' + at(2).name + ' הושלם', time: 'לפני 3 שעות', group: 'היום' },
  { id: 'n6', kind: 'reminder', pid: at(3).id, title: 'תזכורת מסמך', text: 'טופס הסכמה מדעת ממתין לחתימת ' + at(3).name, time: 'אתמול 11:05', group: 'אתמול' },
  { id: 'n7', kind: 'risk', pid: highRisk.id, title: 'רמת סיכון עודכנה', text: 'רמת הסיכון של ' + highRisk.name + ' עודכנה ל"' + (highRiskSession?.risk?.label || 'גבוה') + '"', time: 'אתמול 09:30', group: 'אתמול' },
  { id: 'n8', kind: 'system', pid: null, title: 'עדכון מערכת', text: 'גרסה 2.4: שיפורי תמלול ודוחות חדשים זמינים', time: 'לפני יומיים', group: 'קודם' },
  { id: 'n10', kind: 'summary', pid: at(4).id, title: 'סיכום AI מוכן', text: 'ניתוח הפגישה של ' + at(4).name + ' הושלם', time: 'לפני 4 ימים', group: 'קודם' },
  { id: 'n11', kind: 'reminder', pid: at(5).id, title: 'פגישה בוטלה', text: 'הפגישה עם ' + at(5).name + ' בוטלה', time: 'לפני שבוע', group: 'קודם' },
];
