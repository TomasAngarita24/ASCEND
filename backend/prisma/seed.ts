import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../src/generated/prisma/client';

const EXERCISE_API_URL = 'https://marcmayol.com/exercise-api/v1/dataset.json';

interface ApiMuscle {
  id: string;
  es: string;
  en: string;
}

interface ApiExercise {
  slug: string;
  name: { es: string; en: string };
  group: { id: string; es: string; en: string };
  equipment: { id: string; es: string; en: string };
  primaryMuscles: ApiMuscle[];
  secondaryMuscles: ApiMuscle[];
  instructions: { es: string[]; en: string[] };
  images: { male: string; female: string };
  muscleMap: string;
}

interface ApiDataset {
  exercises: ApiExercise[];
}

const MUSCLE_MAP: Record<string, string> = {
  abs: 'Abdominales',
  adductors: 'Adductor',
  biceps: 'Biceps',
  calves: 'Pantorrillas',
  chest: 'Pecho',
  deltoids: 'Hombros',
  forearm: 'Antebrazo',
  gluteal: 'Gluteos',
  hamstring: 'Femoral',
  'lower-back': 'Espalda baja',
  obliques: 'Abdominales',
  quadriceps: 'Cuadriceps',
  trapezius: 'Trapecio',
  triceps: 'Triceps',
  'upper-back': 'Dorsal',
};

const EQUIPMENT_MAP: Record<string, string> = {
  barbell: 'Barra',
  bodyweight: 'Ninguno',
  cable: 'Maquinas',
  cardio: 'Ninguno',
  dumbbell: 'Mancuernas',
  machine: 'Maquinas',
};

function mapPrimaryMuscles(primary: ApiMuscle[]): string[] {
  const mapped = primary.map((m) => MUSCLE_MAP[m.id] ?? m.es);
  return [...new Set(mapped)];
}

function mapMuscles(primary: ApiMuscle[], secondary: ApiMuscle[]): string[] {
  const all = [...primary, ...secondary];
  const mapped = all.map((m) => MUSCLE_MAP[m.id] ?? m.es);
  return [...new Set(mapped)];
}

function mapEquipment(eq: { id: string; es: string }): string {
  return EQUIPMENT_MAP[eq.id] ?? eq.es;
}

function mapInstructions(steps: string[]): string {
  return steps.map((step, i) => `${i + 1}. ${step}`).join('\n');
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to seed exercises.');
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

interface TemplateExerciseSeed {
  name: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  rest: number;
}

interface TemplateSeed {
  slug: string;
  name: string;
  description: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  goal: 'strength' | 'hypertrophy' | 'general';
  equipment: string;
  exercises: TemplateExerciseSeed[];
}

// Exercise names must match the global seeded catalog (prisma:seed).
const ROUTINE_TEMPLATES: TemplateSeed[] = [
  {
    slug: 'full-body-barbell',
    name: 'Full Body (Barra)',
    description: 'Cuerpo completo en una sola sesión con barra. Ideal para entrenar 3 veces por semana.',
    level: 'beginner',
    goal: 'general',
    equipment: 'Barra',
    exercises: [
      { name: 'Sentadilla con barra', sets: 3, repsMin: 8, repsMax: 12, rest: 120 },
      { name: 'Press de banca', sets: 3, repsMin: 8, repsMax: 12, rest: 120 },
      { name: 'Remo con barra', sets: 3, repsMin: 8, repsMax: 12, rest: 120 },
      { name: 'Press militar con barra', sets: 3, repsMin: 8, repsMax: 10, rest: 120 },
      { name: 'Curl de bíceps con barra', sets: 3, repsMin: 10, repsMax: 12, rest: 90 },
      { name: 'Elevación de gemelos de pie', sets: 3, repsMin: 12, repsMax: 15, rest: 60 },
    ],
  },
  {
    slug: 'upper-body-barbell',
    name: 'Torso Superior (Barra)',
    description: 'Empuje, tirón y brazos centrados en fuerza con la barra.',
    level: 'intermediate',
    goal: 'strength',
    equipment: 'Barra',
    exercises: [
      { name: 'Press de banca', sets: 4, repsMin: 6, repsMax: 10, rest: 150 },
      { name: 'Remo con barra', sets: 4, repsMin: 6, repsMax: 10, rest: 150 },
      { name: 'Press de banca inclinado con barra', sets: 3, repsMin: 8, repsMax: 12, rest: 120 },
      { name: 'Press militar con barra', sets: 3, repsMin: 6, repsMax: 10, rest: 120 },
      { name: 'Press francés', sets: 3, repsMin: 8, repsMax: 12, rest: 90 },
      { name: 'Elevaciones laterales con mancuernas', sets: 3, repsMin: 10, repsMax: 15, rest: 60 },
    ],
  },
  {
    slug: 'lower-body-barbell',
    name: 'Torso Inferior (Barra)',
    description: 'Dominancia de pierna y cadera con barra para ganar fuerza.',
    level: 'intermediate',
    goal: 'strength',
    equipment: 'Barra',
    exercises: [
      { name: 'Sentadilla con barra', sets: 4, repsMin: 6, repsMax: 10, rest: 150 },
      { name: 'Peso muerto rumano', sets: 3, repsMin: 8, repsMax: 12, rest: 120 },
      { name: 'Prensa de piernas', sets: 3, repsMin: 10, repsMax: 12, rest: 120 },
      { name: 'Extensión de piernas', sets: 3, repsMin: 12, repsMax: 15, rest: 60 },
      { name: 'Curl de piernas tumbado', sets: 3, repsMin: 12, repsMax: 15, rest: 60 },
      { name: 'Elevación de gemelos de pie', sets: 4, repsMin: 12, repsMax: 15, rest: 60 },
    ],
  },
  {
    slug: 'push-barbell',
    name: 'Empuje (Push)',
    description: 'Pecho, hombro y tríceps. La mitad superior del clásico PPL.',
    level: 'beginner',
    goal: 'hypertrophy',
    equipment: 'Barra',
    exercises: [
      { name: 'Press de banca', sets: 3, repsMin: 8, repsMax: 12, rest: 120 },
      { name: 'Press militar con barra', sets: 3, repsMin: 8, repsMax: 12, rest: 120 },
      { name: 'Press de banca inclinado con barra', sets: 3, repsMin: 8, repsMax: 12, rest: 120 },
      { name: 'Cruce de poleas', sets: 3, repsMin: 10, repsMax: 15, rest: 60 },
      { name: 'Elevaciones laterales con mancuernas', sets: 3, repsMin: 12, repsMax: 15, rest: 60 },
      { name: 'Extensión de tríceps en polea', sets: 3, repsMin: 10, repsMax: 15, rest: 60 },
    ],
  },
  {
    slug: 'pull-barbell',
    name: 'Tirón (Pull)',
    description: 'Espalda y bíceps. La otra mitad del clásico PPL.',
    level: 'beginner',
    goal: 'hypertrophy',
    equipment: 'Barra',
    exercises: [
      { name: 'Dominadas', sets: 3, repsMin: 6, repsMax: 10, rest: 120 },
      { name: 'Remo con barra', sets: 3, repsMin: 8, repsMax: 12, rest: 120 },
      { name: 'Jalón al pecho', sets: 3, repsMin: 10, repsMax: 12, rest: 90 },
      { name: 'Curl de bíceps con barra', sets: 3, repsMin: 10, repsMax: 12, rest: 90 },
      { name: 'Curl martillo con mancuernas', sets: 2, repsMin: 10, repsMax: 12, rest: 60 },
    ],
  },
  {
    slug: 'legs-barbell',
    name: 'Piernas (Barra)',
    description: 'Sesión de pierna completa: cuádriceps, isquios y gemelos.',
    level: 'beginner',
    goal: 'strength',
    equipment: 'Barra',
    exercises: [
      { name: 'Sentadilla con barra', sets: 3, repsMin: 8, repsMax: 10, rest: 150 },
      { name: 'Peso muerto rumano', sets: 3, repsMin: 8, repsMax: 10, rest: 120 },
      { name: 'Prensa de piernas', sets: 3, repsMin: 10, repsMax: 12, rest: 120 },
      { name: 'Curl de piernas tumbado', sets: 3, repsMin: 10, repsMax: 12, rest: 60 },
      { name: 'Elevación de gemelos de pie', sets: 4, repsMin: 12, repsMax: 15, rest: 60 },
    ],
  },
  {
    slug: 'full-body-bodyweight',
    name: 'Full Body (Sin Material)',
    description: 'Cuerpo completo con el peso corporal. Perfecto para empezar sin equipamiento.',
    level: 'beginner',
    goal: 'general',
    equipment: 'Ninguno',
    exercises: [
      { name: 'Sentadilla sin peso', sets: 3, repsMin: 10, repsMax: 15, rest: 90 },
      { name: 'Flexiones', sets: 3, repsMin: 8, repsMax: 12, rest: 90 },
      { name: 'Remo invertido', sets: 3, repsMin: 8, repsMax: 12, rest: 90 },
      { name: 'Puente de glúteo', sets: 3, repsMin: 10, repsMax: 15, rest: 60 },
      { name: 'Crunch abdominal', sets: 3, repsMin: 12, repsMax: 20, rest: 60 },
      { name: 'Elevación de piernas tumbado', sets: 2, repsMin: 10, repsMax: 15, rest: 60 },
    ],
  },
];

async function seedTemplates(): Promise<void> {
  console.log('Syncing routine templates...');

  for (const template of ROUTINE_TEMPLATES) {
    const resolved: Array<{
      exerciseId: string;
      position: number;
      sets: number;
      repsMin: number;
      repsMax: number;
      rest: number;
    }> = [];
    let position = 1;

    for (const exercise of template.exercises) {
      const found = await prisma.exercise.findFirst({
        where: { createdByUserId: null, name: exercise.name },
        select: { id: true },
      });

      if (!found) {
        console.warn(`Template "${template.slug}": exercise "${exercise.name}" not found in catalog; skipping.`);
        continue;
      }

      resolved.push({
        exerciseId: found.id,
        position: position++,
        sets: exercise.sets,
        repsMin: exercise.repsMin,
        repsMax: exercise.repsMax,
        rest: exercise.rest,
      });
    }

    if (resolved.length === 0) {
      console.warn(`Template "${template.slug}": no exercises resolved; skipping.`);
      continue;
    }

    await prisma.routineTemplate.upsert({
      where: { slug: template.slug },
      update: { name: template.name, description: template.description, level: template.level, goal: template.goal, equipment: template.equipment },
      create: { slug: template.slug, name: template.name, description: template.description, level: template.level, goal: template.goal, equipment: template.equipment },
    });

    const row = await prisma.routineTemplate.findUniqueOrThrow({
      where: { slug: template.slug },
      select: { id: true },
    });

    await prisma.routineTemplateExercise.deleteMany({ where: { templateId: row.id } });
    await prisma.routineTemplateExercise.createMany({
      data: resolved.map((item) => ({
        templateId: row.id,
        exerciseId: item.exerciseId,
        exerciseName: `${template.exercises[item.position - 1].name}`,
        position: item.position,
        targetSets: item.sets,
        targetRepetitionsMin: item.repsMin,
        targetRepetitionsMax: item.repsMax,
        restSeconds: item.rest,
      })),
    });

    console.log(`Seeded template "${template.slug}" with ${resolved.length} exercises.`);
  }
}

async function seed(): Promise<void> {
  console.log(`Fetching exercises from ${EXERCISE_API_URL}...`);

  const response = await fetch(EXERCISE_API_URL);

  if (!response.ok) {
    throw new Error(`Failed to fetch exercises: ${response.status} ${response.statusText}`);
  }

  const dataset = (await response.json()) as ApiDataset;
  const exercises = dataset.exercises;

  console.log(`Fetched ${exercises.length} exercises. Syncing to database...`);

  const seededNames = new Set<string>();

  for (const exercise of exercises) {
    const name = exercise.name.es;
    const data = {
      description: exercise.name.en,
      equipment: mapEquipment(exercise.equipment),
      instructions: mapInstructions(exercise.instructions.es),
      mediaUrl: exercise.images.male,
      name,
      targetMuscleGroups: mapMuscles(exercise.primaryMuscles, exercise.secondaryMuscles),
      primaryMuscleGroups: mapPrimaryMuscles(exercise.primaryMuscles),
    };

    seededNames.add(name);

    const existing = await prisma.exercise.findFirst({
      where: { createdByUserId: null, name },
      select: { id: true },
    });

    if (existing) {
      await prisma.exercise.update({ where: { id: existing.id }, data });
    } else {
      await prisma.exercise.create({ data });
    }
  }

  const deleted = await prisma.exercise.deleteMany({
    where: {
      createdByUserId: null,
      name: { notIn: [...seededNames] },
    },
  });

  if (deleted.count > 0) {
    console.log(`Removed ${deleted.count} obsolete global exercise(s).`);
  }

  console.log(`Exercise seeding complete! ${exercises.length} exercises synced.`);

  await seedTemplates();
  console.log('Routine template seeding complete!');
}

seed()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    await prisma.$disconnect();
    throw error;
  });
