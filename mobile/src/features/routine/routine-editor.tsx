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
  canMoveDown: boolean;
  canMoveUp: boolean;
  onDelete: () => Promise<void>;
  onMoveDown: () => Promise<void>;
  onMoveUp: () => Promise<void>;
  onSave: (input: RoutineExerciseInput) => Promise<void>;
}

function RoutineExerciseEditor({
  exercise,
  canMoveDown,
  canMoveUp,
  onDelete,
  onMoveDown,
  onMoveUp,
  onSave,
}: RoutineExerciseEditorProps): React.JSX.Element {
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

  const runAction = async (action: () => Promise<void>) => {
    setIsSaving(true);
    try {
      await action();
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
      <View style={styles.exerciseActions}>
        <Pressable disabled={isSaving || !canMoveUp} onPress={() => { void runAction(onMoveUp); }} style={styles.actionButton}>
          <Text>Subir</Text>
        </Pressable>
        <Pressable disabled={isSaving || !canMoveDown} onPress={() => { void runAction(onMoveDown); }} style={styles.actionButton}>
          <Text>Bajar</Text>
        </Pressable>
        <Pressable disabled={isSaving} onPress={() => { void runAction(onDelete); }} style={styles.deleteButton}>
          <Text style={styles.deleteButtonText}>Eliminar</Text>
        </Pressable>
      </View>
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
  const [routineName, setRoutineName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSavingRoutine, setIsSavingRoutine] = useState(false);

  useEffect(() => {
    const loadRoutine = async () => {
      try {
        const routineResult = await routineService.getDetail(tokens, routineId);
        const exerciseResult = await exerciseService.list(routineResult.tokens, {});
        setRoutine(routineResult.routine);
        setRoutineName(routineResult.routine.name);
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

  const updateRoutineName = async () => {
    if (!routine || !routineName.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    setIsSavingRoutine(true);
    try {
      const result = await routineService.update(tokens, routine.id, routineName.trim());
      setRoutine(result.routine);
      setRoutineName(result.routine.name);
      if (result.tokens.accessToken !== tokens.accessToken) {
        onTokensChange(result.tokens);
      }
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'No fue posible renombrar la rutina.');
    } finally {
      setIsSavingRoutine(false);
    }
  };

  const duplicateRoutine = async () => {
    if (!routine) {
      return;
    }
    setIsSavingRoutine(true);
    try {
      const result = await routineService.duplicate(tokens, routine.id);
      if (result.tokens.accessToken !== tokens.accessToken) {
        onTokensChange(result.tokens);
      }
      onBack();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'No fue posible duplicar la rutina.');
    } finally {
      setIsSavingRoutine(false);
    }
  };

  const deleteRoutine = async () => {
    if (!routine) {
      return;
    }
    setIsSavingRoutine(true);
    try {
      const result = await routineService.delete(tokens, routine.id);
      if (result.tokens.accessToken !== tokens.accessToken) {
        onTokensChange(result.tokens);
      }
      onBack();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'No fue posible eliminar la rutina.');
    } finally {
      setIsSavingRoutine(false);
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

  const deleteExercise = async (routineExerciseId: string) => {
    if (!routine) {
      return;
    }
    try {
      const result = await routineService.deleteExercise(tokens, routine.id, routineExerciseId);
      setRoutine((currentRoutine) => currentRoutine && {
        ...currentRoutine,
        exercises: currentRoutine.exercises
          .filter((exercise) => exercise.id !== routineExerciseId)
          .map((exercise, index) => ({ ...exercise, position: index + 1 })),
      });
      if (result.tokens.accessToken !== tokens.accessToken) {
        onTokensChange(result.tokens);
      }
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'No fue posible eliminar el ejercicio.');
    }
  };

  const moveExercise = async (routineExerciseId: string, direction: -1 | 1) => {
    if (!routine) {
      return;
    }
    const currentIndex = routine.exercises.findIndex((exercise) => exercise.id === routineExerciseId);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= routine.exercises.length) {
      return;
    }
    const reorderedExercises = [...routine.exercises];
    [reorderedExercises[currentIndex], reorderedExercises[targetIndex]] = [
      reorderedExercises[targetIndex],
      reorderedExercises[currentIndex],
    ];
    try {
      const result = await routineService.reorderExercises(
        tokens,
        routine.id,
        reorderedExercises.map((exercise) => exercise.id),
      );
      setRoutine(result.routine);
      if (result.tokens.accessToken !== tokens.accessToken) {
        onTokensChange(result.tokens);
      }
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'No fue posible reordenar los ejercicios.');
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
          <Text style={styles.title}>Editar rutina</Text>
          <TextInput onChangeText={setRoutineName} placeholder="Nombre de rutina" style={styles.input} value={routineName} />
          <View style={styles.routineActions}>
            <Pressable disabled={isSavingRoutine} onPress={() => { void updateRoutineName(); }} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>Renombrar</Text>
            </Pressable>
            <Pressable disabled={isSavingRoutine} onPress={() => { void duplicateRoutine(); }} style={styles.actionButton}>
              <Text>Duplicar</Text>
            </Pressable>
            <Pressable disabled={isSavingRoutine} onPress={() => { void deleteRoutine(); }} style={styles.deleteButton}>
              <Text style={styles.deleteButtonText}>Eliminar rutina</Text>
            </Pressable>
          </View>
          <Text style={styles.subtitle}>Añadir ejercicio</Text>
          {exercises.map((exercise) => (
            <Pressable key={exercise.id} onPress={() => { void addExercise(exercise.id); }} style={styles.libraryExercise}>
              <Text style={styles.exerciseName}>{exercise.name}</Text>
              <Text>{exercise.targetMuscleGroups.join(', ')}</Text>
            </Pressable>
          ))}
          <Text style={styles.subtitle}>Configuración</Text>
          {routine.exercises.map((exercise, index) => (
            <RoutineExerciseEditor
              canMoveDown={index < routine.exercises.length - 1}
              canMoveUp={index > 0}
              exercise={exercise}
              key={exercise.id}
              onDelete={() => deleteExercise(exercise.id)}
              onMoveDown={() => moveExercise(exercise.id, 1)}
              onMoveUp={() => moveExercise(exercise.id, -1)}
              onSave={(input) => saveExercise(exercise.id, input)}
            />
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    backgroundColor: '#d1d5db',
    borderRadius: 6,
    padding: 10,
  },
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
  deleteButton: {
    backgroundColor: '#b91c1c',
    borderRadius: 6,
    padding: 10,
  },
  deleteButtonText: {
    color: '#ffffff',
  },
  exerciseName: {
    fontSize: 17,
    fontWeight: '700',
  },
  exerciseActions: {
    flexDirection: 'row',
    gap: 8,
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
  routineActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
