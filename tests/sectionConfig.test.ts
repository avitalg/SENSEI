import { describe, expect, it } from 'vitest';
import {
  duplicateSection,
  insertSection,
  moveSection,
  normalizeSections,
  removeSection,
  setSectionEnabled,
  setSectionVisibility,
  type SectionConfig,
} from '../src/components/layout/sectionConfig';

const sections: SectionConfig[] = [
  { id: 'hero', type: 'hero', props: { title: 'כותרת' } },
  { id: 'faq', type: 'faq', props: { items: [{ q: 'שאלה' }] } },
  { id: 'contact', type: 'contact', props: {} },
];

describe('section configuration operations', () => {
  it('inserts, reorders and removes without mutating the source', () => {
    const inserted = insertSection(sections, { id: 'banner', type: 'banner', props: {} }, 1);
    expect(inserted.map((s) => s.id)).toEqual(['hero', 'banner', 'faq', 'contact']);
    expect(moveSection(inserted, 'contact', 0).map((s) => s.id)).toEqual(['contact', 'hero', 'banner', 'faq']);
    expect(removeSection(inserted, 'faq').map((s) => s.id)).toEqual(['hero', 'banner', 'contact']);
    expect(sections.map((s) => s.id)).toEqual(['hero', 'faq', 'contact']);
  });

  it('duplicates deeply and generates collision-safe ids', () => {
    const duplicated = duplicateSection(sections, 'faq');
    expect(duplicated[2].id).toBe('faq-copy');
    (duplicated[2].props.items as Array<{ q: string }>)[0].q = 'שונה';
    expect((sections[1].props.items as Array<{ q: string }>)[0].q).toBe('שאלה');
    expect(duplicateSection(duplicated, 'faq')[2].id).toBe('faq-copy-2');
  });

  it('updates enabled and responsive visibility states immutably', () => {
    expect(setSectionEnabled(sections, 'faq', false)[1].enabled).toBe(false);
    expect(setSectionVisibility(sections, 'hero', 'mobile')[0].visibility).toBe('mobile');
    expect(sections[0].visibility).toBeUndefined();
  });

  it('normalizes external CMS data and rejects malformed records', () => {
    const normalized = normalizeSections([
      { id: 'hero', type: 'hero', props: { title: 'א' } },
      { id: 'hero', type: 'hero', props: { title: 'ב' }, visibility: 'mobile' },
      { id: '', type: 'faq', props: {} },
      { id: 'bad', type: '', props: [] },
      null,
    ]);
    expect(normalized.map((section) => section.id)).toEqual(['hero', 'hero-2']);
    expect(normalized[1].visibility).toBe('mobile');
  });
});
