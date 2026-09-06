import { describe, it, expect } from 'vitest';
import { normalizeSearchText, matchesSearch } from '../utils/text';

describe('Text normalization & search utilities', () => {
  it('normalizes accents and converts to lowercase', () => {
    expect(normalizeSearchText('Elevación')).toBe('elevacion');
    expect(normalizeSearchText('Extensión Tríceps')).toBe('extension triceps');
    expect(normalizeSearchText('GLÚTEOS')).toBe('gluteos');
    expect(normalizeSearchText('Press Militar')).toBe('press militar');
  });

  it('matches searches without accent restrictions', () => {
    expect(matchesSearch('Elevación Lateral con Mancuerna', 'elevacion')).toBe(true);
    expect(matchesSearch('Extensión de Tríceps en Polea', 'extension')).toBe(true);
    expect(matchesSearch('Sentadilla Búlgara', 'bulgara')).toBe(true);
    expect(matchesSearch('Press de Banca Plano', 'banca')).toBe(true);
  });

  it('rejects queries that do not match', () => {
    expect(matchesSearch('Curl de Bíceps', 'triceps')).toBe(false);
  });
});
