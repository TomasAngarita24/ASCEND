import { describe, expect, it } from 'vitest';
import { parseCsvRows, parseCsvToWorkoutRows } from '../utils/csvImporter';

describe('csvImporter', () => {
  describe('parseCsvRows', () => {
    it('parses simple comma-separated CSV', () => {
      const csv = 'Exercise,Weight,Reps\nBench Press,80,10\nSquat,100,8';
      const rows = parseCsvRows(csv);
      expect(rows).toHaveLength(3);
      expect(rows[0]).toEqual(['Exercise', 'Weight', 'Reps']);
      expect(rows[1]).toEqual(['Bench Press', '80', '10']);
      expect(rows[2]).toEqual(['Squat', '100', '8']);
    });

    it('detects and parses semicolon-separated Excel CSV', () => {
      const csv = 'Ejercicio;Peso;Repeticiones\nPress Banca;82,5;10\nSentadilla;100;8';
      const rows = parseCsvRows(csv);
      expect(rows).toHaveLength(3);
      expect(rows[0]).toEqual(['Ejercicio', 'Peso', 'Repeticiones']);
      expect(rows[1]).toEqual(['Press Banca', '82,5', '10']);
    });

    it('handles quoted fields with commas and escaped quotes', () => {
      const csv = 'Exercise,Notes\n"Bench Press, Incline","Felt ""great"" today"';
      const rows = parseCsvRows(csv);
      expect(rows).toHaveLength(2);
      expect(rows[1][0]).toBe('Bench Press, Incline');
      expect(rows[1][1]).toBe('Felt "great" today');
    });

    it('strips UTF-8 BOM', () => {
      const csv = '\uFEFFExercise,Reps\nDeadlift,5';
      const rows = parseCsvRows(csv);
      expect(rows[0][0]).toBe('Exercise');
    });
  });

  describe('parseCsvToWorkoutRows', () => {
    it('parses Notion exported CSV with English headers', () => {
      const notionCsv = `Name,Date,Set,Weight,Reps,RPE,Type,Notes
Bench Press,2024-03-10,1,80,10,8,Normal,Good set
Bench Press,2024-03-10,2,80,10,8.5,Normal,
Squat,2024-03-10,1,100,8,8,Normal,`;

      const result = parseCsvToWorkoutRows(notionCsv);
      expect(result.data).toHaveLength(3);
      expect(result.stats.totalWorkouts).toBe(1);
      expect(result.stats.totalSets).toBe(3);
      expect(result.stats.totalExercises).toBe(2);

      expect(result.data[0]).toMatchObject({
        exercise: 'Bench Press',
        date: '2024-03-10',
        setNumber: 1,
        weight: 80,
        repetitions: 10,
        rpe: 8,
        setType: 'normal',
        notes: 'Good set',
      });
    });

    it('parses Spanish Excel CSV with semicolons and comma decimals', () => {
      const excelCsv = `Fecha;Rutina;Ejercicio;Serie;Peso (kg);Repeticiones;RPE;Tipo de serie;Notas
15/03/2024;Torso;Press de Banca;1;82,5;10;8;Normal;Pesado
15/03/2024;Torso;Press de Banca;2;82,5;8;9;Fallo;
15/03/2024;Torso;Dominadas;1;0;10;8;Calentamiento;Peso corporal`;

      const result = parseCsvToWorkoutRows(excelCsv);
      expect(result.data).toHaveLength(3);
      expect(result.stats.totalWorkouts).toBe(1);

      expect(result.data[0].weight).toBe(82.5);
      expect(result.data[0].repetitions).toBe(10);
      expect(result.data[0].date).toBe('2024-03-15');

      expect(result.data[1].setType).toBe('failure');
      expect(result.data[2].setType).toBe('warmup');
      expect(result.data[2].weight).toBe(0);
    });

    it('handles lbs to kg conversion when column is in lbs', () => {
      const csv = `Exercise,Date,Weight (lbs),Reps
Bench Press,2024-03-10,175,10`;

      const result = parseCsvToWorkoutRows(csv);
      // 175 lbs * 0.45359237 = 79.38 -> 79.4 kg
      expect(result.data[0].weight).toBe(79.4);
    });

    it('auto-increments set number when set column is absent', () => {
      const csv = `Exercise,Date,Weight,Reps
Bench Press,2024-03-10,80,10
Bench Press,2024-03-10,85,8
Bench Press,2024-03-10,90,6`;

      const result = parseCsvToWorkoutRows(csv);
      expect(result.data[0].setNumber).toBe(1);
      expect(result.data[1].setNumber).toBe(2);
      expect(result.data[2].setNumber).toBe(3);
    });

    it('throws descriptive error if exercise column is missing', () => {
      const invalidCsv = 'Date,Weight,Reps\n2024-03-10,80,10';
      expect(() => parseCsvToWorkoutRows(invalidCsv)).toThrow(/No se encontró la columna de ejercicio/);
    });

    it('throws descriptive error if file is empty', () => {
      expect(() => parseCsvToWorkoutRows('')).toThrow(/vacío/);
    });
  });
});
