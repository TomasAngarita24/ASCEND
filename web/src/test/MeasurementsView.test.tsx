import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import { api, type BodyMeasurement } from '../api/api';
import { MeasurementsView } from '../views/MeasurementsView';

function measurement(overrides: Partial<BodyMeasurement> = {}): BodyMeasurement {
  return {
    id: 'm1',
    date: '2026-06-15T00:00:00.000Z',
    weight: null,
    height: null,
    neck: null,
    shoulders: null,
    chest: null,
    waist: null,
    hips: null,
    bicep: null,
    thigh: null,
    calf: null,
    bodyFat: null,
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('MeasurementsView BMI card', () => {
  it('computes and classifies IMC from the latest weight and height', async () => {
    vi.spyOn(api, 'listMeasurements').mockResolvedValue([
      measurement({ weight: 82.5, height: 180 }),
    ]);

    render(<MeasurementsView />);

    await waitFor(() => {
      expect(screen.getByText('Índice de masa corporal')).toBeInTheDocument();
    });

    // 82.5 / 1.8² = 25.46 → "25,5" and "Sobrepeso"
    expect(screen.getByText('25,5')).toBeInTheDocument();
    expect(screen.getByText('Sobrepeso')).toBeInTheDocument();
    expect(screen.getByText('Peso saludable')).toBeInTheDocument();
    // 18.5 * 1.8² = 59.9 ; 24.9 * 1.8² = 80.7
    expect(screen.getByText('59.9 – 80.7 kg')).toBeInTheDocument();
    expect(screen.getByText('82.5 kg · 180 cm')).toBeInTheDocument();
  });

  it('reuses the most recent known height when the latest entry omits it', async () => {
    vi.spyOn(api, 'listMeasurements').mockResolvedValue([
      measurement({ id: 'old', date: '2026-06-01T00:00:00.000Z', weight: 82, height: 180 }),
      measurement({ id: 'new', date: '2026-06-15T00:00:00.000Z', weight: 80, height: null }),
    ]);

    render(<MeasurementsView />);

    await waitFor(() => {
      expect(screen.getByText('80 kg · 180 cm')).toBeInTheDocument();
    });
    // 80 / 1.8² = 24.69 → "24,7" normal
    expect(screen.getByText('24,7')).toBeInTheDocument();
    expect(screen.getByText('Peso normal')).toBeInTheDocument();
  });

  it('prompts to register height when only weight is known', async () => {
    vi.spyOn(api, 'listMeasurements').mockResolvedValue([
      measurement({ weight: 80 }),
    ]);

    render(<MeasurementsView />);

    await waitFor(() => {
      expect(screen.getByText('Registra tu altura para calcular tu IMC.')).toBeInTheDocument();
    });
  });

  it('prompts to register weight and height when there is no data', async () => {
    vi.spyOn(api, 'listMeasurements').mockResolvedValue([]);

    render(<MeasurementsView />);

    await waitFor(() => {
      expect(screen.getByText('Registra tu peso y tu altura para calcular tu IMC.')).toBeInTheDocument();
    });
  });
});
