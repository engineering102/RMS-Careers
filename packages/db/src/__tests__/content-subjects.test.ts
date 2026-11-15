import { describe, it, expect } from 'vitest';
import {
  CONTENT_SUBJECTS,
  CONTENT_SUBJECT_RULES,
  FALLBACK_SUBJECT_SLUG,
  contentSubjectLabel,
  isContentSubject,
  resolveContentSubject
} from '../content-subjects';

describe('content subjects', () => {
  it('has a keyword rule for every selectable subject and no others', () => {
    expect(CONTENT_SUBJECT_RULES.map((r) => r.slug).sort()).toEqual(CONTENT_SUBJECTS.map((s) => s.slug).sort());
  });

  it('keeps an explicit subject over what the topic suggests', () => {
    expect(resolveContentSubject({ subject: 'career', topic: 'Arrays & Hashing', title: 'Two Sum' })).toBe('career');
  });

  it('ignores a stored subject that is not in the list', () => {
    expect(resolveContentSubject({ subject: 'astrology', topic: 'System Design' })).toBe('system-design');
    expect(isContentSubject('general')).toBe(false);
  });

  it.each([
    ['Algorithms & Complexity', 'Big-O in practice', 'dsa'],
    ['Arrays & Two Pointers', 'Container With Most Water', 'dsa'],
    ['DSA Roadmap', 'Where to start', 'dsa'],
    ['System Design & Backend', 'Designing a URL shortener', 'system-design'],
    ['', 'JavaScript closures', 'web-development'],
    ['', 'Java basics: classes', 'programming-fundamentals'],
    ['Python', 'Loops and conditions', 'programming-fundamentals'],
    ['', 'Git and GitHub in one hour', 'dev-tools'],
    ['DBMS', 'Normalisation', 'core-cs'],
    ['', 'Resume review checklist', 'career'],
    ['Quantitative Aptitude', 'Time and work', 'aptitude']
  ])('classifies topic %j / title %j as %s', (topic, title, expected) => {
    expect(resolveContentSubject({ topic, title })).toBe(expected);
  });

  it('matches keywords only at the start of a word', () => {
    // "digit" contains "git"; "street" contains "tree".
    expect(resolveContentSubject({ title: 'Digit street' })).toBe(FALLBACK_SUBJECT_SLUG);
  });

  it('falls back to General when nothing matches', () => {
    expect(resolveContentSubject({ title: 'Welcome to the cohort' })).toBe(FALLBACK_SUBJECT_SLUG);
    expect(resolveContentSubject({})).toBe(FALLBACK_SUBJECT_SLUG);
    expect(contentSubjectLabel(FALLBACK_SUBJECT_SLUG)).toBe('General');
  });
});
