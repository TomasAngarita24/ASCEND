export interface BodyMeasurementResponse {
  id: string;
  date: string; // YYYY-MM-DD
  weight: number | null;
  neck: number | null;
  shoulders: number | null;
  chest: number | null;
  waist: number | null;
  hips: number | null;
  bicep: number | null;
  thigh: number | null;
  calf: number | null;
  bodyFat: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface SaveMeasurementInput {
  date: string; // YYYY-MM-DD
  weight?: number | null;
  neck?: number | null;
  shoulders?: number | null;
  chest?: number | null;
  waist?: number | null;
  hips?: number | null;
  bicep?: number | null;
  thigh?: number | null;
  calf?: number | null;
  bodyFat?: number | null;
}
