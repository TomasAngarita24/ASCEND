import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ApiError } from '../../lib/api-client';
import type { Tokens } from '../auth/auth.types';
import { RoutineService, type MobileWorkout, type RoutineSummary } from './routine.service';

interface RoutinePickerProps {
  routineService: RoutineService;
  tokens: Tokens;
  onStarted: (workout: MobileWorkout, tokens: Tokens) => void;
  onBrowseExercises: () => void;
  onEditRoutine: (routineId: string) => void;
  onTokensChange: (tokens: Tokens) => void;
}

export function RoutinePicker({
  routineService,
  tokens,
  onStarted,
  onBrowseExercises,
  onEditRoutine,
  onTokensChange,
}: RoutinePickerProps): React.JSX.Element {
  const [routines, setRoutines] = useState<RoutineSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startingRoutineId, setStartingRoutineId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newRoutineName, setNewRoutineName] = useState('');
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

  const createRoutine = async () => {
    if (!newRoutineName.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    setIsCreating(true);
    setError(null);
    try {
      const result = await routineService.create(tokens, newRoutineName.trim());
      setRoutines((currentRoutines) => [result.routine, ...currentRoutines]);
      setNewRoutineName('');
      if (result.tokens.accessToken !== tokens.accessToken) {
        onTokensChange(result.tokens);
      }
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'No fue posible crear la rutina.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Selecciona una rutina</Text>
      <TextInput
        onChangeText={setNewRoutineName}
        placeholder="Nombre de nueva rutina"
        style={styles.input}
        value={newRoutineName}
      />
      <Pressable disabled={isCreating} onPress={() => { void createRoutine(); }} style={styles.createButton}>
        <Text style={styles.createButtonText}>{isCreating ? 'Creando...' : 'Crear rutina'}</Text>
      </Pressable>
      <Pressable onPress={onBrowseExercises} style={styles.exerciseButton}>
        <Text style={styles.exerciseButtonText}>Explorar ejercicios</Text>
      </Pressable>
      {isLoading && <ActivityIndicator />}
      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {!isLoading && routines.length === 0 && <Text>Aún no tienes rutinas.</Text>}
      {routines.map((routine) => (
        <View key={routine.id} style={styles.routine}>
          <Text style={styles.routineName}>{routine.name}</Text>
          <Text>{startingRoutineId === routine.id ? 'Iniciando...' : `${routine.exerciseCount} ejercicios`}</Text>
          <View style={styles.routineActions}>
            <Pressable disabled={startingRoutineId !== null} onPress={() => onEditRoutine(routine.id)} style={styles.secondaryButton}>
              <Text>Editar</Text>
            </Pressable>
            <Pressable disabled={startingRoutineId !== null} onPress={() => { void startRoutine(routine); }} style={styles.startButton}>
              <Text style={styles.startButtonText}>Iniciar</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  createButton: {
    alignItems: 'center',
    backgroundColor: '#1d4ed8',
    borderRadius: 8,
    padding: 12,
  },
  createButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  container: {
    gap: 12,
    padding: 24,
  },
  error: {
    color: '#b91c1c',
  },
  exerciseButton: {
    alignItems: 'center',
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
  },
  exerciseButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  input: {
    borderColor: '#9ca3af',
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
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
  routineActions: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButton: {
    backgroundColor: '#d1d5db',
    borderRadius: 6,
    padding: 10,
  },
  startButton: {
    backgroundColor: '#1d4ed8',
    borderRadius: 6,
    padding: 10,
  },
  startButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
});
