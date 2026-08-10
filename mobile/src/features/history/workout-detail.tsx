import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

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
      <Pressable accessibilityRole="button" onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>Volver al historial</Text>
      </Pressable>
      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {!workout && !error && <ActivityIndicator />}
      {workout && (
        <>
          <Text style={styles.title}>Entrenamiento {workout.status}</Text>
          <Text>{formatDate(workout.startedAt)}</Text>
          {workout.completedAt && <Text>Finalizado: {formatDate(workout.completedAt)}</Text>}
          {workout.exercises.map((exercise) => <ExerciseDetail exercise={exercise} key={exercise.id} />)}
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
  exercise: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    gap: 8,
    padding: 16,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '700',
  },
  set: {
    backgroundColor: '#ffffff',
    borderRadius: 6,
    gap: 4,
    padding: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
});
