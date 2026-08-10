import type { AuthService } from '../auth/auth.service';
import type { Tokens } from '../auth/auth.types';

export interface ProgressStatistics {
  totalWorkouts: number;
  workoutFrequency: number;
  totalVolume: number;
  totalSets: number;
  totalRepetitions: number;
  personalRecords: number;
}

export interface PersonalRecord {
  type: string;
  exercise: { id: string; name: string };
  value: number;
  achievedAt: string;
}

export interface MuscleGroupStatistic {
  muscleGroup: string;
  trainingFrequency: number;
  volume: number;
}

interface StatisticsResponse {
  statistics: ProgressStatistics;
}

interface PersonalRecordsResponse {
  data: PersonalRecord[];
}

interface MuscleGroupsResponse {
  data: MuscleGroupStatistic[];
}

export interface ProgressDashboard {
  muscleGroups: MuscleGroupStatistic[];
  personalRecords: PersonalRecord[];
  statistics: ProgressStatistics;
}

export interface ExerciseProgressPoint {
  date: string;
  weight: number | null;
  repetitions: number;
  volume: number;
  estimatedOneRepMax: number | null;
}

interface ExerciseProgressionResponse {
  exercise: {
    id: string;
    name: string;
  };
  data: ExerciseProgressPoint[];
}

export class ProgressService {
  constructor(private readonly authService: AuthService) {}

  async getDashboard(tokens: Tokens): Promise<{ dashboard: ProgressDashboard; tokens: Tokens }> {
    const statistics = await this.authService.requestAuthenticated<StatisticsResponse>(tokens, '/progress/statistics');
    const personalRecords = await this.authService.requestAuthenticated<PersonalRecordsResponse>(
      statistics.tokens,
      '/progress/personal-records',
    );
    const muscleGroups = await this.authService.requestAuthenticated<MuscleGroupsResponse>(
      personalRecords.tokens,
      '/progress/muscle-groups',
    );
    return {
      dashboard: {
        statistics: statistics.data.statistics,
        personalRecords: personalRecords.data.data,
        muscleGroups: muscleGroups.data.data,
      },
      tokens: muscleGroups.tokens,
    };
  }

  async getExerciseProgression(
    tokens: Tokens,
    exerciseId: string,
  ): Promise<{ exercise: { id: string; name: string }; data: ExerciseProgressPoint[]; tokens: Tokens }> {
    const result = await this.authService.requestAuthenticated<ExerciseProgressionResponse>(
      tokens,
      `/progress/exercises/${exerciseId}`,
    );
    return { ...result.data, tokens: result.tokens };
  }
}
