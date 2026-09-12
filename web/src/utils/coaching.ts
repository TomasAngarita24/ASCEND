import type { WorkoutExercise } from '../api/api';

export interface PrevSetSummary {
  setNumber: number;
  weight: number | null;
  repetitions: number | null;
}

export interface WeightSuggestion {
  weight: number;
  direction: 'up' | 'same' | 'down';
  reason: string;
  prevWeight: number;
  prevReps: number;
}

const WEIGHT_STEP = 2.5;

/** Rounds a weight down to the nearest 2.5 kg plate-friendly step. */
export function roundToPlate(value: number): number {
  return Math.max(WEIGHT_STEP, Math.round(value / WEIGHT_STEP) * WEIGHT_STEP);
}

/**
 * Progressive-overload suggestion derived from the heaviest working set of the
 * last session: ≥10 reps means the load can grow one plate step; ≤3 reps means
 * it was grindy and should drop a step; anything in between repeats the weight.
 */
export function suggestWorkingWeight(prevSets: PrevSetSummary[]): WeightSuggestion | null {
  const candidates = prevSets
    .filter((s) => s.weight != null && s.weight > 0 && s.repetitions != null)
    .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));
  const working = candidates[0];
  if (!working) return null;

  const weight = working.weight!;
  const reps = working.repetitions!;

  if (reps >= 10) {
    const next = roundToPlate(weight + WEIGHT_STEP);
    return {
      weight: next,
      direction: 'up',
      reason: `La sesión pasada cerraste ${weight} kg × ${reps} reps: sube a ${next} kg.`,
      prevWeight: weight,
      prevReps: reps,
    };
  }

  if (reps <= 3) {
    const next = roundToPlate(weight - WEIGHT_STEP);
    return {
      weight: next,
      direction: 'down',
      reason: `${weight} kg te dejó solo ${reps} reps: baja a ${next} kg y reconstruye.`,
      prevWeight: weight,
      prevReps: reps,
    };
  }

  return {
    weight: roundToPlate(weight),
    direction: 'same',
    reason: `Repite ${weight} kg (la sesión pasada hiciste ${reps} reps).`,
    prevWeight: weight,
    prevReps: reps,
  };
}

/** Completed-set volume per exercise across recent workouts. */
export function sumSetsByExercise(recentWorkouts: { exercises: WorkoutExercise[] }[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const workout of recentWorkouts) {
    for (const ex of workout.exercises) {
      const id = ex.exercise?.id;
      if (!id) continue;
      const completed = ex.sets.filter((s) => s.isCompleted).length;
      if (completed > 0) totals[id] = (totals[id] ?? 0) + completed;
    }
  }
  return totals;
}

/** Set volume within a week that warrants a deload suggestion. */
export const DELOAD_SETS_THRESHOLD = 12;