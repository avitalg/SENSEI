// Canonical breadcrumb trail — one accessible implementation for every deep page
// (patient sub-pages) instead of eight hand-rolled copies. Renders a <nav>
// landmark with a "›" separator between crumbs; the last (or any without an
// onClick) is the current page (aria-current). Links are role="button" so the
// app's global Enter/Space keydown delegate operates them. RTL-native.
import './Breadcrumb.css';

export interface Crumb {
  label: string
  /** Omit on the current (last) crumb — it renders as plain, non-interactive text. */
  onClick?: () => void
}

export default function Breadcrumb({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="פירורי ניווט" className={'crumbs' + (className ? ' ' + className : '')}>
      {items.map((c, i) => {
        const current = i === items.length - 1 || !c.onClick;
        return (
          <span key={i} className="crumbs-item">
            {i > 0 && <span aria-hidden="true" className="crumbs-sep">›</span>}
            {current
              ? <span className="crumbs-current" aria-current="page">{c.label}</span>
              : <a role="button" tabIndex={0} className="crumb" onClick={c.onClick}>{c.label}</a>}
          </span>
        );
      })}
    </nav>
  );
}
