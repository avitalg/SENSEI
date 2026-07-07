// Canonical duplicate-patient clustering (single source of truth for the dedup
// page, the patients-list banner, and the merge dialog). Groups patients by
// weighted signals: same phone (60), same surname (25), similar first name (15),
// similar email local-part (12); a cluster forms at score ≥ 60.
//
// Each cluster also carries two derived, deterministic fields so every consumer
// reads them from one place instead of re-deriving them:
//   • confidence  — the cluster's strongest member score (0–99).
//   • canonicalId — the proposed surviving record: most complete first (highest
//                   session count), ties broken by lowest id. Same input always
//                   yields the same canonical pick.
export function buildDupClusters(patients: any[]) {
  const ps = patients
  const norm = (s: string) => (s || '').replace(/[-\s׳״'".]/g, '')
  const firstTok = (n: string) => (n || '').trim().split(/\s+/)[0] || ''
  const lastTok = (n: string) => { const t = (n || '').trim().split(/\s+/); return t[t.length - 1] || '' }
  const used = new Set<string>()
  const clusters: { members: any[]; meta: Record<string, { signals: string[]; score: number }> }[] = []
  for (let i = 0; i < ps.length; i++) {
    if (used.has(ps[i].id)) continue
    const group = [ps[i]]; const meta: Record<string, { signals: string[]; score: number }> = {}
    for (let j = i + 1; j < ps.length; j++) {
      if (used.has(ps[j].id)) continue
      const signals: string[] = []; let score = 0
      if (ps[i].phone !== '—' && norm(ps[i].phone) === norm(ps[j].phone)) { signals.push('מספר טלפון זהה'); score += 60 }
      if (lastTok(ps[i].name) === lastTok(ps[j].name)) { signals.push('שם משפחה זהה'); score += 25 }
      const f1 = firstTok(ps[i].name), f2 = firstTok(ps[j].name)
      if (f1 && (f1.slice(0, 3) === f2.slice(0, 3))) { signals.push('שם פרטי דומה'); score += 15 }
      const e1 = (ps[i].email || '').split('@')[0], e2 = (ps[j].email || '').split('@')[0]
      if (e1 && e1.slice(0, 4) === e2.slice(0, 4)) { signals.push('כתובת דוא״ל דומה'); score += 12 }
      if (score >= 60) { group.push(ps[j]); used.add(ps[j].id); meta[ps[j].id] = { signals, score: Math.min(99, score) } }
    }
    if (group.length > 1) { used.add(ps[i].id); clusters.push({ members: group, meta }) }
  }
  // Attach the derived canonical fields (deterministic; behaviour of the
  // clustering itself is unchanged — these are pure functions of the cluster).
  return clusters.map((c) => {
    const scores = Object.values(c.meta).map((x) => x.score)
    const confidence = scores.length ? Math.max(...scores) : 0
    const canonicalId = c.members.slice().sort(
      (a, b) => (b.sessions || 0) - (a.sessions || 0) || String(a.id).localeCompare(String(b.id)),
    )[0].id
    return { ...c, confidence, canonicalId }
  })
}
