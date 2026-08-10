export type PersonalRecordType =
  | 'highest_weight'
  | 'highest_repetitions_at_weight'
  | 'estimated_one_rep_max'
  | 'highest_training_volume';

export interface PersonalRecord {
  type: PersonalRecordType;
  exercise: {
    id: string;
    name: string;
  };
  value: number;
  achievedAt: string;
}

export interface PersonalRecordsResponse {
  data: PersonalRecord[];
}
