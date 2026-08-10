import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '../../lib/api-client';
import type { Tokens } from '../auth/auth.types';
import { ExerciseService, type ExerciseSummary } from '../exercise/exercise.service';
import {
  ProgressService,
  type ExerciseProgressPoint,
} from './progress.service';

type Metric = 'weight' | 'volume' | 'repetitions' | 'estimatedOneRepMax';

interface ExerciseProgressionProps {
  exerciseService: ExerciseService;
  progressService: ProgressService;
  tokens: Tokens;
  onBack: () => void;
  onTokensChange: (tokens: Tokens) => void;
}

function metricLabel(metric: Metric): string {
  const labels: Record<Metric, string> = {
    weight: 'Peso',
    volume: 'Volumen',
    repetitions: 'Repeticiones',
    estimatedOneRepMax: '1RM estimado',
  };
  return labels[metric];
}

function MetricChart({ data, metric }: { data: ExerciseProgressPoint[]; metric: Metric }): React.JSX.Element {
  const values = data.map((point) => point[metric] ?? 0);
  const maximum = Math.max(...values, 1);

  return (
    <View style={styles.chart}>
      {data.map((point) => {
        const value = point[metric] ?? 0;
        return (
          <View key={point.date} style={styles.chartRow}>
            <Text style={styles.chartDate}>{point.date}</Text>
            <View style={styles.chartTrack}>
              <View style={[styles.chartBar, { width: `${(value / maximum) * 100}%` }]} />
            </View>
            <Text style={styles.chartValue}>{value}</Text>
          </View>
        );
      })}
    </View>
  );
}

export function ExerciseProgressionScreen({
  exerciseService,
  progressService,
  tokens,
  onBack,
  onTokensChange,
}: ExerciseProgressionProps): React.JSX.Element {
  const [exercises, setExercises] = useState<ExerciseSummary[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseSummary | null>(null);
  const [data, setData] = useState<ExerciseProgressPoint[]>([]);
  const [metric, setMetric] = useState<Metric>('weight');
  const [isLoading, setIsLoading] = useState(true);
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

  const selectExercise = async (exercise: ExerciseSummary) => {
    setSelectedExercise(exercise);
    setIsLoading(true);
    setError(null);
    try {
      const result = await progressService.getExerciseProgression(tokens, exercise.id);
      setData(result.data);
      if (result.tokens.accessToken !== tokens.accessToken) {
        onTokensChange(result.tokens);
      }
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'No fue posible cargar la progresión.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>Volver a progreso</Text>
      </Pressable>
      <Text style={styles.title}>Progresión por ejercicio</Text>
      {!selectedExercise && <Text>Selecciona un ejercicio.</Text>}
      {exercises.map((exercise) => (
        <Pressable key={exercise.id} onPress={() => { void selectExercise(exercise); }} style={styles.exerciseButton}>
          <Text>{exercise.name}</Text>
        </Pressable>
      ))}
      {isLoading && <ActivityIndicator />}
      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {selectedExercise && !isLoading && !error && (
        <>
          <Text style={styles.subtitle}>{selectedExercise.name}</Text>
          {data.length === 0 && <Text>Aún no hay series completadas para este ejercicio.</Text>}
          {data.length > 0 && (
            <>
              <View style={styles.metrics}>
                {(['weight', 'volume', 'repetitions', 'estimatedOneRepMax'] as Metric[]).map((item) => (
                  <Pressable key={item} onPress={() => setMetric(item)} style={styles.metricButton}>
                    <Text>{metricLabel(item)}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.chartTitle}>{metricLabel(metric)}</Text>
              <MetricChart data={data} metric={metric} />
            </>
          )}
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
  chart: {
    gap: 10,
  },
  chartBar: {
    backgroundColor: '#1d4ed8',
    borderRadius: 4,
    height: 16,
  },
  chartDate: {
    fontSize: 11,
    width: 76,
  },
  chartRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  chartTrack: {
    backgroundColor: '#dbeafe',
    borderRadius: 4,
    flex: 1,
    height: 16,
  },
  chartValue: {
    minWidth: 40,
    textAlign: 'right',
  },
  container: {
    gap: 12,
    padding: 24,
  },
  error: {
    color: '#b91c1c',
  },
  exerciseButton: {
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
  },
  metricButton: {
    backgroundColor: '#d1d5db',
    borderRadius: 6,
    padding: 10,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
