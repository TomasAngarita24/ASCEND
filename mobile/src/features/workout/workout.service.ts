import type { AuthService } from '../auth/auth.service';
import type { Tokens } from '../auth/auth.types';

export type SetType = 'normal' | 'warmup' | 'drop_set' | 'failure';

export interface SetInput {
  isCompleted: boolean;
  repetitions: number;
  rpe: number;
  setType: SetType;
  weight: number;
}

export interface RecordedSet extends SetInput {
  id: string;
}

export type WorkoutAction = 'pause' | 'resume' | 'complete' | 'cancel';

export interface StartedWorkout {
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

interface SetResponse {
  set: RecordedSet;
}

interface WorkoutTransitionResponse {
  workout: {
    status: string;
  };
}

interface WorkoutExerciseResponse {
  workoutExercise: {
    id: string;
    exercise: { id: string; name: string };
    sets: Array<{
      id: string;
      isCompleted: boolean;
      repetitions: number | null;
      rpe: number | null;
      setType: SetType;
      weight: number | null;
    }>;
  };
}

interface StartWorkoutResponse {
  workout: {
    id: string;
    status: string;
    exercises: WorkoutExerciseResponse['workoutExercise'][];
  };
}

function toStartedWorkout(workout: StartWorkoutResponse['workout'], name: string): StartedWorkout {
  return {
    id: workout.id,
    name,
    status: workout.status,
    exercises: workout.exercises.map((exercise) => ({
      id: exercise.id,
      name: exercise.exercise.name,
      restSeconds: 90,
      sets: exercise.sets.map((set) => ({
        id: set.id,
        isCompleted: set.isCompleted,
        repetitions: set.repetitions ?? 0,
        rpe: set.rpe ?? 0,
        setType: set.setType,
        weight: set.weight ?? 0,
      })),
    })),
  };
}

export class WorkoutService {
  constructor(private readonly authService: AuthService) {}

  async createSet(
    tokens: Tokens,
    workoutId: string,
    workoutExerciseId: string,
    input: SetInput,
  ): Promise<{ set: RecordedSet; tokens: Tokens }> {
    const result = await this.authService.requestAuthenticated<SetResponse>(
      tokens,
      `/workouts/${workoutId}/exercises/${workoutExerciseId}/sets`,
      { body: JSON.stringify(input), method: 'POST' },
    );
    return { set: result.data.set, tokens: result.tokens };
  }

  async start(tokens: Tokens): Promise<{ workout: StartedWorkout; tokens: Tokens }> {
    const result = await this.authService.requestAuthenticated<StartWorkoutResponse>(tokens, '/workouts', {
      body: '{}',
      method: 'POST',
    });
    return { workout: toStartedWorkout(result.data.workout, 'Entrenamiento independiente'), tokens: result.tokens };
  }

  async addExercise(
    tokens: Tokens,
    workoutId: string,
    exerciseId: string,
  ): Promise<{ exercise: StartedWorkout['exercises'][number]; tokens: Tokens }> {
    const result = await this.authService.requestAuthenticated<WorkoutExerciseResponse>(
      tokens,
      `/workouts/${workoutId}/exercises`,
      { body: JSON.stringify({ exerciseId }), method: 'POST' },
    );
    const workout = toStartedWorkout({
      id: workoutId,
      status: 'active',
      exercises: [result.data.workoutExercise],
    }, '');
    return { exercise: workout.exercises[0], tokens: result.tokens };
  }

  async updateSetCompletion(
    tokens: Tokens,
    workoutId: string,
    workoutExerciseId: string,
    setId: string,
    isCompleted: boolean,
  ): Promise<{ set: RecordedSet; tokens: Tokens }> {
    const result = await this.authService.requestAuthenticated<SetResponse>(
      tokens,
      `/workouts/${workoutId}/exercises/${workoutExerciseId}/sets/${setId}`,
      { body: JSON.stringify({ isCompleted }), method: 'PATCH' },
    );
    return { set: result.data.set, tokens: result.tokens };
  }

  async updateSet(
    tokens: Tokens,
    workoutId: string,
    workoutExerciseId: string,
    setId: string,
    input: SetInput,
  ): Promise<{ set: RecordedSet; tokens: Tokens }> {
    const result = await this.authService.requestAuthenticated<SetResponse>(
      tokens,
      `/workouts/${workoutId}/exercises/${workoutExerciseId}/sets/${setId}`,
      { body: JSON.stringify(input), method: 'PATCH' },
    );
    return { set: result.data.set, tokens: result.tokens };
  }

  async transition(
    tokens: Tokens,
    workoutId: string,
    action: WorkoutAction,
  ): Promise<{ status: string; tokens: Tokens }> {
    const result = await this.authService.requestAuthenticated<WorkoutTransitionResponse>(
      tokens,
      `/workouts/${workoutId}/${action}`,
      { method: 'POST' },
    );
    return { status: result.data.workout.status, tokens: result.tokens };
  }
}
