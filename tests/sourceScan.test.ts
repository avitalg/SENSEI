// Regression lock for the source-scanning helpers the guards depend on.
//
// The bug this prevents: with a CRLF checkout, `split('\n')` leaves a trailing
// '\r'. JavaScript's `.` does not match '\r' (a line terminator), so the
// comment-strip regex /\/\/.*$/ never matched and comments were NOT stripped on
// Windows — while they WERE on Linux CI. The guards then reported illustrative
// prose inside comments as real violations, and the same suite disagreed with
// itself across platforms.
import { describe, expect, it } from 'vitest';
import { sourceLines, stripLineComment } from './sourceScan';

describe('sourceLines', () => {
  it('splits LF and CRLF identically, leaving no stray carriage return', () => {
    expect(sourceLines('a\nb\nc')).toEqual(['a', 'b', 'c']);
    expect(sourceLines('a\r\nb\r\nc')).toEqual(['a', 'b', 'c']);
    expect(sourceLines('a\r\nb').every((l) => !l.includes('\r'))).toBe(true);
  });
});

describe('stripLineComment', () => {
  it('removes a // comment on both LF and CRLF-sourced lines', () => {
    for (const src of ['  // note\n', '  // note\r\n']) {
      const [line] = sourceLines(src);
      expect(stripLineComment(line).trim()).toBe('');
    }
  });

  it('strips the exact comments that previously broke the guards', () => {
    // An em dash beside Hebrew, inside a dev-facing English comment.
    const emDash = sourceLines('  // Per-session recap (spec 1.2 — "השמעה למפגש זה")\r\n')[0];
    expect(stripLineComment(emDash)).not.toMatch(/—/);
    // An illustrative var(--token) in prose.
    const token = sourceLines('// Raw hex (not var(--token)) because …\r\n')[0];
    expect(stripLineComment(token)).not.toMatch(/var\(/);
  });

  it('leaves real code untouched', () => {
    expect(stripLineComment("const a = 'x'; // trailing").trim()).toBe("const a = 'x';");
    expect(stripLineComment('const url = 1;')).toBe('const url = 1;');
  });
});
