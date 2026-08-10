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

interface RoutineExercise {
  position: number;
  restSeconds: number | null;
}

interface RoutineDetailResponse {
  routine: {
    exercises: RoutineExercise[];
  };
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
