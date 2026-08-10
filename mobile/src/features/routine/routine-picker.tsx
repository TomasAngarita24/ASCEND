import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '../../lib/api-client';
import type { Tokens } from '../auth/auth.types';
import { RoutineService, type MobileWorkout, type RoutineSummary } from './routine.service';

interface RoutinePickerProps {
  routineService: RoutineService;
  tokens: Tokens;
  onStarted: (workout: MobileWorkout, tokens: Tokens) => void;
  onTokensChange: (tokens: Tokens) => void;
}

export function RoutinePicker({
  routineService,
  tokens,
  onStarted,
  onTokensChange,
}: RoutinePickerProps): React.JSX.Element {
  const [routines, setRoutines] = useState<RoutineSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startingRoutineId, setStartingRoutineId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    routineService.list(tokens)
      .then((result) => {
        setRoutines(result.routines);
        if (result.tokens.accessToken !== tokens.accessToken) {
          onTokensChange(result.tokens);
        }
      })
      .catch((requestError) => {
        setError(requestError instanceof ApiError ? requestError.message : 'No fue posible cargar las rutinas.');
      })
      .finally(() => setIsLoading(false));
  }, [routineService, tokens]);

  const startRoutine = async (routine: RoutineSummary) => {
    setStartingRoutineId(routine.id);
    setError(null);
    try {
      const result = await routineService.startWorkout(tokens, routine);
      onStarted(result.workout, result.tokens);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'No fue posible iniciar el entrenamiento.');
    } finally {
      setStartingRoutineId(null);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Selecciona una rutina</Text>
      {isLoading && <ActivityIndicator />}
      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {!isLoading && routines.length === 0 && <Text>Aún no tienes rutinas.</Text>}
      {routines.map((routine) => (
        <Pressable
          disabled={startingRoutineId !== null}
          key={routine.id}
          onPress={() => { void startRoutine(routine); }}
          style={styles.routine}
        >
          <Text style={styles.routineName}>{routine.name}</Text>
          <Text>{startingRoutineId === routine.id ? 'Iniciando...' : `${routine.exerciseCount} ejercicios`}</Text>
        </Pressable>
      ))}
    </View>
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
  routine: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 16,
  },
  routineName: {
    fontSize: 18,
    fontWeight: '700',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
});
