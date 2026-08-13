import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, typography, spacing } from '../../theme';
import AnimatedPressable from '../../components/AnimatedPressable';

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
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <AnimatedPressable onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>Volver a progreso</Text>
      </AnimatedPressable>
      <Text style={styles.title}>Progresión por ejercicio</Text>
      {!selectedExercise && <Text style={styles.helper}>Selecciona un ejercicio.</Text>}
      {exercises.map((exercise) => (
        <AnimatedPressable key={exercise.id} onPress={() => { void selectExercise(exercise); }} style={styles.exerciseButton}>
          <Text style={styles.exerciseButtonText}>{exercise.name}</Text>
        </AnimatedPressable>
      ))}
      {isLoading && <ActivityIndicator color="#22c55e" />}
      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {selectedExercise && !isLoading && !error && (
        <>
          <Text style={styles.subtitle}>{selectedExercise.name}</Text>
          {data.length === 0 && <Text style={styles.helper}>Aún no hay series completadas para este ejercicio.</Text>}
          {data.length > 0 && (
            <>
              <View style={styles.metrics}>
                {(['weight', 'volume', 'repetitions', 'estimatedOneRepMax'] as Metric[]).map((item) => (
                  <AnimatedPressable key={item} onPress={() => setMetric(item)} style={styles.metricButton}>
                    <Text style={styles.metricButtonText}>{metricLabel(item)}</Text>
                  </AnimatedPressable>
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
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 999,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1),
  },
  backButtonText: {
    color: colors.text,
  },
  chartTitle: {
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: '700',
  },
  chartDate: {
    color: colors.muted,
    fontSize: 11,
    width: 76,
  },
  chartBar: {
    backgroundColor: colors.accent,
    borderRadius: 6,
    height: 16,
  },
  chart: {
    gap: spacing(1),
  },
  chartRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  chartTrack: {
    backgroundColor: '#1e293b',
    borderRadius: 6,
    flex: 1,
    height: 16,
  },
  chartValue: {
    color: colors.text,
    minWidth: 40,
    textAlign: 'right',
  },
  container: {
    flexGrow: 1,
    gap: spacing(1.5),
    padding: spacing(2.5),
    paddingBottom: spacing(4),
  },
  scroll: {
    backgroundColor: colors.background,
    flex: 1,
  },
  error: {
    color: colors.danger,
  },
  exerciseButton: {
    backgroundColor: colors.surface,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    borderWidth: 1,
    padding: spacing(1.5),
  },
  exerciseButtonText: {
    color: colors.text,
  },
  helper: {
    color: colors.muted,
  },
  metricButton: {
    backgroundColor: '#111827',
    borderRadius: 999,
    paddingHorizontal: spacing(1.25),
    paddingVertical: spacing(1),
  },
  metricButtonText: {
    color: colors.text,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  subtitle: {
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: '700',
  },
  title: {
    color: colors.text,
    fontSize: typography.h2,
    fontWeight: '700',
  },
});
