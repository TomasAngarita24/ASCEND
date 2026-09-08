import { Prisma } from '../../generated/prisma/client';
import { prisma } from '../../database/prisma';
import { HttpError } from '../../errors/http-error';
import type { RoutineResponse } from '../routine/routine.types';
import type {
  RoutineTemplateDetail,
  RoutineTemplateExerciseResponse,
  RoutineTemplateSummary,
} from './routine-template.types';

type RoutineTemplateWithExercises = Prisma.RoutineTemplateGetPayload<{
  include: { exercises: { include: { exercise: true }; orderBy: { position: 'asc' } } };
}>;

interface RoutineTemplateFilters {
  level?: string;
  goal?: string;
  equipment?: string;
}

function toSummary(
  template: RoutineTemplateWithExercises | (RoutineTemplateWithExercises & { _count: { exercises: number } }),
): RoutineTemplateSummary {
  const exerciseCount = '_count' in template ? template._count.exercises : template.exercises.length;

  return {
    id: template.id,
    slug: template.slug,
    name: template.name,
    description: template.description,
    level: template.level,
    goal: template.goal,
    equipment: template.equipment,
    exerciseCount,
  };
}

function toExerciseResponse(
  item: Prisma.RoutineTemplateExerciseGetPayload<{ include: { exercise: true } }>,
): RoutineTemplateExerciseResponse {
  return {
    id: item.id,
    position: item.position,
    targetSets: item.targetSets,
    targetRepetitionsMin: item.targetRepetitionsMin,
    targetRepetitionsMax: item.targetRepetitionsMax,
    restSeconds: item.restSeconds,
    exercise: { id: item.exercise.id, name: item.exercise.name },
  };
}

function toDetail(template: RoutineTemplateWithExercises): RoutineTemplateDetail {
  return { ...toSummary(template), exercises: template.exercises.map(toExerciseResponse) };
}

export async function listRoutineTemplates(filters: RoutineTemplateFilters = {}): Promise<{ data: RoutineTemplateSummary[] }> {
  const templates = await prisma.routineTemplate.findMany({
    where: {
      ...(filters.level ? { level: filters.level } : {}),
      ...(filters.goal ? { goal: filters.goal } : {}),
      ...(filters.equipment ? { equipment: filters.equipment } : {}),
    },
    include: {
      _count: { select: { exercises: true } },
      exercises: { select: { id: true } },
    },
    orderBy: { name: 'asc' },
  });

  return {
    data: templates
      .filter((template) => template._count.exercises > 0)
      .map((template) => toSummary(template as RoutineTemplateWithExercises & { _count: { exercises: number } })),
  };
}

async function findTemplate(templateId: string): Promise<RoutineTemplateWithExercises> {
  const template = await prisma.routineTemplate.findUnique({
    where: { id: templateId },
    include: { exercises: { include: { exercise: true }, orderBy: { position: 'asc' } } },
  });

  if (!template) {
    throw new HttpError(404, 'ROUTINE_TEMPLATE_NOT_FOUND', 'Routine template does not exist.');
  }

  return template;
}

export async function getRoutineTemplate(templateId: string): Promise<RoutineTemplateDetail> {
  return toDetail(await findTemplate(templateId));
}

export async function addRoutineTemplateToUser(userId: string, templateId: string): Promise<RoutineResponse> {
  const template = await findTemplate(templateId);

  if (template.exercises.length === 0) {
    throw new HttpError(422, 'ROUTINE_TEMPLATE_EMPTY', 'Routine template has no exercises.');
  }

  const routine = await prisma.routine.create({
    data: {
      name: template.name,
      userId,
      routineExercises: {
        create: template.exercises.map((item) => ({
          exerciseId: item.exerciseId,
          position: item.position,
          targetSets: item.targetSets,
          targetRepetitionsMin: item.targetRepetitionsMin,
          targetRepetitionsMax: item.targetRepetitionsMax,
          restSeconds: item.restSeconds,
        })),
      },
    },
    include: { routineExercises: { include: { exercise: true }, orderBy: { position: 'asc' } } },
  });

  return {
    id: routine.id,
    name: routine.name,
    folderId: routine.folderId,
    exercises: routine.routineExercises.map((item) => ({
      id: item.id,
      position: item.position,
      targetSets: item.targetSets,
      targetRepetitionsMin: item.targetRepetitionsMin,
      targetRepetitionsMax: item.targetRepetitionsMax,
      targetWeight: item.targetWeight === null ? null : Number(item.targetWeight),
      restSeconds: item.restSeconds,
      notes: item.notes,
      exercise: { id: item.exercise.id, name: item.exercise.name },
    })),
    createdAt: routine.createdAt.toISOString(),
    updatedAt: routine.updatedAt.toISOString(),
  };
}