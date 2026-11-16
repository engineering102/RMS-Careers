// Pure planning for "copy curriculum from another batch" (the insert lives in
// lib/db/queries/curriculum.ts). Client-safe: no database access.

export interface CopySourcePlacement {
  contentItemId: string;
  weekNumber: number;
  sequenceOrder: number;
  isRequired: boolean;
  availableFrom: Date | null;
  dueAt: Date | null;
  /** Program the content belongs to; null for global content. */
  contentProgramId: number | null;
  lifecycleStatus: 'draft' | 'published' | 'archived';
}

export interface CopyTargetPlacement {
  contentItemId: string;
  weekNumber: number;
  sequenceOrder: number;
}

export interface PlannedPlacement {
  contentItemId: string;
  weekNumber: number;
  sequenceOrder: number;
  isRequired: boolean;
  availableFrom: Date | null;
  dueAt: Date | null;
}

export interface CurriculumCopyPlan {
  rows: PlannedPlacement[];
  skipped: {
    /** Already placed in the target batch. */
    alreadyPlaced: number;
    /** Draft or archived content cannot be newly placed. */
    notPublished: number;
    /** Content owned by a different program than the target batch. */
    otherProgram: number;
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Whole days between two batch start dates (target minus source), or null when either is missing.
 * Whole days keep the copied times of day unchanged.
 */
export function dayShiftBetween(sourceStart: Date | null, targetStart: Date | null): number | null {
  if (!sourceStart || !targetStart) return null;
  return Math.round((targetStart.getTime() - sourceStart.getTime()) / DAY_MS);
}

/**
 * Decides which placements of the source batch are copied into the target batch. The same rules as
 * adding one item by hand apply: published content only, global or owned by the target's program,
 * and never a second placement of the same item. Week numbers and the required flag are kept. Items
 * land after whatever the target already has in that week. Dates are shifted by `shiftDays`, or
 * cleared when it is null.
 */
export function planCurriculumCopy(input: {
  source: readonly CopySourcePlacement[];
  target: readonly CopyTargetPlacement[];
  targetProgramId: number;
  shiftDays: number | null;
}): CurriculumCopyPlan {
  const placed = new Set(input.target.map((p) => p.contentItemId));
  const nextSequence = new Map<number, number>();
  for (const p of input.target) {
    nextSequence.set(p.weekNumber, Math.max(nextSequence.get(p.weekNumber) ?? 0, p.sequenceOrder));
  }

  const plan: CurriculumCopyPlan = { rows: [], skipped: { alreadyPlaced: 0, notPublished: 0, otherProgram: 0 } };
  const shift = (d: Date | null) =>
    d && input.shiftDays !== null ? new Date(d.getTime() + input.shiftDays * DAY_MS) : null;

  const ordered = [...input.source].sort(
    (a, b) => a.weekNumber - b.weekNumber || a.sequenceOrder - b.sequenceOrder
  );

  for (const item of ordered) {
    if (placed.has(item.contentItemId)) {
      plan.skipped.alreadyPlaced++;
      continue;
    }
    if (item.lifecycleStatus !== 'published') {
      plan.skipped.notPublished++;
      continue;
    }
    if (item.contentProgramId !== null && item.contentProgramId !== input.targetProgramId) {
      plan.skipped.otherProgram++;
      continue;
    }
    const sequenceOrder = (nextSequence.get(item.weekNumber) ?? 0) + 1;
    nextSequence.set(item.weekNumber, sequenceOrder);
    placed.add(item.contentItemId);
    plan.rows.push({
      contentItemId: item.contentItemId,
      weekNumber: item.weekNumber,
      sequenceOrder,
      isRequired: item.isRequired,
      availableFrom: shift(item.availableFrom),
      dueAt: shift(item.dueAt)
    });
  }

  return plan;
}
