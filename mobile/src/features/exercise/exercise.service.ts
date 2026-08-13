import type { AuthService } from '../auth/auth.service';
import type { Tokens } from '../auth/auth.types';

export interface ExerciseSummary {
  id: string;
  name: string;
  targetMuscleGroups: string[];
  equipment: string | null;
  isCustom: boolean;
}

export interface ExerciseDetail extends ExerciseSummary {
  description: string | null;
  instructions: string | null;
  mediaUrl: string | null;
}

interface ExerciseListResponse {
  data: ExerciseSummary[];
}

interface ExerciseDetailResponse {
  exercise: ExerciseDetail;
}

export interface ExerciseFilters {
  equipment?: string;
  muscleGroup?: string;
  query?: string;
}

export interface CreateExerciseInput {
  description?: string;
  equipment?: string;
  instructions?: string;
  name: string;
  targetMuscleGroups?: string[];
}

export class ExerciseService {
  constructor(private readonly authService: AuthService) {}

  async list(
    tokens: Tokens,
    filters: ExerciseFilters,
  ): Promise<{ exercises: ExerciseSummary[]; tokens: Tokens }> {
    const parameters = new URLSearchParams({ page: '1', limit: '200' });
    if (filters.query && filters.query.trim()) {
      parameters.set('query', filters.query.trim());
    }
    if (filters.muscleGroup && filters.muscleGroup.trim()) {
      parameters.set('muscleGroup', filters.muscleGroup.trim());
    }
    if (filters.equipment && filters.equipment.trim()) {
      parameters.set('equipment', filters.equipment.trim());
    }
    const result = await this.authService.requestAuthenticated<ExerciseListResponse>(
      tokens,
      `/exercises?${parameters.toString()}`,
    );
    return { exercises: result.data.data, tokens: result.tokens };
  }

  async getDetail(tokens: Tokens, exerciseId: string): Promise<{ exercise: ExerciseDetail; tokens: Tokens }> {
    const result = await this.authService.requestAuthenticated<ExerciseDetailResponse>(tokens, `/exercises/${exerciseId}`);
    return { exercise: result.data.exercise, tokens: result.tokens };
  }

  async create(
    tokens: Tokens,
    input: CreateExerciseInput,
  ): Promise<{ exercise: ExerciseDetail; tokens: Tokens }> {
    const result = await this.authService.requestAuthenticated<ExerciseDetailResponse>(tokens, '/exercises', {
      body: JSON.stringify(input),
      method: 'POST',
    });
    return { exercise: result.data.exercise, tokens: result.tokens };
  }
}
