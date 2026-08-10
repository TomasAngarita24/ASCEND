import { prisma } from '../../database/prisma';
import { estimateOneRepMax } from './one-rep-max';
import type { PersonalRecord, PersonalRecordsResponse } from './personal-record.types';

interface RecordCandidate {
  achievedAt: Date;
  exercise: { id: string; name: string };
  repetitions: number | null;
  weight: number | null;
}

function addRecord(
  records: PersonalRecord[],
  type: PersonalRecord['type'],
  candidate: RecordCandidate,
  value: number,
): void {
  records.push({
    type,
    exercise: candidate.exercise,
    value,
    achievedAt: candidate.achievedAt.toISOString(),
  });
}

export async function getPersonalRecords(userId: string): Promise<PersonalRecordsResponse> {
  const workouts = await prisma.workout.findMany({
    where: { userId, status: 'completed' },
    select: {
      completedAt: true,
      workoutExercises: {
        select: {
          exercise: { select: { id: true, name: true } },
          sets: {
            where: { isCompleted: true },
            select: { repetitions: true, weight: true },
          },
        },
      },
    },
    orderBy: { completedAt: 'asc' },
  });
  const highestWeight = new Map<string, number>();
  const highestRepetitionsAtWeight = new Map<string, number>();
  const highestEstimatedOneRepMax = new Map<string, number>();
  const highestTrainingVolume = new Map<string, number>();
  const records: PersonalRecord[] = [];

  for (const workout of workouts) {
    if (!workout.completedAt) {
      continue;
    }
    const volumeByExercise = new Map<string, { candidate: RecordCandidate; volume: number }>();
    for (const workoutExercise of workout.workoutExercises) {
      for (const set of workoutExercise.sets) {
        const candidate: RecordCandidate = {
          achievedAt: workout.completedAt,
          exercise: workoutExercise.exercise,
          repetitions: set.repetitions,
          weight: set.weight === null ? null : Number(set.weight),
        };
        if (candidate.weight === null || candidate.repetitions === null) {
          continue;
        }
        const exerciseId = candidate.exercise.id;
        const previousWeight = highestWeight.get(exerciseId);
        if (previousWeight === undefined || candidate.weight > previousWeight) {
          highestWeight.set(exerciseId, candidate.weight);
          addRecord(records, 'highest_weight', candidate, candidate.weight);
        }
        const repetitionsAtWeightKey = `${exerciseId}:${candidate.weight}`;
        const previousRepetitions = highestRepetitionsAtWeight.get(repetitionsAtWeightKey);
        if (previousRepetitions === undefined || candidate.repetitions > previousRepetitions) {
          highestRepetitionsAtWeight.set(repetitionsAtWeightKey, candidate.repetitions);
          addRecord(records, 'highest_repetitions_at_weight', candidate, candidate.repetitions);
        }
        const estimatedOneRepMax = estimateOneRepMax(candidate.weight, candidate.repetitions);
        const previousEstimatedOneRepMax = highestEstimatedOneRepMax.get(exerciseId);
        if (previousEstimatedOneRepMax === undefined || estimatedOneRepMax > previousEstimatedOneRepMax) {
          highestEstimatedOneRepMax.set(exerciseId, estimatedOneRepMax);
          addRecord(records, 'estimated_one_rep_max', candidate, Number(estimatedOneRepMax.toFixed(2)));
        }
        const volume = candidate.weight * candidate.repetitions;
        const existingVolume = volumeByExercise.get(exerciseId);
        volumeByExercise.set(exerciseId, {
          candidate,
          volume: (existingVolume?.volume ?? 0) + volume,
        });
      }
    }
    for (const [exerciseId, currentVolume] of volumeByExercise) {
      const previousVolume = highestTrainingVolume.get(exerciseId);
      if (previousVolume === undefined || currentVolume.volume > previousVolume) {
        highestTrainingVolume.set(exerciseId, currentVolume.volume);
        addRecord(records, 'highest_training_volume', currentVolume.candidate, currentVolume.volume);
      }
    }
  }

  return {
    data: records.sort((left, right) => right.achievedAt.localeCompare(left.achievedAt)),
  };
}
