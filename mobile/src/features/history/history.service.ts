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

export class HistoryService {
  constructor(private readonly authService: AuthService) {}

  async list(tokens: Tokens): Promise<{ workouts: WorkoutHistoryEntry[]; tokens: Tokens }> {
    const result = await this.authService.requestAuthenticated<WorkoutHistoryResponse>(
      tokens,
      '/workouts?status=completed&page=1&limit=20',
    );
    return { workouts: result.data.data, tokens: result.tokens };
  }
}
