import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ApiError } from '../../lib/api-client';
import type { Tokens } from '../auth/auth.types';
import { ExerciseService, type ExerciseSummary } from '../exercise/exercise.service';
import {
  RoutineService,
  type RoutineDetail,
  type RoutineExercise,
  type RoutineExerciseInput,
} from './routine.service';

interface RoutineEditorProps {
  exerciseService: ExerciseService;
  routineId: string;
  routineService: RoutineService;
  tokens: Tokens;
  onBack: () => void;
  onTokensChange: (tokens: Tokens) => void;
}

function parseNumber(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

interface RoutineExerciseEditorProps {
  exercise: RoutineExercise;
  onSave: (input: RoutineExerciseInput) => Promise<void>;
}

function RoutineExerciseEditor({ exercise, onSave }: RoutineExerciseEditorProps): React.JSX.Element {
  const [targetSets, setTargetSets] = useState(exercise.targetSets?.toString() ?? '');
  const [repetitionsMin, setRepetitionsMin] = useState(exercise.targetRepetitionsMin?.toString() ?? '');
  const [repetitionsMax, setRepetitionsMax] = useState(exercise.targetRepetitionsMax?.toString() ?? '');
  const [targetWeight, setTargetWeight] = useState(exercise.targetWeight?.toString() ?? '');
  const [restSeconds, setRestSeconds] = useState(exercise.restSeconds?.toString() ?? '');
  const [notes, setNotes] = useState(exercise.notes ?? '');
  const [isSaving, setIsSaving] = useState(false);

  const save = async () => {
    setIsSaving(true);
    try {
      await onSave({
        ...(parseNumber(targetSets) !== undefined ? { targetSets: parseNumber(targetSets) } : {}),
        ...(parseNumber(repetitionsMin) !== undefined ? { targetRepetitionsMin: parseNumber(repetitionsMin) } : {}),
        ...(parseNumber(repetitionsMax) !== undefined ? { targetRepetitionsMax: parseNumber(repetitionsMax) } : {}),
        ...(parseNumber(targetWeight) !== undefined ? { targetWeight: parseNumber(targetWeight) } : {}),
        ...(parseNumber(restSeconds) !== undefined ? { restSeconds: parseNumber(restSeconds) } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.routineExercise}>
      <Text style={styles.exerciseName}>{exercise.position}. {exercise.exercise.name}</Text>
      <TextInput keyboardType="number-pad" onChangeText={setTargetSets} placeholder="Series objetivo" style={styles.input} value={targetSets} />
      <TextInput keyboardType="number-pad" onChangeText={setRepetitionsMin} placeholder="Repeticiones mínimas" style={styles.input} value={repetitionsMin} />
      <TextInput keyboardType="number-pad" onChangeText={setRepetitionsMax} placeholder="Repeticiones máximas" style={styles.input} value={repetitionsMax} />
      <TextInput keyboardType="decimal-pad" onChangeText={setTargetWeight} placeholder="Peso objetivo" style={styles.input} value={targetWeight} />
      <TextInput keyboardType="number-pad" onChangeText={setRestSeconds} placeholder="Descanso en segundos" style={styles.input} value={restSeconds} />
      <TextInput multiline onChangeText={setNotes} placeholder="Notas" style={styles.input} value={notes} />
      <Pressable disabled={isSaving} onPress={() => { void save(); }} style={styles.saveButton}>
        <Text style={styles.saveButtonText}>{isSaving ? 'Guardando...' : 'Guardar configuración'}</Text>
      </Pressable>
    </View>
  );
}

export function RoutineEditor({
  exerciseService,
  routineId,
  routineService,
  tokens,
  onBack,
  onTokensChange,
}: RoutineEditorProps): React.JSX.Element {
  const [routine, setRoutine] = useState<RoutineDetail | null>(null);
  const [exercises, setExercises] = useState<ExerciseSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRoutine = async () => {
      try {
        const routineResult = await routineService.getDetail(tokens, routineId);
        const exerciseResult = await exerciseService.list(routineResult.tokens, {});
        setRoutine(routineResult.routine);
        setExercises(exerciseResult.exercises);
        if (exerciseResult.tokens.accessToken !== tokens.accessToken) {
          onTokensChange(exerciseResult.tokens);
        }
      } catch (requestError) {
        setError(requestError instanceof ApiError ? requestError.message : 'No fue posible cargar la rutina.');
      }
    };
    void loadRoutine();
  }, [exerciseService, onTokensChange, routineId, routineService, tokens]);

  const addExercise = async (exerciseId: string) => {
    if (!routine) {
      return;
    }
    try {
      const result = await routineService.addExercise(tokens, routine.id, exerciseId);
      setRoutine((currentRoutine) => currentRoutine && {
        ...currentRoutine,
        exercises: [...currentRoutine.exercises, result.routineExercise],
      });
      if (result.tokens.accessToken !== tokens.accessToken) {
        onTokensChange(result.tokens);
      }
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'No fue posible añadir el ejercicio.');
    }
  };

  const saveExercise = async (routineExerciseId: string, input: RoutineExerciseInput) => {
    if (!routine) {
      return;
    }
    try {
      const result = await routineService.updateExercise(tokens, routine.id, routineExerciseId, input);
      setRoutine((currentRoutine) => currentRoutine && {
        ...currentRoutine,
        exercises: currentRoutine.exercises.map((exercise) => (
          exercise.id === routineExerciseId ? result.routineExercise : exercise
        )),
      });
      if (result.tokens.accessToken !== tokens.accessToken) {
        onTokensChange(result.tokens);
      }
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'No fue posible guardar la configuración.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>Volver a rutinas</Text>
      </Pressable>
      {!routine && !error && <ActivityIndicator />}
      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {routine && (
        <>
          <Text style={styles.title}>{routine.name}</Text>
          <Text style={styles.subtitle}>Añadir ejercicio</Text>
          {exercises.map((exercise) => (
            <Pressable key={exercise.id} onPress={() => { void addExercise(exercise.id); }} style={styles.libraryExercise}>
              <Text style={styles.exerciseName}>{exercise.name}</Text>
              <Text>{exercise.targetMuscleGroups.join(', ')}</Text>
            </Pressable>
          ))}
          <Text style={styles.subtitle}>Configuración</Text>
          {routine.exercises.map((exercise) => (
            <RoutineExerciseEditor
              exercise={exercise}
              key={exercise.id}
              onSave={(input) => saveExercise(exercise.id, input)}
            />
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#374151',
    borderRadius: 6,
    padding: 10,
  },
  backButtonText: {
    color: '#ffffff',
  },
  container: {
    gap: 12,
    padding: 24,
  },
  error: {
    color: '#b91c1c',
  },
  exerciseName: {
    fontSize: 17,
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#9ca3af',
    borderRadius: 6,
    borderWidth: 1,
    padding: 10,
  },
  libraryExercise: {
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    gap: 4,
    padding: 12,
  },
  routineExercise: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    gap: 8,
    padding: 16,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: '#1d4ed8',
    borderRadius: 6,
    padding: 10,
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
  },
});
