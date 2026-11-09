import { describe, it, expect } from 'vitest';
import { sectionTitleFor } from '../../components/shell/nav-items';

describe('sectionTitleFor (header wayfinding)', () => {
  it('names the nav section a path belongs to, including nested routes', () => {
    expect(sectionTitleFor('/overview')).toBe('Home');
    expect(sectionTitleFor('/batches/9462b578')).toBe('Curriculum');
    expect(sectionTitleFor('/assessments/quiz-1')).toBe('Tests');
    expect(sectionTitleFor('/dsa')).toBe('DSA practice');
    expect(sectionTitleFor('/profile')).toBe('Profile');
  });

  it('uses overrides for routes outside the nav and a neutral fallback otherwise', () => {
    expect(sectionTitleFor('/content/abc')).toBe('Lesson');
    expect(sectionTitleFor('/dsa-old')).toBe('Student Portal');
    expect(sectionTitleFor('/')).toBe('Student Portal');
  });
});
