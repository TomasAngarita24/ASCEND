export interface SetResponse {
  id: string;
  setNumber: number;
  weight: number | null;
  repetitions: number | null;
  rpe: number | null;
  setType: string;
  notes: string | null;
  isCompleted: boolean;
  completedAt: string | null;
}

export interface WorkoutExerciseResponse {
  id: string;
  position: number;
  exercise: { id: string; name: string };
  sets: SetResponse[];
}

export interface WorkoutResponse {
  id: string;
  routineId: string | null;
  status: string;
  startedAt: string;
  completedAt: string | null;
  exercises: WorkoutExerciseResponse[];
}
