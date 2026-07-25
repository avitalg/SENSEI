// Local "open the day" agenda script — fallback when the live daily-meeting-
// report API is unavailable or has no text yet. Desktop Dashboard and
// MobileDayView share this so the offline wording stays one source of truth.
import { eventGuestName, type CalendarUiEvent } from '../services/calendar';
import { heCount } from '../utils';
import { fmtTime } from '../utils/dates';

export function buildLocalDailyRecapText(todaysEvents: CalendarUiEvent[]): string {
  if (!todaysEvents.length) {
    return 'סיכום פתיחת יום. אין לך פגישות מתוזמנות היום.';
  }
  return 'סיכום פתיחת יום. יש לך ' + heCount(todaysEvents.length, 'פגישה אחת', 'פגישות') + ' היום. ' +
    todaysEvents.map((e) => eventGuestName(e) + ' בשעה ' + fmtTime(new Date(e.start))).join('. ') + '.';
}
