export interface ExerciseResponse {
  id: string;
  name: string;
  description?: string | null;
  targetMuscleGroups: string[];
  equipment?: string | null;
  instructions?: string | null;
  mediaUrl?: string | null;
  isCustom: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExerciseListResponse {
  data: ExerciseResponse[];
  pagination: {
    limit: number;
    page: number;
    total: number;
  };
}

export interface PreviousPerformanceResponse {
  previousWorkout: {
    id: string;
    completedAt: string;
    sets: Array<{
      setNumber: number;
      weight: number | null;
      repetitions: number | null;
      rpe: number | null;
      setType: string;
    }>;
  } | null;
}
