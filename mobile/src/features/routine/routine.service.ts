import type { AuthService } from '../auth/auth.service';
import type { Tokens } from '../auth/auth.types';
import type { SetType } from '../workout/workout.service';

export interface RoutineSummary {
  id: string;
  name: string;
  exerciseCount: number;
}

interface RoutineListResponse {
  data: RoutineSummary[];
}

interface CreateRoutineResponse {
  routine: {
    id: string;
    name: string;
  };
}

export interface RoutineExercise {
  id: string;
  exercise: {
    id: string;
    name: string;
  };
  position: number;
  restSeconds: number | null;
  targetRepetitionsMax: number | null;
  targetRepetitionsMin: number | null;
  targetSets: number | null;
  targetWeight: number | null;
  notes: string | null;
}

interface RoutineDetailResponse {
  routine: {
    id: string;
    name: string;
    exercises: RoutineExercise[];
  };
}

export interface RoutineDetail {
  id: string;
  name: string;
  exercises: RoutineExercise[];
}

export interface RoutineExerciseInput {
  notes?: string;
  restSeconds?: number;
  targetRepetitionsMax?: number;
  targetRepetitionsMin?: number;
  targetSets?: number;
  targetWeight?: number;
}

interface RoutineExerciseResponse {
  routineExercise: RoutineExercise;
}

interface WorkoutResponse {
  workout: {
    id: string;
    status: string;
    exercises: Array<{
      id: string;
      position: number;
      exercise: { id: string; name: string };
      sets: Array<{
        id: string;
        isCompleted: boolean;
      repetitions: number | null;
      rpe: number | null;
      setType: SetType;
      weight: number | null;
      }>;
    }>;
  };
}

export interface MobileWorkout {
  id: string;
  name: string;
  status: string;
  exercises: Array<{
    id: string;
    name: string;
    restSeconds: number;
    sets: Array<{
      id: string;
      isCompleted: boolean;
      repetitions: number;
      rpe: number;
      setType: SetType;
      weight: number;
    }>;
  }>;
}

export class RoutineService {
  constructor(private readonly authService: AuthService) {}

  async list(tokens: Tokens): Promise<{ routines: RoutineSummary[]; tokens: Tokens }> {
    const result = await this.authService.requestAuthenticated<RoutineListResponse>(tokens, '/routines');
    return { routines: result.data.data, tokens: result.tokens };
  }

  async create(
    tokens: Tokens,
    name: string,
  ): Promise<{ routine: RoutineSummary; tokens: Tokens }> {
    const result = await this.authService.requestAuthenticated<CreateRoutineResponse>(tokens, '/routines', {
      body: JSON.stringify({ name }),
      method: 'POST',
    });
    return {
      routine: {
        id: result.data.routine.id,
        name: result.data.routine.name,
        exerciseCount: 0,
      },
      tokens: result.tokens,
    };
  }

  async getDetail(tokens: Tokens, routineId: string): Promise<{ routine: RoutineDetail; tokens: Tokens }> {
    const result = await this.authService.requestAuthenticated<RoutineDetailResponse>(tokens, `/routines/${routineId}`);
    return { routine: result.data.routine, tokens: result.tokens };
  }

  async addExercise(
    tokens: Tokens,
    routineId: string,
    exerciseId: string,
  ): Promise<{ routineExercise: RoutineExercise; tokens: Tokens }> {
    const result = await this.authService.requestAuthenticated<RoutineExerciseResponse>(
      tokens,
      `/routines/${routineId}/exercises`,
      { body: JSON.stringify({ exerciseId }), method: 'POST' },
    );
    return { routineExercise: result.data.routineExercise, tokens: result.tokens };
  }

  async updateExercise(
    tokens: Tokens,
    routineId: string,
    routineExerciseId: string,
    input: RoutineExerciseInput,
  ): Promise<{ routineExercise: RoutineExercise; tokens: Tokens }> {
    const result = await this.authService.requestAuthenticated<RoutineExerciseResponse>(
      tokens,
      `/routines/${routineId}/exercises/${routineExerciseId}`,
      { body: JSON.stringify(input), method: 'PATCH' },
    );
    return { routineExercise: result.data.routineExercise, tokens: result.tokens };
  }

  async startWorkout(
    tokens: Tokens,
    routine: RoutineSummary,
  ): Promise<{ workout: MobileWorkout; tokens: Tokens }> {
    const detail = await this.authService.requestAuthenticated<RoutineDetailResponse>(tokens, `/routines/${routine.id}`);
    const result = await this.authService.requestAuthenticated<WorkoutResponse>(detail.tokens, '/workouts', {
      body: JSON.stringify({ routineId: routine.id }),
      method: 'POST',
    });
    const restByPosition = new Map(
      detail.data.routine.exercises.map((exercise) => [exercise.position, exercise.restSeconds ?? 90]),
    );
    return {
      tokens: result.tokens,
      workout: {
        id: result.data.workout.id,
        name: routine.name,
        status: result.data.workout.status,
        exercises: result.data.workout.exercises.map((exercise) => ({
          id: exercise.id,
          name: exercise.exercise.name,
          restSeconds: restByPosition.get(exercise.position) ?? 90,
          sets: exercise.sets.map((set) => ({
            id: set.id,
            isCompleted: set.isCompleted,
            repetitions: set.repetitions ?? 0,
            rpe: set.rpe ?? 0,
            setType: set.setType,
            weight: set.weight ?? 0,
          })),
        })),
      },
    };
  }
}
