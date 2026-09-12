import { describe, it, expect } from 'vitest';
import {
  suggestWorkingWeight,
  sumSetsByExercise,
  roundToPlate,
  DELOAD_SETS_THRESHOLD,
  type PrevSetSummary,
} from '../utils/coaching';

describe('progressive overload suggestion (suggestWorkingWeight)', () => {
  const sets = (...rows: Array<[number | null, number | null]>): PrevSetSummary[] =>
    rows.map(([weight, repetitions], i) => ({ setNumber: i + 1, weight, repetitions }));

  it('suggests a +2.5 kg step when the working set reached 10+ reps', () => {
    const s = suggestWorkingWeight(sets([80, 12]))!;
    expect(s.direction).toBe('up');
    expect(s.weight).toBe(82.5);
    expect(s.prevReps).toBe(12);
  });

  it('keeps the weight when reps fall between 4 and 9', () => {
    const s = suggestWorkingWeight(sets([80, 8]))!;
    expect(s.direction).toBe('same');
    expect(s.weight).toBe(80);
  });

  it('suggests -2.5 kg when the working set was grindy (≤3 reps)', () => {
    const s = suggestWorkingWeight(sets([82.5, 2]))!;
    expect(s.direction).toBe('down');
    expect(s.weight).toBe(80);
  });

  it('uses the heaviest completed working set as reference', () => {
    const s = suggestWorkingWeight(sets([60, 12], [70, 10], [80, 11]))!;
    expect(s.prevWeight).toBe(80);
    expect(s.weight).toBe(82.5);
  });

  it('ignores empty warmup sets (missing reps/weight)', () => {
    const s = suggestWorkingWeight(sets([null, null], [40, 8], [null, 5]));
    expect(s?.prevWeight).toBe(40);
  });

  it('returns null when there is no recorded working set', () => {
    expect(suggestWorkingWeight(sets([null, null]))).toBeNull();
    expect(suggestWorkingWeight([])).toBeNull();
  });

  it('never suggests a weight below the 2.5 kg step', () => {
    const s = suggestWorkingWeight(sets([5, 2]))!;
    expect(s.weight).toBe(2.5);
  });

  it('rounds suggested weights to the nearest 2.5 kg plate', () => {
    expect(roundToPlate(2)).toBe(2.5);
    expect(roundToPlate(3.6)).toBe(2.5);
    expect(roundToPlate(4.4)).toBe(5);
    expect(roundToPlate(6.2)).toBe(5);
  });
});

describe('weekly volume deload detection (sumSetsByExercise)', () => {
  const wex = (id: string, completed: number) => ({
    exercise: { id },
    sets: Array.from({ length: completed }, (_, i) => ({ setNumber: i + 1, isCompleted: true })),
  });

  it('sums completed sets per exercise across recent workouts', () => {
    const totals = sumSetsByExercise([
      { exercises: [wex('ex-1', 4), wex('ex-2', 5)] },
      { exercises: [wex('ex-1', 4), wex('ex-3', 3)] },
    ]);
    expect(totals).toEqual({ 'ex-1': 8, 'ex-2': 5, 'ex-3': 3 });
  });

  it('ignores exercises without completed sets and unknown ids', () => {
    const totals = sumSetsByExercise([{ exercises: [wex('ex-1', 0), { exercise: null, sets: [] }] }]);
    expect(totals).toEqual({});
  });

  it('flags volume at or above the threshold', () => {
    const totals = sumSetsByExercise([{ exercises: [wex('ex-1', DELOAD_SETS_THRESHOLD)] }]);
    expect(totals['ex-1']).toBeGreaterThanOrEqual(DELOAD_SETS_THRESHOLD);
  });
});