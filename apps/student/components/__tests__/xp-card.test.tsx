import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { XpCard } from '../overview/xp-card';
import { levelForXp, XP_PER_LEVEL } from '@/lib/types/activity';

const baseStats = { currentStreak: 5, longestStreak: 12, dsaSolvedCount: 7, lastActivityDateIst: '2026-10-12' };

describe('level rule matches the server ledger (100 XP per level)', () => {
  it('levelForXp follows total_xp / 100 + 1', () => {
    expect(XP_PER_LEVEL).toBe(100);
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(99)).toBe(1);
    expect(levelForXp(100)).toBe(2);
    expect(levelForXp(1605)).toBe(17);
    expect(levelForXp(-5)).toBe(1);
  });

  it('XP card shows the server level and the remaining XP for that level', () => {
    // The server stored level 17 for 1,605 XP; the card used to assume 500 XP/level and showed
    // "Level 17 · 6,895 XP to Level 18 · 0%".
    const html = renderToStaticMarkup(<XpCard stats={{ ...baseStats, totalXp: 1605, currentLevel: 17 }} />);
    expect(html).toContain('Level 17');
    expect(html).toContain('95 XP to Level 18');
    expect(html).toContain('5%');
  });

  it('derives the level from XP even if a stored level is stale', () => {
    const html = renderToStaticMarkup(<XpCard stats={{ ...baseStats, totalXp: 1450, currentLevel: 3 }} />);
    expect(html).toContain('Level 15');
    expect(html).toContain('50 XP to Level 16');
  });
});
