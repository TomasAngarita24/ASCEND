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
