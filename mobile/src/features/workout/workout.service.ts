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

interface SetResponse {
  set: RecordedSet;
}

interface WorkoutTransitionResponse {
  workout: {
    status: string;
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
