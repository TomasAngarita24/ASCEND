import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { ApiError } from '../../lib/api-client';
import type { Tokens } from '../auth/auth.types';
import { ExerciseService, type ExerciseSummary } from '../exercise/exercise.service';

interface WorkoutExercisePickerProps {
  exerciseService: ExerciseService;
  tokens: Tokens;
  onAdd: (exerciseId: string) => Promise<void>;
  onBack: () => void;
  onTokensChange: (tokens: Tokens) => void;
}

export function WorkoutExercisePicker({
  exerciseService,
  tokens,
  onAdd,
  onBack,
  onTokensChange,
}: WorkoutExercisePickerProps): React.JSX.Element {
  const [exercises, setExercises] = useState<ExerciseSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addingExerciseId, setAddingExerciseId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    exerciseService.list(tokens, {})
      .then((result) => {
        setExercises(result.exercises);
        if (result.tokens.accessToken !== tokens.accessToken) {
          onTokensChange(result.tokens);
        }
      })
      .catch((requestError) => {
        setError(requestError instanceof ApiError ? requestError.message : 'No fue posible cargar los ejercicios.');
      })
      .finally(() => setIsLoading(false));
  }, [exerciseService, onTokensChange, tokens]);

  const addExercise = async (exerciseId: string) => {
    setAddingExerciseId(exerciseId);
    setError(null);
    try {
      await onAdd(exerciseId);
      onBack();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'No fue posible añadir el ejercicio.');
    } finally {
      setAddingExerciseId(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>Volver al entrenamiento</Text>
      </Pressable>
      <Text style={styles.title}>Añadir ejercicio</Text>
      {isLoading && <ActivityIndicator />}
      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {exercises.map((exercise) => (
        <Pressable disabled={addingExerciseId !== null} key={exercise.id} onPress={() => { void addExercise(exercise.id); }} style={styles.exercise}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          <Text>{addingExerciseId === exercise.id ? 'Añadiendo...' : exercise.targetMuscleGroups.join(', ')}</Text>
        </Pressable>
      ))}
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
  exercise: {
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    gap: 4,
    padding: 16,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '700',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
  },
});
