import { describe, it, expect } from 'vitest';
import {
  attemptDraftKey,
  clearAttemptDraft,
  loadAttemptDraft,
  mergeResponses,
  saveAttemptDraft
} from '../client/attempt-draft';

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    map
  };
}

const QUESTIONS = [
  { id: 1, options: [{ id: 'a' }, { id: 'b' }] },
  { id: 2, options: [{ id: 'x' }, { id: 'y' }, { id: 'z' }] }
];

describe('formal attempt draft (answers survive a refresh mid-exam)', () => {
  it('round-trips saved responses for the same attempt', () => {
    const storage = memoryStorage();
    saveAttemptDraft(storage, 'attempt-1', { 1: ['b'], 2: ['x', 'z'] });
    expect(loadAttemptDraft(storage, 'attempt-1', QUESTIONS)).toEqual({ 1: ['b'], 2: ['x', 'z'] });
  });

  it('is scoped per attempt', () => {
    const storage = memoryStorage();
    saveAttemptDraft(storage, 'attempt-1', { 1: ['a'] });
    expect(loadAttemptDraft(storage, 'attempt-2', QUESTIONS)).toEqual({});
  });

  it('drops unknown questions, unknown options and duplicate ids', () => {
    const storage = memoryStorage();
    storage.setItem(attemptDraftKey('attempt-1'), JSON.stringify({ 1: ['a', 'a', 'evil'], 2: [42, 'y'], 99: ['a'] }));
    expect(loadAttemptDraft(storage, 'attempt-1', QUESTIONS)).toEqual({ 1: ['a'], 2: ['y'] });
  });

  it('ignores corrupt or non-object drafts', () => {
    const storage = memoryStorage();
    storage.setItem(attemptDraftKey('attempt-1'), '{not json');
    expect(loadAttemptDraft(storage, 'attempt-1', QUESTIONS)).toEqual({});
    storage.setItem(attemptDraftKey('attempt-1'), JSON.stringify(['a']));
    expect(loadAttemptDraft(storage, 'attempt-1', QUESTIONS)).toEqual({});
  });

  it('clears the draft after submission', () => {
    const storage = memoryStorage();
    saveAttemptDraft(storage, 'attempt-1', { 1: ['a'] });
    clearAttemptDraft(storage, 'attempt-1');
    expect(storage.map.size).toBe(0);
  });

  it('never throws when storage is unavailable or full', () => {
    const throwing = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => {
        throw new Error('SecurityError');
      }
    };
    expect(loadAttemptDraft(throwing, 'a', QUESTIONS)).toEqual({});
    expect(() => saveAttemptDraft(throwing, 'a', { 1: ['a'] })).not.toThrow();
    expect(() => clearAttemptDraft(throwing, 'a')).not.toThrow();
    expect(loadAttemptDraft(null, 'a', QUESTIONS)).toEqual({});
  });

  it('server responses win; the draft fills only unanswered questions', () => {
    expect(mergeResponses({ 1: ['a'], 2: [] }, { 1: ['b'], 2: ['y'] })).toEqual({ 1: ['a'], 2: ['y'] });
  });
});
