import { Prisma } from '../../generated/prisma/client';

import type { RoutineSetTarget } from './routine.types';

const MAX_SETS = 100;

export function parseRoutineSetTargets(value: Prisma.JsonValue | null | undefined): RoutineSetTarget[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;

  const result: RoutineSetTarget[] = [];
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) continue;
    const obj = entry as Record<string, unknown>;
    const weight = typeof obj.weight === 'number' && Number.isFinite(obj.weight) ? obj.weight : null;
    const repetitions = typeof obj.repetitions === 'number' && Number.isInteger(obj.repetitions)
      ? obj.repetitions
      : null;
    result.push({ weight, repetitions });
  }

  return result.length > 0 ? result.slice(0, MAX_SETS) : null;
}

export function normalizeSetTargets(input: unknown): RoutineSetTarget[] | null {
  if (!Array.isArray(input) || input.length === 0) return null;

  return input.slice(0, MAX_SETS).map((entry) => {
    const obj = (typeof entry === 'object' && entry !== null ? entry : {}) as Record<string, unknown>;
    const weight = typeof obj.weight === 'number' && Number.isFinite(obj.weight)
      ? Math.max(0, obj.weight)
      : null;
    const repetitions = typeof obj.repetitions === 'number' && Number.isInteger(obj.repetitions)
      ? Math.max(1, obj.repetitions)
      : null;
    return { weight, repetitions };
  });
}

export function setTargetsWriteValue(
  input: unknown,
): Prisma.InputJsonValue | typeof Prisma.DbNull | undefined {
  if (input === undefined) return undefined;
  const normalized = normalizeSetTargets(input);
  if (normalized === null) return Prisma.DbNull;
  return normalized as unknown as Prisma.InputJsonValue;
}