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
  exercises: RoutineExerciseResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface RoutineSummary {
  id: string;
  name: string;
  exerciseCount: number;
  createdAt: string;
  updatedAt: string;
}
