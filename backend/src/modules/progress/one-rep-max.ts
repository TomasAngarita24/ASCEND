export function estimateOneRepMax(weight: number, repetitions: number): number {
  return weight * (1 + repetitions / 30);
}
