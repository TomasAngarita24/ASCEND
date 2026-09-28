export type BmiCategory = 'underweight' | 'normal' | 'overweight' | 'obesityI' | 'obesityII' | 'obesityIII';

export interface BmiClassification {
  category: BmiCategory;
  label: string;
  min: number;
  max: number | null;
  color: string;
  advice: string;
}

export interface BmiResult {
  bmi: number;
  classification: BmiClassification;
  healthyWeightRange: { min: number; max: number };
}

export const BMI_SCALE_MIN = 14;
export const BMI_SCALE_MAX = 40;

const CLASSIFICATIONS: BmiClassification[] = [
  {
    category: 'underweight',
    label: 'Bajo peso',
    min: 0,
    max: 18.5,
    color: '#5B8DEF',
    advice: 'Podés ganar masa de forma saludable con fuerza y dieta suficiente.',
  },
  {
    category: 'normal',
    label: 'Peso normal',
    min: 18.5,
    max: 25,
    color: 'var(--accent-green)',
    advice: 'Rango saludable. Mantené tu rutina y alimentación actual.',
  },
  {
    category: 'overweight',
    label: 'Sobrepeso',
    min: 25,
    max: 30,
    color: 'var(--accent-gold)',
    advice: 'Zona de alerta: un plan de fuerza y déficit leve ayuda a volver al rango normal.',
  },
  {
    category: 'obesityI',
    label: 'Obesidad grado I',
    min: 30,
    max: 35,
    color: 'var(--danger-color)',
    advice: 'Consultá con un profesional de la salud para un plan sostenido.',
  },
  {
    category: 'obesityII',
    label: 'Obesidad grado II',
    min: 35,
    max: 40,
    color: 'var(--danger-color)',
    advice: 'Recomendable acompanhamento médico para un plan seguro.',  },
  {
    category: 'obesityIII',
    label: 'Obesidad grado III',
    min: 40,
    max: null,
    color: 'var(--danger-color)',
    advice: 'Seguimiento médico prioritario.',
  },
];

function isUsableNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Calcula el IMC (kg/m²) a partir de peso en kg y altura en cm.
 * Devuelve null si los datos son ausentes o no permiten un cálculo válido.
 */
export function calculateBmi(weightKg: number | null | undefined, heightCm: number | null | undefined): BmiResult | null {
  if (!isUsableNumber(weightKg) || !isUsableNumber(heightCm)) return null;
  if (weightKg <= 0 || heightCm <= 0) return null;

  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  if (!Number.isFinite(bmi) || bmi <= 0) return null;

  return {
    bmi,
    classification: classifyBmi(bmi),
    healthyWeightRange: healthyWeightRange(heightCm),
  };
}

export function classifyBmi(bmi: number): BmiClassification {
  const found = CLASSIFICATIONS.find((c) => bmi >= c.min && (c.max === null || bmi < c.max));
  return found ?? CLASSIFICATIONS[CLASSIFICATIONS.length - 1];
}

/** Rango de peso correspondiente a IMC normal (18.5–24.9) para una altura dada en cm. */
export function healthyWeightRange(heightCm: number): { min: number; max: number } {
  const heightM = heightCm / 100;
  const factor = heightM * heightM;
  return {
    min: round1(18.5 * factor),
    max: round1(24.9 * factor),
  };
}

/** Posición 0–1 del IMC dentro de la escala visual (14–40). */
export function bmiScalePosition(bmi: number): number {
  const clamped = Math.min(Math.max(bmi, BMI_SCALE_MIN), BMI_SCALE_MAX);
  return (clamped - BMI_SCALE_MIN) / (BMI_SCALE_MAX - BMI_SCALE_MIN);
}

export function formatBmi(bmi: number): string {
  return bmi.toFixed(1).replace('.', ',');
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
