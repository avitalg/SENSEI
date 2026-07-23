// Therapist between-session notes timeline (spec 3.6) — pure derive/migrate/add/
// remove logic, so the non-destructive legacy migration is provable in isolation.
import { describe, expect, it } from 'vitest';
import { deriveNotes, addNote, removeNote, legacyNoteId, type NoteEntry } from '../src/utils/therapistNotes';

describe('deriveNotes — migration + display list', () => {
  it('returns the stored timeline array when present', () => {
    const stored: NoteEntry[] = [{ id: 'a', text: 'later', at: '2026-07-10T09:00:00Z' }];
    expect(deriveNotes({ aladdin: stored }, { aladdin: 'blob' }, 'aladdin')).toBe(stored);
  });

  it('migrates a legacy blob into a single dated-less entry with a stable id', () => {
    const out = deriveNotes(undefined, { aladdin: 'הערה ישנה' }, 'aladdin');
    expect(out).toEqual([{ id: legacyNoteId('aladdin'), text: 'הערה ישנה', at: null }]);
  });

  it('prefers the stored array even if a legacy blob also exists (no duplication)', () => {
    const stored: NoteEntry[] = [{ id: 'x', text: 'migrated already', at: null }];
    expect(deriveNotes({ aladdin: stored }, { aladdin: 'stale blob' }, 'aladdin')).toBe(stored);
  });

  it('returns empty for no notes at all (or an empty blob)', () => {
    expect(deriveNotes(undefined, undefined, 'aladdin')).toEqual([]);
    expect(deriveNotes({}, { aladdin: '   ' }, 'aladdin')).toEqual([]);
  });
});

describe('addNote / removeNote', () => {
  it('prepends a trimmed entry (newest first) without mutating the input', () => {
    const base: NoteEntry[] = [{ id: 'a', text: 'old', at: '2026-07-01T00:00:00Z' }];
    const out = addNote(base, '  new note  ', '2026-07-15T00:00:00Z', 'b');
    expect(out).toEqual([{ id: 'b', text: 'new note', at: '2026-07-15T00:00:00Z' }, base[0]]);
    expect(base).toHaveLength(1); // input untouched
  });

  it('ignores empty/whitespace-only text', () => {
    const base: NoteEntry[] = [{ id: 'a', text: 'x', at: null }];
    expect(addNote(base, '   ', '2026-07-15T00:00:00Z', 'b')).toBe(base);
  });

  it('removes by id', () => {
    const base: NoteEntry[] = [{ id: 'a', text: '1', at: null }, { id: 'b', text: '2', at: null }];
    expect(removeNote(base, 'a')).toEqual([{ id: 'b', text: '2', at: null }]);
  });
});
