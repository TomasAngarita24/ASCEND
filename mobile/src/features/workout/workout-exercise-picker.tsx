import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text } from 'react-native';
import { colors, typography, spacing } from '../../theme';
import AnimatedPressable from '../../components/AnimatedPressable';

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
      <AnimatedPressable onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>Volver al entrenamiento</Text>
      </AnimatedPressable>
      <Text style={styles.title}>Añadir ejercicio</Text>
      {isLoading && <ActivityIndicator color={colors.accent} />}
      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {exercises.map((exercise) => (
        <AnimatedPressable disabled={addingExerciseId !== null} key={exercise.id} onPress={() => { void addExercise(exercise.id); }} style={styles.exercise}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          <Text style={styles.helper}>{addingExerciseId === exercise.id ? 'Añadiendo...' : exercise.targetMuscleGroups.join(', ')}</Text>
        </AnimatedPressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 999,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1),
  },
  backButtonText: {
    color: colors.text,
  },
  container: {
    backgroundColor: colors.background,
    gap: spacing(1.5),
    padding: spacing(2.5),
  },
  error: {
    color: '#ff7b7b',
  },
  exercise: {
    backgroundColor: colors.surface,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    borderWidth: 1,
    gap: spacing(0.5),
    padding: spacing(2),
  },
  exerciseName: {
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: '700',
  },
  helper: {
    color: colors.muted,
  },
  title: {
    color: colors.text,
    fontSize: typography.h2,
    fontWeight: '700',
  },
});
