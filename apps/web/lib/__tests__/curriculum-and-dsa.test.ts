import { describe, it, expect } from 'vitest';
import {
  getAllPublicSheets,
  getPublicSheetBySlug,
  PUBLIC_DSA_SHEETS
} from '../data/dsa-sheets';

describe('Public Curriculum & Starter DSA Dataset (@rms/web)', () => {
  it('provides public starter DSA sheets', () => {
    const sheets = getAllPublicSheets();
    expect(sheets.length).toBeGreaterThanOrEqual(3);
    expect(sheets.map((s) => s.slug)).toContain('arrays-and-hashing');
    expect(sheets.map((s) => s.slug)).toContain('two-pointers-and-sliding-window');
    expect(sheets.map((s) => s.slug)).toContain('linked-lists-and-recursion');
  });

  it('retrieves sheets by slug and returns null for invalid slug', () => {
    const sheet = getPublicSheetBySlug('arrays-and-hashing');
    expect(sheet).not.toBeNull();
    expect(sheet?.title).toBe('Arrays & Hashing Starter');

    const invalid = getPublicSheetBySlug('nonexistent-sheet-slug');
    expect(invalid).toBeNull();
  });

  it('ensures every question adheres to strict curriculum data contracts', () => {
    const sheets = getAllPublicSheets();

    for (const sheet of sheets) {
      expect(sheet.id).toBeTruthy();
      expect(sheet.slug).toBeTruthy();
      expect(sheet.title).toBeTruthy();
      expect(sheet.estimatedHours).toBeGreaterThan(0);
      expect(sheet.questions.length).toBeGreaterThan(0);

      for (const q of sheet.questions) {
        expect(q.id).toBeTruthy();
        expect(q.slug).toBeTruthy();
        expect(q.title).toBeTruthy();
        expect(['easy', 'medium', 'hard']).toContain(q.difficulty);
        expect(q.pattern).toBeTruthy();
        expect(q.problemStatement).toBeTruthy();
        expect(q.examples.length).toBeGreaterThan(0);
        expect(q.constraints.length).toBeGreaterThan(0);

        // Multi-language starter code
        expect(q.starterCode.python).toBeTruthy();
        expect(q.starterCode.cpp).toBeTruthy();
        expect(q.starterCode.java).toBeTruthy();
        expect(q.starterCode.javascript).toBeTruthy();

        // Architectural review metadata
        expect(q.approach).toBeTruthy();
        expect(q.timeComplexity).toBeTruthy();
        expect(q.spaceComplexity).toBeTruthy();
      }
    }
  });
});
