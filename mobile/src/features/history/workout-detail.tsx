import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, typography, spacing } from '../../theme';
import AnimatedPressable from '../../components/AnimatedPressable';

import { ApiError } from '../../lib/api-client';
import type { Tokens } from '../auth/auth.types';
import { HistoryService, type WorkoutDetail } from './history.service';

interface WorkoutDetailScreenProps {
  historyService: HistoryService;
  tokens: Tokens;
  workoutId: string;
  onBack: () => void;
  onTokensChange: (tokens: Tokens) => void;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

function ExerciseDetail({ exercise }: { exercise: WorkoutDetail['exercises'][number] }): React.JSX.Element {
  return (
    <View style={styles.exercise}>
      <Text style={styles.exerciseName}>{exercise.position}. {exercise.exercise.name}</Text>
      {exercise.sets.length === 0 && <Text>Sin series registradas.</Text>}
      {exercise.sets.map((set) => (
        <View key={set.id} style={styles.set}>
          <Text>Serie {set.setNumber}: {set.weight ?? 0} kg × {set.repetitions ?? 0}</Text>
          <Text>RPE {set.rpe ?? '—'} · {set.setType} · {set.isCompleted ? 'Completada' : 'Pendiente'}</Text>
        </View>
      ))}
    </View>
  );
}

export function WorkoutDetailScreen({
  historyService,
  tokens,
  workoutId,
  onBack,
  onTokensChange,
}: WorkoutDetailScreenProps): React.JSX.Element {
  const [workout, setWorkout] = useState<WorkoutDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    historyService.getDetail(tokens, workoutId)
      .then((result) => {
        setWorkout(result.workout);
        if (result.tokens.accessToken !== tokens.accessToken) {
          onTokensChange(result.tokens);
        }
      })
      .catch((requestError) => {
        setError(requestError instanceof ApiError ? requestError.message : 'No fue posible cargar el entrenamiento.');
      });
  }, [historyService, onTokensChange, tokens, workoutId]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <AnimatedPressable accessibilityRole="button" onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>Volver al historial</Text>
      </AnimatedPressable>
      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {!workout && !error && <ActivityIndicator color={colors.accent} />}
      {workout && (
        <>
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>DETALLE</Text>
            <Text style={styles.title}>Entrenamiento {workout.status}</Text>
            <Text style={styles.meta}>{formatDate(workout.startedAt)}</Text>
            {workout.completedAt && <Text style={styles.meta}>Finalizado: {formatDate(workout.completedAt)}</Text>}
          </View>
          {workout.exercises.map((exercise) => <ExerciseDetail exercise={exercise} key={exercise.id} />)}
        </>
      )}
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
    color: colors.danger,
  },
  exercise: {
    backgroundColor: colors.surface,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    borderWidth: 1,
    gap: spacing(1),
    padding: spacing(2),
  },
  exerciseName: {
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: '700',
  },
  eyebrow: {
    color: colors.accentAlt,
    fontSize: typography.caption,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  hero: {
    gap: spacing(0.5),
  },
  meta: {
    color: colors.muted,
  },
  set: {
    backgroundColor: '#111827',
    borderRadius: 10,
    gap: spacing(0.5),
    padding: spacing(1.25),
  },
  title: {
    color: colors.text,
    fontSize: typography.h2,
    fontWeight: '700',
  },
});
