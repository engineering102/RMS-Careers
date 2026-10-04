import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getAnonymousProgress,
  toggleAnonymousProblemSolved,
  isAnonymousProblemSolved,
  getAnonymousSolvedCount,
  clearAnonymousProgress
} from '../client/anonymous-progress';

describe('Anonymous DSA Progress Manager (@rms/web)', () => {
  let localStorageMock: Record<string, string> = {};

  beforeEach(() => {
    localStorageMock = {};

    // Mock window and localStorage
    const mockStorage = {
      getItem: vi.fn((key: string) => localStorageMock[key] || null),
      setItem: vi.fn((key: string, val: string) => {
        localStorageMock[key] = val;
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageMock[key];
      }),
      clear: vi.fn(() => {
        localStorageMock = {};
      })
    };

    vi.stubGlobal('window', {
      localStorage: mockStorage,
      dispatchEvent: vi.fn()
    });
  });

  it('initializes with empty progress state when localStorage is blank', () => {
    const state = getAnonymousProgress();
    expect(state.version).toBe(1);
    expect(state.solvedProblems).toEqual({});
  });

  it('marks a problem solved in localStorage only', () => {
    const updated = toggleAnonymousProblemSolved('arrays-and-hashing', 'q-two-sum', true);
    expect(updated.solvedProblems['arrays-and-hashing:q-two-sum']?.solved).toBe(true);

    // Verify localStorage was written
    const storedRaw = window.localStorage.getItem('rms_anonymous_dsa_progress_v1');
    expect(storedRaw).not.toBeNull();
    const stored = JSON.parse(storedRaw!);
    expect(stored.solvedProblems['arrays-and-hashing:q-two-sum']?.solved).toBe(true);
  });

  it('unmarks a problem when solved is toggled to false', () => {
    toggleAnonymousProblemSolved('arrays-and-hashing', 'q-two-sum', true);
    expect(isAnonymousProblemSolved('arrays-and-hashing', 'q-two-sum')).toBe(true);

    toggleAnonymousProblemSolved('arrays-and-hashing', 'q-two-sum', false);
    expect(isAnonymousProblemSolved('arrays-and-hashing', 'q-two-sum')).toBe(false);
  });

  it('counts solved problems per sheet and globally', () => {
    toggleAnonymousProblemSolved('arrays-and-hashing', 'q-two-sum', true);
    toggleAnonymousProblemSolved('arrays-and-hashing', 'q-contains-duplicate', true);
    toggleAnonymousProblemSolved('two-pointers', 'q-valid-palindrome', true);

    expect(getAnonymousSolvedCount('arrays-and-hashing')).toBe(2);
    expect(getAnonymousSolvedCount('two-pointers')).toBe(1);
    expect(getAnonymousSolvedCount()).toBe(3);
  });

  it('clears all anonymous local progress', () => {
    toggleAnonymousProblemSolved('arrays-and-hashing', 'q-two-sum', true);
    expect(getAnonymousSolvedCount()).toBe(1);

    clearAnonymousProgress();
    expect(getAnonymousSolvedCount()).toBe(0);
  });

  it('handles corrupted localStorage JSON gracefully without throwing', () => {
    localStorageMock['rms_anonymous_dsa_progress_v1'] = 'INVALID_JSON_CORRUPT{';
    const state = getAnonymousProgress();
    expect(state.version).toBe(1);
    expect(state.solvedProblems).toEqual({});
  });
});
