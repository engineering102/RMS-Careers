import { describe, it, expect } from 'vitest';
import {
  DEMO_PASSWORD,
  PRIMARY_DEMO_STUDENT,
  PEER_DEMO_STUDENTS
} from '../../scripts/seed-student';

describe('Student Demo Data Seeder — Safety & Specification Verification', () => {
  it('enforces non-production email addresses and secure development credentials', () => {
    expect(DEMO_PASSWORD.length).toBeGreaterThanOrEqual(8);
    expect(PRIMARY_DEMO_STUDENT.email.endsWith('@rms-careers.local')).toBe(true);

    for (const peer of PEER_DEMO_STUDENTS) {
      expect(peer.email.endsWith('@rms-careers.local')).toBe(true);
    }
  });

  it('guarantees unique emails and roll numbers across the demo student cohort', () => {
    const allStudents = [PRIMARY_DEMO_STUDENT, ...PEER_DEMO_STUDENTS];
    expect(allStudents.length).toBe(5);

    const emailSet = new Set(allStudents.map((s) => s.email.toLowerCase()));
    expect(emailSet.size).toBe(5);

    const rollSet = new Set(allStudents.map((s) => s.rollNumber));
    expect(rollSet.size).toBe(5);
  });

  it('provides varied XP and streak values for meaningful leaderboard and analytics testing', () => {
    const allStudents = [PRIMARY_DEMO_STUDENT, ...PEER_DEMO_STUDENTS];

    // Every student has distinct XP
    const xpValues = allStudents.map((s) => s.totalXp);
    const uniqueXp = new Set(xpValues);
    expect(uniqueXp.size).toBe(5);

    // Primary student has realistic stats
    expect(PRIMARY_DEMO_STUDENT.totalXp).toBeGreaterThan(0);
    expect(PRIMARY_DEMO_STUDENT.currentStreak).toBeGreaterThan(0);
    expect(PRIMARY_DEMO_STUDENT.longestStreak).toBeGreaterThanOrEqual(PRIMARY_DEMO_STUDENT.currentStreak);
    expect(PRIMARY_DEMO_STUDENT.dsaSolvedCount).toBeGreaterThan(0);
  });

  it('contains expected academic and career profile fields', () => {
    expect(PRIMARY_DEMO_STUDENT.branch).toBeDefined();
    expect(PRIMARY_DEMO_STUDENT.year).toBe(4);
    expect(PRIMARY_DEMO_STUDENT.githubUrl).toContain('github.com');
    expect(PRIMARY_DEMO_STUDENT.primaryLanguage).toBe('TypeScript');
  });
});
