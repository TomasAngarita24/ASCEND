export interface RoutineExerciseResponse {
  id: string;
  position: number;
  targetSets: number | null;
  targetRepetitionsMin: number | null;
  targetRepetitionsMax: number | null;
  targetWeight: number | null;
  restSeconds: number | null;
  notes: string | null;
  exercise: {
    id: string;
    name: string;
  };
}

export interface RoutineResponse {
  id: string;
  name: string;
  folderId?: string | null;
  isPublic: boolean;
  exercises: RoutineExerciseResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface RoutineMuscleSet {
  muscleGroup: string;
  sets: number;
}

export interface RoutineSummary {
  id: string;
  name: string;
  folderId?: string | null;
  isPublic: boolean;
  exerciseCount: number;
  totalSets: number;
  muscleSets: RoutineMuscleSet[];
  createdAt: string;
  updatedAt: string;
}

export interface RoutineFolderResponse {
  id: string;
  name: string;
  routineIds: string[];
  createdAt: string;
  updatedAt: string;
}

