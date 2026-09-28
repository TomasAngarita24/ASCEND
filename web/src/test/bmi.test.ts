import { describe, expect, it } from 'vitest';

import {
  BMI_SCALE_MAX,
  BMI_SCALE_MIN,
  bmiScalePosition,
  calculateBmi,
  classifyBmi,
  formatBmi,
  healthyWeightRange,
} from '../utils/bmi';

describe('calculateBmi', () => {
  it('computes IMC from weight in kg and height in cm', () => {
    const result = calculateBmi(82.5, 180);
    expect(result).not.toBeNull();
    // 82.5 / 1.8² = 25.46
    expect(result?.bmi).toBeCloseTo(25.46, 2);
    expect(result?.classification.category).toBe('overweight');
  });

  it('classifies across WHO bands', () => {
    expect(calculateBmi(50, 180)?.classification.category).toBe('underweight');
    expect(calculateBmi(70, 180)?.classification.category).toBe('normal');
    expect(calculateBmi(82.5, 180)?.classification.category).toBe('overweight');
    expect(calculateBmi(97.2, 180)?.classification.category).toBe('obesityI');
    expect(calculateBmi(113.4, 180)?.classification.category).toBe('obesityII');
    expect(calculateBmi(140, 180)?.classification.category).toBe('obesityIII');
  });

  it('handles the exact band boundaries as WHO defines them', () => {
    // 18.5 is the lower bound of "normal", 25 starts "overweight", 30 starts obesity I.
    expect(classifyBmi(18.4999).category).toBe('underweight');
    expect(classifyBmi(18.5).category).toBe('normal');
    expect(classifyBmi(24.9999).category).toBe('normal');
    expect(classifyBmi(25).category).toBe('overweight');
    expect(classifyBmi(29.9999).category).toBe('overweight');
    expect(classifyBmi(30).category).toBe('obesityI');
    expect(classifyBmi(35).category).toBe('obesityII');
    expect(classifyBmi(40).category).toBe('obesityIII');
  });

  it('returns null when weight or height is missing or unusable', () => {
    expect(calculateBmi(null, 180)).toBeNull();
    expect(calculateBmi(80, null)).toBeNull();
    expect(calculateBmi(undefined, undefined)).toBeNull();
    expect(calculateBmi(0, 180)).toBeNull();
    expect(calculateBmi(80, 0)).toBeNull();
    expect(calculateBmi(-5, 180)).toBeNull();
    expect(calculateBmi(80, -180)).toBeNull();
    expect(calculateBmi(Number.NaN, 180)).toBeNull();
    expect(calculateBmi(Number.POSITIVE_INFINITY, 180)).toBeNull();
  });

  it('exposes the healthy weight range for the given height', () => {
    const result = calculateBmi(82.5, 180);
    // 18.5 * 1.8² = 59.94 → 59.9 ; 24.9 * 1.8² = 80.68 → 80.7
    expect(result?.healthyWeightRange.min).toBe(59.9);
    expect(result?.healthyWeightRange.max).toBe(80.7);
    expect(healthyWeightRange(180).min).toBeLessThan(healthyWeightRange(180).max);
  });
});

describe('bmiScalePosition', () => {
  it('maps the scale bounds to 0 and 1', () => {
    expect(bmiScalePosition(BMI_SCALE_MIN)).toBe(0);
    expect(bmiScalePosition(BMI_SCALE_MAX)).toBe(1);
  });

  it('clamps values outside the visual scale', () => {
    expect(bmiScalePosition(5)).toBe(0);
    expect(bmiScalePosition(60)).toBe(1);
  });

  it('is monotonic for in-range values', () => {
    expect(bmiScalePosition(20)).toBeLessThan(bmiScalePosition(25));
    expect(bmiScalePosition(25)).toBeLessThan(bmiScalePosition(35));
  });
});

describe('formatBmi', () => {
  it('formats with one decimal and a comma', () => {
    expect(formatBmi(25.46)).toBe('25,5');
    expect(formatBmi(18.5)).toBe('18,5');
  });
});
