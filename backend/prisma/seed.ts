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
}

seed()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    await prisma.$disconnect();
    throw error;
  });
