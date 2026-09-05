import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AnimatedPressable from '../../components/AnimatedPressable';
import IconButton from '../../components/IconButton';
import { ApiError } from '../../lib/api-client';
import { colors, spacing, typography } from '../../theme';
import type { Tokens } from '../auth/auth.types';
import { HistoryService, type WorkoutHistoryEntry } from './history.service';

interface WorkoutHistoryProps {
  historyService: HistoryService;
  onBack?: () => void;
  onSelectWorkout: (workoutId: string) => void;
  onStartNewWorkout: () => void;
  onTokensChange: (tokens: Tokens) => void;
  tokens: Tokens;
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
  onPress: () => void;
  workout: WorkoutHistoryEntry;
}): React.JSX.Element {
  return (
    <AnimatedPressable onPress={onPress} style={styles.workout}>
      <Text style={styles.workoutDate}>{formatDate(workout.startedAt)}</Text>
      <Text style={styles.workoutMeta}>{formatDuration(workout.durationSeconds)} · {workout.exerciseCount} ejercicios</Text>
      <Text style={styles.workoutMeta}>{workout.setsCompleted} series · {workout.totalRepetitions} repeticiones</Text>
      <Text style={styles.workoutVolume}>{workout.totalVolume} kg de volumen</Text>
    </AnimatedPressable>
  );
}

export function WorkoutHistory({
  historyService,
  onBack,
  onSelectWorkout,
  onStartNewWorkout,
  onTokensChange,
  tokens,
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
    <ScrollView contentContainerStyle={styles.container} style={styles.scroll}>
      {/* Header Bar with Exit/Back Button */}
      <View style={styles.header}>
        {onBack ? (
          <AnimatedPressable onPress={onBack} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </AnimatedPressable>
        ) : (
          <View style={{ width: 24 }} />
        )}
        <Text style={styles.title}>Historial de entrenamientos</Text>
        <IconButton name="add" onPress={onStartNewWorkout} size={22} />
      </View>

      {isLoading && <ActivityIndicator color={colors.accentAlt} style={{ marginVertical: 20 }} />}
      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {!isLoading && workouts.length === 0 && (
        <Text style={styles.emptyState}>Aún no hay entrenamientos completados.</Text>
      )}

      {workouts.map((workout) => (
        <WorkoutHistoryItem key={workout.id} onPress={() => onSelectWorkout(workout.id)} workout={workout} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    padding: spacing(0.5),
  },
  container: {
    gap: spacing(1.5),
    padding: spacing(2.5),
    paddingBottom: spacing(4),
  },
  emptyState: {
    color: colors.muted,
    fontSize: typography.body,
    paddingVertical: spacing(2),
    textAlign: 'center',
  },
  error: {
    color: colors.danger,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing(0.5),
  },
  scroll: {
    backgroundColor: colors.background,
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: typography.h2,
    fontWeight: '700',
  },
  workout: {
    backgroundColor: colors.surface,
    borderColor: 'rgba(255,255,255,0.08)',
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
  workoutMeta: {
    color: colors.muted,
    fontSize: typography.caption,
  },
  workoutVolume: {
    color: colors.accentAlt,
    fontSize: typography.caption,
    fontWeight: '600',
  },
});
