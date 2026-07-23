import { ROUTE_TITLES } from '../../nav/navConfig';

/** Persistent live region shared by both application shells.
 * Its text changes only when the route changes, so assistive technology gets
 * the same concise orientation cue regardless of viewport or navigation path.
 */
export default function RouteAnnouncer({ route }: { route: string }) {
  const title = ROUTE_TITLES[route] || 'סנסיי';
  return (
    <span className="sr-only" aria-live="polite" aria-atomic="true" data-route-announcer>
      עברתם אל {title}
    </span>
  );
}
