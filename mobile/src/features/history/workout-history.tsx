import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '../../lib/api-client';
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
    <Pressable onPress={onPress} style={styles.workout}>
      <Text style={styles.workoutDate}>{formatDate(workout.startedAt)}</Text>
      <Text>{formatDuration(workout.durationSeconds)} · {workout.exerciseCount} ejercicios</Text>
      <Text>{workout.setsCompleted} series · {workout.totalRepetitions} repeticiones</Text>
      <Text>{workout.totalVolume} kg de volumen</Text>
    </Pressable>
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
      <Text style={styles.title}>Historial</Text>
      <Pressable accessibilityRole="button" onPress={onStartNewWorkout} style={styles.newWorkoutButton}>
        <Text style={styles.newWorkoutText}>Nuevo entrenamiento</Text>
      </Pressable>
      {isLoading && <ActivityIndicator />}
      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {!isLoading && workouts.length === 0 && <Text>Aún no hay entrenamientos completados.</Text>}
      {workouts.map((workout) => (
        <WorkoutHistoryItem key={workout.id} onPress={() => onSelectWorkout(workout.id)} workout={workout} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    padding: 24,
  },
  error: {
    color: '#b91c1c',
  },
  newWorkoutButton: {
    alignItems: 'center',
    backgroundColor: '#1d4ed8',
    borderRadius: 8,
    padding: 12,
  },
  newWorkoutText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
  },
  workout: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    gap: 4,
    padding: 16,
  },
  workoutDate: {
    fontSize: 18,
    fontWeight: '700',
  },
});
