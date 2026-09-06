export interface ProgressStatisticsResponse {
  statistics: {
    totalWorkouts: number;
    workoutFrequency: number;
    totalVolume: number;
    totalSets: number;
    totalRepetitions: number;
    personalRecords: number;
  };
}

export interface EstimatedOneRepMaxResponse {
  exercise: {
    id: string;
    name: string;
  };
  estimatedOneRepMax: number | null;
}

export interface ExerciseProgressionResponse {
  exercise: {
    id: string;
    name: string;
  };
  data: Array<{
    date: string;
    weight: number | null;
    repetitions: number;
    volume: number;
    estimatedOneRepMax: number | null;
  }>;
}

export interface ProgressChartResponse {
  metric: 'weight' | 'volume' | 'repetitions' | 'workout_frequency' | 'weekly_volume';
  data: Array<{
    date: string;
    value: number;
  }>;
}

export interface MuscleGroupStatisticsResponse {
  data: Array<{
    muscleGroup: string;
    trainingFrequency: number;
    volume: number;
  }>;
}

export interface WeeklyMuscleSetsResponse {
  data: Array<{
    muscleGroup: string;
    weeklySets: number;
    weeklyVolume: number;
    dailySets: number;
    dailyVolume: number;
    totalSets: number;
    totalVolume: number;
    frequencyThisWeek: number;
  }>;
  totalWeeklySets: number;
  totalDailySets: number;
}


