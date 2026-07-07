// Canonical formatting helpers (single source of truth).

// Relative time in Hebrew ("זה עתה" / "לפני N דק׳/שעות/ימים").
// Used by the app-bar sync indicator and the settings sync tab.
export function relTime(ts?: number | null): string {
  if (!ts) return 'זה עתה'
  const d = Math.max(0, Date.now() - ts)
  const m = Math.floor(d / 60000)
  if (d < 45000) return 'זה עתה'
  if (m < 60) return 'לפני ' + m + ' דק׳'
  const h = Math.floor(m / 60)
  if (h < 24) return 'לפני ' + h + ' שעות'
  return 'לפני ' + Math.floor(h / 24) + ' ימים'
}
