export interface MuscleCategoryGroup {
  category: 'Upper body' | 'Lower body' | 'Otros';
  items: string[];
}

export const MUSCLE_GROUP_CATEGORIES: MuscleCategoryGroup[] = [
  {
    category: 'Upper body',
    items: [
      'Abdominales',
      'Biceps',
      'Pecho',
      'Antebrazo',
      'Dorsal',
      'Espalda baja',
      'Hombros',
      'Trapecio',
      'Triceps',
      'Espalda alta',
    ],
  },
  {
    category: 'Lower body',
    items: [
      'Abductor',
      'Adductor',
      'Pantorrillas',
      'Gluteos',
      'Femoral',
      'Cuadriceps',
    ],
  },
  {
    category: 'Otros',
    items: [
      'Cardio',
      'Full body',
      'Otros',
    ],
  },
];

export const ALL_MUSCLE_GROUPS: string[] = MUSCLE_GROUP_CATEGORIES.flatMap((group) => group.items);

export const EQUIPMENT_OPTIONS: string[] = [
  'Ninguno',
  'Barra',
  'Mancuernas',
  'Kettlebell',
  'Maquinas',
  'Discos',
  'Bandas de resistencia',
  'Otros',
];
