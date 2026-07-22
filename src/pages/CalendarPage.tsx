// Calendar — the full calendar workspace (components/calendar/CalendarHome):
// day/week/month views, click-to-create, drag-reschedule, quick date-nav and the
// event-details dialog. The dashboard home is a separate calm surface that shows
// only today's agenda and hands off here for the full grid.
import CalendarHome from '../components/calendar/CalendarHome';

export default function CalendarPage() {
  return <CalendarHome />;
}
