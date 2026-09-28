const CANONICAL_MUSCLES: Record<string, string> = {
  // Pecho
  'pecho': 'Pecho',
  'chest': 'Pecho',
  'pectoral': 'Pecho',
  'pectorales': 'Pecho',

  // Espalda / Dorsal
  'dorsal': 'Dorsal',
  'dorsales': 'Dorsal',
  'espalda': 'Dorsal',
  'back': 'Dorsal',
  'upper-back': 'Dorsal',
  'upper back': 'Dorsal',
  'lats': 'Dorsal',
  'latissimus': 'Dorsal',
  'espalda alta': 'Dorsal',
  'espalda media': 'Dorsal',

  // Espalda baja
  'espalda baja': 'Espalda baja',
  'lower-back': 'Espalda baja',
  'lower back': 'Espalda baja',
  'lumbar': 'Espalda baja',
  'lumbares': 'Espalda baja',

  // Hombros
  'hombro': 'Hombros',
  'hombros': 'Hombros',
  'deltoides': 'Hombros',
  'deltoid': 'Hombros',
  'deltoids': 'Hombros',
  'shoulder': 'Hombros',
  'shoulders': 'Hombros',

  // Trapecio
  'trapecio': 'Trapecio',
  'trapecios': 'Trapecio',
  'trapezius': 'Trapecio',
  'traps': 'Trapecio',

  // Brazos
  'biceps': 'Biceps',
  'bíceps': 'Biceps',
  'triceps': 'Triceps',
  'tríceps': 'Triceps',
  'antebrazo': 'Antebrazo',
  'antebrazos': 'Antebrazo',
  'forearm': 'Antebrazo',
  'forearms': 'Antebrazo',

  // Piernas
  'cuadriceps': 'Cuadriceps',
  'cuádriceps': 'Cuadriceps',
  'quadriceps': 'Cuadriceps',
  'quads': 'Cuadriceps',
  'quad': 'Cuadriceps',

  'femoral': 'Femoral',
  'femorales': 'Femoral',
  'hamstring': 'Femoral',
  'hamstrings': 'Femoral',
  'isquiotibiales': 'Femoral',
  'isquios': 'Femoral',

  'gluteo': 'Gluteos',
  'gluteos': 'Gluteos',
  'glúteo': 'Gluteos',
  'glúteos': 'Gluteos',
  'gluteal': 'Gluteos',
  'glutes': 'Gluteos',

  'pantorrilla': 'Pantorrillas',
  'pantorrillas': 'Pantorrillas',
  'gemelos': 'Pantorrillas',
  'calves': 'Pantorrillas',
  'calf': 'Pantorrillas',

  'adductor': 'Adductor',
  'adductores': 'Adductor',
  'adductors': 'Adductor',
  'aductor': 'Adductor',
  'aductores': 'Adductor',

  // Core
  'abdominales': 'Abdominales',
  'abdominal': 'Abdominales',
  'abdomen': 'Abdominales',
  'abs': 'Abdominales',
  'core': 'Abdominales',
  'oblicuos': 'Abdominales',
  'obliques': 'Abdominales',

  // Otros
  'cardio': 'Cardio',
  'aerobico': 'Cardio',
  'aeróbico': 'Cardio',
  'full body': 'Full body',
  'cuerpo completo': 'Full body',
  'other': 'Otros',
  'otro': 'Otros',
  'otros': 'Otros',
};

export function normalizeMuscleGroup(raw?: string | null): string {
  if (!raw) return 'Otros';
  const trimmed = raw.trim();
  if (!trimmed) return 'Otros';

  // Direct lookup lowercase
  const lower = trimmed.toLowerCase();
  if (CANONICAL_MUSCLES[lower]) {
    return CANONICAL_MUSCLES[lower];
  }

  // Normalize accents and retry
  const unaccented = lower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (CANONICAL_MUSCLES[unaccented]) {
    return CANONICAL_MUSCLES[unaccented];
  }

  // Capitalize first letter as fallback
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function normalizeMuscleGroups(rawList?: (string | null | undefined)[] | null): string[] {
  if (!rawList || rawList.length === 0) return ['Otros'];
  const normalized = rawList
    .map((m) => normalizeMuscleGroup(m))
    .filter((m) => Boolean(m) && m !== 'Todos');

  const unique = Array.from(new Set(normalized));
  return unique.length > 0 ? unique : ['Otros'];
}
