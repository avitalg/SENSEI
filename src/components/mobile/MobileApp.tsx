// Mobile app shell — rendered instead of AppShell below 768px (see App.tsx /
// useIsMobile). Provides the phone chrome (compact header + the existing sidebar
// as a slide-in drawer, reusing S.navOpen; the drawer's fixed/off-canvas rules
// live in tokens.css — .app-sidebar/.nav-scrim), routes to bespoke mobile
// screens where they exist, and otherwise renders the shared route page in a
// narrow wrapper. Global overlays (Snackbar/Dialogs) are reused as-is.
import React, { Suspense, useEffect, useRef } from 'react';
import { useApp } from '../../store/AppStore';
import Sidebar, { profileInitials } from '../layout/Sidebar';
import Snackbar from '../layout/Snackbar';
import Dialogs from '../layout/Dialogs';
import RecordSessionDialog from '../shared/RecordSessionDialog';
import ErrorBoundary from '../shared/ErrorBoundary';
import PageFallback from '../shared/PageFallback';
import MobileDayView from './MobileDayView';
import CalendarHome from '../calendar/CalendarHome';
import MobilePrepReport from './MobilePrepReport';
import MobilePatient from './MobilePatient';
import MobileCreateMenu from './MobileCreateMenu';
import AiAssistant from '../layout/AiAssistant';
import { ROUTE_TITLES } from '../../nav/navConfig';
import { MenuIcon } from './icons';
import './mobile.css';

interface Props {
  route: string;
  Page: React.ComponentType;
}

export default function MobileApp({ route, Page }: Props) {
  const { S, set, navigate } = useApp();
  const closeNav = () => set({ navOpen: false });
  // A11y: when the drawer closes (scrim tap, Escape, navigation), focus returns
  // to the control that opened it — the screen-reader/keyboard user is never
  // stranded inside a hidden off-canvas panel.
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !S.navOpen) menuBtnRef.current?.focus();
    wasOpen.current = !!S.navOpen;
  }, [S.navOpen]);

  // Route → bespoke mobile screen, else the shared route page (narrow wrapper).
  let screen: React.ReactNode;
  // Home ("today") uses the day-focused view (day-strip + agenda). The dedicated
  // Calendar page is the SAME desktop calendar widget in its month view — a true
  // 7-column monthly grid that fits the phone without horizontal scrolling — so
  // mobile and desktop share one calendar implementation, data source, and flows.
  if (route === 'dashboard') screen = <MobileDayView />;
  else if (route === 'calendar') screen = <CalendarHome initialView="month" />;
  else if (route === 'patient') screen = <MobilePatient />;
  else if (route === 'report') screen = <MobilePrepReport />;
  // Shared desktop pages have no horizontal padding of their own; on mobile the
  // shell zeroes #main-content padding, so give the fallback page the same 16px
  // inline inset the bespoke screens use (bespoke branches above keep their own).
  else screen = <div className="mob-page"><Page /></div>;

  // Consistent, clear Back for every SHARED (non-tab) screen on mobile: bespoke
  // screens carry their own back control; everything else gets this bar. A
  // patient-scoped route returns to the patient file; anything else, home.
  const HAS_OWN_BACK = ['dashboard', 'calendar', 'patients', 'patient', 'report'];
  const showBackBar = !HAS_OWN_BACK.includes(route);
  // 'upload' is patient-scoped: it's entered from the patient file / prep report
  // (carrying uploadPatientId), so Back must return there — not dump the user on
  // the home screen and drop their patient context.
  const backPid = S.patientId || S.uploadPatientId;
  const patientScoped = ['transcript', 'summary', 'letter', 'meetingHistory', 'upcomingMeetings', 'session', 'upload'].includes(route) && !!backPid;
  const goBack = () => {
    if (patientScoped) navigate('patient', { patientId: backPid });
    else navigate('dashboard');
  };

  return (
    <div className="mob-shell">
      <a href="#main-content" className="skip-link">דלגו לתוכן הראשי</a>

      <header className="mob-header">
        <button ref={menuBtnRef} type="button" className="mob-iconbtn tap44" aria-label="פתיחת התפריט" onClick={() => set({ navOpen: true })}>
          <MenuIcon />
        </button>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/assets/sensei-mark.png" alt="" aria-hidden="true" width={28} height={28} style={{ borderRadius: '50%', objectFit: 'cover' }} />
          <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary)' }}>סנסיי</span>
        </div>
        <div className="mob-avatar" aria-hidden="true">{profileInitials(S.profile.name)}</div>
      </header>

      {/* off-canvas nav — reuses the desktop Sidebar + shell.css drawer rules */}
      <div onClick={closeNav} className={'nav-scrim' + (S.navOpen ? ' open' : '')} style={{ position: 'fixed', inset: 0, background: 'rgba(10,15,40,.5)', zIndex: 199, display: S.navOpen ? 'block' : 'none' }} />
      <Sidebar />

      <main id="main-content" tabIndex={-1} aria-label={ROUTE_TITLES[route] ? 'תוכן ראשי · ' + ROUTE_TITLES[route] : 'תוכן ראשי'} className="mob-content">
        {showBackBar && (
          <div style={{ padding: '10px 14px 0' }}>
            <button type="button" className="mob-back tap44" aria-label={patientScoped ? 'חזרה לתיק המטופל' : 'חזרה לדף הבית'} onClick={goBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', background: 'transparent', color: 'var(--primary)', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', padding: '6px 4px' }}>
              <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true" style={{ transform: 'scaleX(-1)' }}><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
              חזרה
            </button>
          </div>
        )}
        <ErrorBoundary resetKey={route} onReset={() => navigate('dashboard')}>
          <Suspense fallback={<div style={{ padding: 16 }}><PageFallback /></div>}>
            {screen}
          </Suspense>
        </ErrorBoundary>
      </main>

      <MobileCreateMenu />

      <AiAssistant />
      <Snackbar />
      <Dialogs />
      <RecordSessionDialog />
    </div>
  );
}
