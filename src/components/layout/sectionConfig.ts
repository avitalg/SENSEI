import type { SectionDefinition } from './DynamicLayout';

export type ResponsiveVisibility = 'all' | 'desktop' | 'tablet' | 'mobile';
export type SectionConfig = SectionDefinition & { visibility?: ResponsiveVisibility };

function uniqueId(base: string, sections: readonly SectionConfig[]): string {
  const ids = new Set(sections.map((section) => section.id));
  if (!ids.has(base)) return base;
  let index = 2;
  while (ids.has(`${base}-${index}`)) index += 1;
  return `${base}-${index}`;
}

function clampIndex(index: number, length: number): number {
  return Math.max(0, Math.min(Math.trunc(index), length));
}

/** Insert a section at a stable, clamped position without mutating CMS data. */
export function insertSection(
  sections: readonly SectionConfig[],
  section: SectionConfig,
  at = sections.length,
): SectionConfig[] {
  const next = [...sections];
  const id = uniqueId(section.id, sections);
  next.splice(clampIndex(at, next.length), 0, { ...section, id });
  return next;
}

/** Move a section by id. Unknown ids are a safe no-op. */
export function moveSection(
  sections: readonly SectionConfig[],
  id: string,
  to: number,
): SectionConfig[] {
  const from = sections.findIndex((section) => section.id === id);
  if (from < 0) return [...sections];
  const next = [...sections];
  const [section] = next.splice(from, 1);
  next.splice(clampIndex(to, next.length), 0, section);
  return next;
}

/** Duplicate a section next to its source, deeply copying JSON-safe props. */
export function duplicateSection(
  sections: readonly SectionConfig[],
  id: string,
): SectionConfig[] {
  const index = sections.findIndex((section) => section.id === id);
  if (index < 0) return [...sections];
  const source = sections[index];
  const copy = {
    ...source,
    id: uniqueId(`${source.id}-copy`, sections),
    props: structuredClone(source.props),
};
  return insertSection(sections, copy, index + 1);
}

export function removeSection(sections: readonly SectionConfig[], id: string): SectionConfig[] {
  return sections.filter((section) => section.id !== id);
}

export function setSectionEnabled(
  sections: readonly SectionConfig[],
  id: string,
  enabled: boolean,
): SectionConfig[] {
  return sections.map((section) => section.id === id ? { ...section, enabled } : section);
}

export function setSectionVisibility(
  sections: readonly SectionConfig[],
  id: string,
  visibility: ResponsiveVisibility,
): SectionConfig[] {
  return sections.map((section) => section.id === id ? { ...section, visibility } : section);
}

/** Reject malformed external configuration before it reaches the renderer. */
export function normalizeSections(value: unknown): SectionConfig[] {
  if (!Array.isArray(value)) return [];
  const used = new Set<string>();
  return value.flatMap((item): SectionConfig[] => {
    if (!item || typeof item !== 'object') return [];
    const candidate = item as Partial<SectionConfig>;
    if (typeof candidate.id !== 'string' || !candidate.id.trim()) return [];
    if (typeof candidate.type !== 'string' || !candidate.type.trim()) return [];
    if (!candidate.props || typeof candidate.props !== 'object' || Array.isArray(candidate.props)) return [];
    const id = uniqueId(candidate.id.trim(), [...used].map((usedId) => ({ id: usedId, type: '', props: {} })));
    used.add(id);
    return [{
      id,
      type: candidate.type.trim(),
      props: structuredClone(candidate.props),
      enabled: candidate.enabled !== false,
      visible: candidate.visible !== false,
      width: candidate.width,
      tone: candidate.tone,
      spacing: candidate.spacing,
      className: candidate.className,
      visibility: candidate.visibility ?? 'all',
    }];
  });
}
