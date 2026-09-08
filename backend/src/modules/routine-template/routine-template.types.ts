export interface RoutineTemplateSummary {
  id: string;
  slug: string;
  name: string;
  description: string;
  level: string;
  goal: string;
  equipment: string;
  exerciseCount: number;
}

export interface RoutineTemplateExerciseResponse {
  id: string;
  position: number;
  targetSets: number | null;
  targetRepetitionsMin: number | null;
  targetRepetitionsMax: number | null;
  restSeconds: number | null;
  exercise: { id: string; name: string };
}

export interface RoutineTemplateDetail extends RoutineTemplateSummary {
  exercises: RoutineTemplateExerciseResponse[];
}