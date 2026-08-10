import type { AuthService } from '../auth/auth.service';
import type { Tokens } from '../auth/auth.types';

export interface WorkoutHistoryEntry {
  id: string;
  routineId: string | null;
  status: 'completed' | 'cancelled';
  startedAt: string;
  completedAt: string | null;
  durationSeconds: number | null;
  exerciseCount: number;
  setsCompleted: number;
  totalRepetitions: number;
  totalVolume: number;
}

interface WorkoutHistoryResponse {
  data: WorkoutHistoryEntry[];
}

export interface WorkoutDetail {
  id: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  exercises: Array<{
    id: string;
    position: number;
    exercise: {
      id: string;
      name: string;
    };
    sets: Array<{
      id: string;
      setNumber: number;
      weight: number | null;
      repetitions: number | null;
      rpe: number | null;
      setType: string;
      isCompleted: boolean;
    }>;
  }>;
}

interface WorkoutDetailResponse {
  workout: WorkoutDetail;
}

export class HistoryService {
  constructor(private readonly authService: AuthService) {}

  async list(tokens: Tokens): Promise<{ workouts: WorkoutHistoryEntry[]; tokens: Tokens }> {
    const result = await this.authService.requestAuthenticated<WorkoutHistoryResponse>(
      tokens,
      '/workouts?status=completed&page=1&limit=20',
    );
    return { workouts: result.data.data, tokens: result.tokens };
  }

  async getDetail(tokens: Tokens, workoutId: string): Promise<{ workout: WorkoutDetail; tokens: Tokens }> {
    const result = await this.authService.requestAuthenticated<WorkoutDetailResponse>(tokens, `/workouts/${workoutId}`);
    return { workout: result.data.workout, tokens: result.tokens };
  }
}
