import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, typography, spacing } from '../../theme';
import AnimatedPressable from '../../components/AnimatedPressable';

import { ApiError } from '../../lib/api-client';
import IconButton from '../../components/IconButton';
import type { Tokens } from '../auth/auth.types';
import { HistoryService, type WorkoutHistoryEntry } from './history.service';

interface WorkoutHistoryProps {
  historyService: HistoryService;
  tokens: Tokens;
  onStartNewWorkout: () => void;
  onSelectWorkout: (workoutId: string) => void;
  onTokensChange: (tokens: Tokens) => void;
}

function formatDuration(durationSeconds: number | null): string {
  if (durationSeconds === null) {
    return 'Sin duración';
  }
  const minutes = Math.floor(durationSeconds / 60);
  return `${minutes} min`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString();
}

function WorkoutHistoryItem({
  workout,
  onPress,
}: {
  workout: WorkoutHistoryEntry;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <AnimatedPressable onPress={onPress} style={styles.workout}>
      <Text style={styles.workoutDate}>{formatDate(workout.startedAt)}</Text>
      <Text>{formatDuration(workout.durationSeconds)} · {workout.exerciseCount} ejercicios</Text>
      <Text>{workout.setsCompleted} series · {workout.totalRepetitions} repeticiones</Text>
      <Text>{workout.totalVolume} kg de volumen</Text>
    </AnimatedPressable>
  );
}

export function WorkoutHistory({
  historyService,
  tokens,
  onStartNewWorkout,
  onSelectWorkout,
  onTokensChange,
}: WorkoutHistoryProps): React.JSX.Element {
  const [workouts, setWorkouts] = useState<WorkoutHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    historyService.list(tokens)
      .then((result) => {
        setWorkouts(result.workouts);
        if (result.tokens.accessToken !== tokens.accessToken) {
          onTokensChange(result.tokens);
        }
      })
      .catch((requestError) => {
        setError(requestError instanceof ApiError ? requestError.message : 'No fue posible cargar el historial.');
      })
      .finally(() => setIsLoading(false));
  }, [historyService, onTokensChange, tokens]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>ASCEND</Text>
          <Text style={styles.title}>Historial</Text>
        </View>
        <IconButton name="add" size={22} onPress={onStartNewWorkout} />
      </View>
      <View style={{ height: 8 }} />
      {isLoading && <ActivityIndicator color="#22c55e" />}
      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {!isLoading && workouts.length === 0 && <Text style={styles.emptyState}>Aún no hay entrenamientos completados.</Text>}
      {workouts.map((workout) => (
        <WorkoutHistoryItem key={workout.id} onPress={() => onSelectWorkout(workout.id)} workout={workout} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    gap: spacing(1.5),
    padding: spacing(2.5),
  },
  emptyState: {
    color: colors.muted,
  },
  error: {
    color: colors.danger,
  },
  eyebrow: {
    color: colors.accentAlt,
    fontSize: typography.caption,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  header: {
    gap: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  newWorkoutButton: {
    alignItems: 'center',
    backgroundColor: colors.accentAlt,
    borderRadius: 16,
    padding: spacing(1.5),
  },
  newWorkoutText: {
    color: colors.text,
    fontWeight: '700',
  },
  title: {
    color: colors.text,
    fontSize: typography.h2,
    fontWeight: '700',
  },
  workout: {
    backgroundColor: colors.surface,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    borderWidth: 1,
    gap: spacing(0.5),
    padding: spacing(2),
  },
  workoutDate: {
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: '700',
  },
});
