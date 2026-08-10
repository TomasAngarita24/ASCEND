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
