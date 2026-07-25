// The prep report's spoken brief is built from the same content the page renders.
// Pure text in, pure text out — no speech stub needed here.
import { describe, expect, it } from 'vitest';
import { buildReportBriefText, estimateSpeechSeconds } from '../src/data/reportBrief';

const base = {
  patientName: 'דנה לוי',
  nextMeetingWhen: 'יום שני, 6 ביולי',
  intro: 'שלושה שבועות של שיפור עקבי',
  lastSummary: 'המטופלת תיארה שיפור בשינה',
  followUps: ['חרדה לפני מצגות', 'שינה מקוטעת'],
  goals: ['חיזוק כלי ההרגעה'],
  questions: ['איך עברה השבת?'],
};

describe('buildReportBriefText', () => {
  it('opens with the patient name and speaks every section the page shows', () => {
    const t = buildReportBriefText(base);
    expect(t).toContain('דנה לוי');
    expect(t).toContain('הפגישה הבאה: יום שני, 6 ביולי.');
    expect(t).toContain('סקירה מהירה. שלושה שבועות של שיפור עקבי.');
    expect(t).toContain('סיכום הפגישה הקודמת. המטופלת תיארה שיפור בשינה.');
    expect(t).toContain('נקודות למעקב. חרדה לפני מצגות. שינה מקוטעת.');
    expect(t).toContain('מטרות לפגישה הקרובה. חיזוק כלי ההרגעה.');
    expect(t).toContain('שאלות מוצעות למפגש. איך עברה השבת?');
  });

  it('drops a section with no data instead of speaking a bare heading', () => {
    const t = buildReportBriefText({ ...base, followUps: [], questions: [] });
    expect(t).not.toContain('נקודות למעקב');
    expect(t).not.toContain('שאלות מוצעות למפגש');
    expect(t).toContain('מטרות לפגישה הקרובה');
  });

  it('omits the date sentence when no next meeting is scheduled', () => {
    const t = buildReportBriefText({ ...base, nextMeetingWhen: undefined });
    expect(t).not.toContain('הפגישה הבאה');
    expect(t).toContain('דנה לוי');
  });

  it('does not double the closing period of a sentence that already has one', () => {
    const t = buildReportBriefText({ ...base, intro: 'שיפור עקבי.' });
    expect(t).toContain('סקירה מהירה. שיפור עקבי.');
    expect(t).not.toContain('שיפור עקבי..');
  });
});

describe('estimateSpeechSeconds', () => {
  it('grows with the length of the text and is never zero for real content', () => {
    const short = estimateSpeechSeconds('שלום עולם');
    const long = estimateSpeechSeconds(new Array(200).fill('מילה').join(' '));
    expect(short).toBeGreaterThan(0);
    expect(long).toBeGreaterThan(short);
  });

  it('is zero for empty text, so the UI can hide the estimate', () => {
    expect(estimateSpeechSeconds('   ')).toBe(0);
  });
});
