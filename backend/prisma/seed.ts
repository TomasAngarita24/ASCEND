import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../src/generated/prisma/client';

interface SeedExercise {
  description: string;
  equipment: string;
  instructions: string;
  name: string;
  targetMuscleGroups: string[];
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to seed exercises.');
}

const exercises: SeedExercise[] = [
  {
    name: 'Barbell Bench Press',
    description: 'A horizontal barbell press performed on a flat bench.',
    targetMuscleGroups: ['Chest', 'Triceps', 'Shoulders'],
    equipment: 'Barbell',
    instructions: 'Lower the bar to the chest with control, then press it upward.',
  },
  {
    name: 'Barbell Back Squat',
    description: 'A barbell squat with the load positioned across the upper back.',
    targetMuscleGroups: ['Quadriceps', 'Glutes', 'Hamstrings'],
    equipment: 'Barbell',
    instructions: 'Brace the torso, squat to a controlled depth, then stand through the mid-foot.',
  },
  {
    name: 'Conventional Deadlift',
    description: 'A barbell pull from the floor to a standing position.',
    targetMuscleGroups: ['Hamstrings', 'Glutes', 'Back'],
    equipment: 'Barbell',
    instructions: 'Keep the bar close, brace the torso, and stand by extending hips and knees.',
  },
  {
    name: 'Overhead Press',
    description: 'A standing barbell press performed overhead.',
    targetMuscleGroups: ['Shoulders', 'Triceps'],
    equipment: 'Barbell',
    instructions: 'Press the bar overhead while keeping the torso braced and the bar path controlled.',
  },
  {
    name: 'Pull-Up',
    description: 'A vertical pulling exercise using body weight.',
    targetMuscleGroups: ['Back', 'Biceps'],
    equipment: 'Pull-Up Bar',
    instructions: 'Pull the chest toward the bar with control, then lower to a full hang.',
  },
  {
    name: 'Barbell Row',
    description: 'A bent-over row performed with a barbell.',
    targetMuscleGroups: ['Back', 'Biceps'],
    equipment: 'Barbell',
    instructions: 'Keep the torso stable and pull the bar toward the lower torso.',
  },
  {
    name: 'Lat Pulldown',
    description: 'A cable-based vertical pulling exercise.',
    targetMuscleGroups: ['Back', 'Biceps'],
    equipment: 'Cable Machine',
    instructions: 'Pull the bar toward the upper chest, then return with control.',
  },
  {
    name: 'Dumbbell Curl',
    description: 'An elbow-flexion exercise performed with dumbbells.',
    targetMuscleGroups: ['Biceps'],
    equipment: 'Dumbbells',
    instructions: 'Curl the dumbbells without swinging, then lower under control.',
  },
  {
    name: 'Triceps Pushdown',
    description: 'A cable triceps extension exercise.',
    targetMuscleGroups: ['Triceps'],
    equipment: 'Cable Machine',
    instructions: 'Extend the elbows while keeping the upper arms stable.',
  },
  {
    name: 'Dumbbell Lateral Raise',
    description: 'A shoulder-abduction exercise performed with dumbbells.',
    targetMuscleGroups: ['Shoulders'],
    equipment: 'Dumbbells',
    instructions: 'Raise the dumbbells to shoulder height with a controlled range of motion.',
  },
  {
    name: 'Leg Press',
    description: 'A machine-based lower-body pressing exercise.',
    targetMuscleGroups: ['Quadriceps', 'Glutes'],
    equipment: 'Leg Press Machine',
    instructions: 'Lower the platform with control, then press through the feet without locking the knees forcefully.',
  },
  {
    name: 'Romanian Deadlift',
    description: 'A hip-hinge exercise emphasizing the posterior chain.',
    targetMuscleGroups: ['Hamstrings', 'Glutes'],
    equipment: 'Barbell',
    instructions: 'Hinge at the hips while keeping the bar close, then extend the hips to stand.',
  },
];

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function seed(): Promise<void> {
  for (const exercise of exercises) {
    const existingExercise = await prisma.exercise.findFirst({
      where: { createdByUserId: null, name: exercise.name },
      select: { id: true },
    });
    if (!existingExercise) {
      await prisma.exercise.create({ data: exercise });
    }
  }
}

seed()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    await prisma.$disconnect();
    throw error;
  });
