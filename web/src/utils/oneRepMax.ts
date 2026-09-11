export function estimateOneRepMax(weight: number, repetitions: number): number {
  return weight * (1 + repetitions / 30);
}

export function roundOneRepMax(weight: number, repetitions: number): number {
  return Math.round(estimateOneRepMax(weight, repetitions) * 10) / 10;
}