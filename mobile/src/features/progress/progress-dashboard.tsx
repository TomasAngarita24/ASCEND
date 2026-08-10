import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

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
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>Volver a rutinas</Text>
      </Pressable>
      <Text style={styles.title}>Progreso</Text>
      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {!dashboard && !error && <ActivityIndicator />}
      {dashboard && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Estadísticas</Text>
            <Text>{dashboard.statistics.totalWorkouts} entrenamientos</Text>
            <Text>{dashboard.statistics.workoutFrequency} por semana</Text>
            <Text>{dashboard.statistics.totalVolume} kg de volumen</Text>
            <Text>{dashboard.statistics.totalSets} series · {dashboard.statistics.totalRepetitions} repeticiones</Text>
            <Text>{dashboard.statistics.personalRecords} récords personales</Text>
            <Pressable onPress={onViewExerciseProgression} style={styles.progressButton}>
              <Text style={styles.progressButtonText}>Ver progresión por ejercicio</Text>
            </Pressable>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Récords personales</Text>
            {dashboard.personalRecords.length === 0 && <Text>Aún no hay récords.</Text>}
            {dashboard.personalRecords.map((record, index) => (
              <View key={`${record.type}-${record.exercise.id}-${record.achievedAt}-${index}`} style={styles.item}>
                <Text>{formatRecordType(record.type)} · {record.exercise.name}</Text>
                <Text>{record.value}</Text>
              </View>
            ))}
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Grupos musculares</Text>
            {dashboard.muscleGroups.length === 0 && <Text>Aún no hay datos por grupo muscular.</Text>}
            {dashboard.muscleGroups.map((group) => (
              <View key={group.muscleGroup} style={styles.item}>
                <Text>{group.muscleGroup}</Text>
                <Text>{group.trainingFrequency} entrenamientos · {group.volume} kg</Text>
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
  item: {
    borderTopColor: '#d1d5db',
    borderTopWidth: 1,
    gap: 4,
    paddingVertical: 10,
  },
  progressButton: {
    alignItems: 'center',
    backgroundColor: '#1d4ed8',
    borderRadius: 6,
    padding: 10,
  },
  progressButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  section: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    gap: 8,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
  },
});
