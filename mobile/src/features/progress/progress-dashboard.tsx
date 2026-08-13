import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, typography, spacing } from '../../theme';
import AnimatedPressable from '../../components/AnimatedPressable';

import { ApiError } from '../../lib/api-client';
import type { Tokens } from '../auth/auth.types';
import { ProgressService, type ProgressDashboard } from './progress.service';

interface ProgressDashboardProps {
  progressService: ProgressService;
  tokens: Tokens;
  onBack: () => void;
  onViewExerciseProgression: () => void;
  onTokensChange: (tokens: Tokens) => void;
}

function formatRecordType(type: string): string {
  const labels: Record<string, string> = {
    highest_weight: 'Mayor peso',
    highest_repetitions_at_weight: 'Más repeticiones al peso',
    estimated_one_rep_max: '1RM estimado',
    highest_training_volume: 'Mayor volumen',
  };
  return labels[type] ?? type;
}

export function ProgressDashboardScreen({
  progressService,
  tokens,
  onBack,
  onViewExerciseProgression,
  onTokensChange,
}: ProgressDashboardProps): React.JSX.Element {
  const [dashboard, setDashboard] = useState<ProgressDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    progressService.getDashboard(tokens)
      .then((result) => {
        setDashboard(result.dashboard);
        if (result.tokens.accessToken !== tokens.accessToken) {
          onTokensChange(result.tokens);
        }
      })
      .catch((requestError) => {
        setError(requestError instanceof ApiError ? requestError.message : 'No fue posible cargar el progreso.');
      });
  }, [onTokensChange, progressService, tokens]);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <AnimatedPressable onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>Volver</Text>
      </AnimatedPressable>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>ASCEND</Text>
        <Text style={styles.title}>Progreso</Text>
      </View>
        {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          {!dashboard && !error && <ActivityIndicator color={colors.accent} />}
      {dashboard && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Estadísticas</Text>
            <Text style={styles.bodyText}>{dashboard.statistics.totalWorkouts} entrenamientos</Text>
            <Text style={styles.bodyText}>{dashboard.statistics.workoutFrequency} por semana</Text>
            <Text style={styles.bodyText}>{dashboard.statistics.totalVolume} kg de volumen</Text>
            <Text style={styles.bodyText}>{dashboard.statistics.totalSets} series · {dashboard.statistics.totalRepetitions} repeticiones</Text>
            <Text style={styles.bodyText}>{dashboard.statistics.personalRecords} récords personales</Text>
            <AnimatedPressable onPress={onViewExerciseProgression} style={styles.progressButton}>
              <Text style={styles.progressButtonText}>Ver progresión por ejercicio</Text>
            </AnimatedPressable>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Récords personales</Text>
            {dashboard.personalRecords.length === 0 && <Text style={styles.helper}>Aún no hay récords.</Text>}
            {dashboard.personalRecords.map((record, index) => (
              <View key={`${record.type}-${record.exercise.id}-${record.achievedAt}-${index}`} style={styles.item}>
                <Text style={styles.bodyText}>{formatRecordType(record.type)} · {record.exercise.name}</Text>
                <Text style={styles.metricValue}>{record.value}</Text>
              </View>
            ))}
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Grupos musculares</Text>
            {dashboard.muscleGroups.length === 0 && <Text style={styles.helper}>Aún no hay datos por grupo muscular.</Text>}
            {dashboard.muscleGroups.map((group) => (
              <View key={group.muscleGroup} style={styles.item}>
                <Text style={styles.bodyText}>{group.muscleGroup}</Text>
                <Text style={styles.helper}>{group.trainingFrequency} entrenamientos · {group.volume} kg</Text>
              </View>
            ))}
          </View>
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
  item: {
    borderTopColor: 'rgba(255,255,255,0.08)',
    borderTopWidth: 1,
    gap: 4,
    paddingVertical: 10,
  },
  progressButton: {
    alignItems: 'center',
    backgroundColor: colors.accentAlt,
    borderRadius: 14,
    padding: spacing(1.25),
  },
  progressButtonText: {
    color: colors.text,
    fontWeight: '700',
  },
  section: {
    backgroundColor: colors.surface,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    borderWidth: 1,
    gap: spacing(1),
    padding: spacing(2),
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
  },
  bodyText: {
    color: '#f8fafc',
  },
  eyebrow: {
    color: '#7dd3fc',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  header: {
    gap: 4,
  },
  helper: {
    color: '#94a3b8',
  },
  metricValue: {
    color: '#7dd3fc',
    fontWeight: '700',
  },
  title: {
    color: '#f8fafc',
    fontSize: 26,
    fontWeight: '700',
  },
});
