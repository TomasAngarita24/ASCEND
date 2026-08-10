import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ApiError } from '../../lib/api-client';
import type { Tokens } from '../auth/auth.types';
import {
  ExerciseService,
  type ExerciseDetail,
  type ExerciseFilters,
  type ExerciseSummary,
} from './exercise.service';

interface ExerciseLibraryProps {
  exerciseService: ExerciseService;
  tokens: Tokens;
  onBack: () => void;
  onTokensChange: (tokens: Tokens) => void;
}

function ExerciseDetailView({
  exercise,
  onBack,
}: {
  exercise: ExerciseDetail;
  onBack: () => void;
}): React.JSX.Element {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>Volver a ejercicios</Text>
      </Pressable>
      <Text style={styles.title}>{exercise.name}</Text>
      <Text>{exercise.targetMuscleGroups.join(', ') || 'Sin grupo muscular'}</Text>
      <Text>{exercise.equipment ?? 'Sin equipo especificado'}</Text>
      {exercise.description && <Text>{exercise.description}</Text>}
      {exercise.instructions && <Text>{exercise.instructions}</Text>}
    </ScrollView>
  );
}

interface CreateExerciseFormProps {
  exerciseService: ExerciseService;
  tokens: Tokens;
  onBack: () => void;
  onCreated: (exercise: ExerciseDetail, tokens: Tokens) => void;
}

function CreateExerciseForm({
  exerciseService,
  tokens,
  onBack,
  onCreated,
}: CreateExerciseFormProps): React.JSX.Element {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetMuscleGroups, setTargetMuscleGroups] = useState('');
  const [equipment, setEquipment] = useState('');
  const [instructions, setInstructions] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    if (!name.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const result = await exerciseService.create(tokens, {
        name: name.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(equipment.trim() ? { equipment: equipment.trim() } : {}),
        ...(instructions.trim() ? { instructions: instructions.trim() } : {}),
        ...(targetMuscleGroups.trim() ? {
          targetMuscleGroups: targetMuscleGroups.split(',').map((group) => group.trim()).filter(Boolean),
        } : {}),
      });
      onCreated(result.exercise, result.tokens);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'No fue posible crear el ejercicio.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>Volver a ejercicios</Text>
      </Pressable>
      <Text style={styles.title}>Nuevo ejercicio</Text>
      <TextInput onChangeText={setName} placeholder="Nombre" style={styles.input} value={name} />
      <TextInput multiline onChangeText={setDescription} placeholder="Descripción" style={styles.input} value={description} />
      <TextInput onChangeText={setTargetMuscleGroups} placeholder="Grupos musculares, separados por coma" style={styles.input} value={targetMuscleGroups} />
      <TextInput onChangeText={setEquipment} placeholder="Equipo" style={styles.input} value={equipment} />
      <TextInput multiline onChangeText={setInstructions} placeholder="Instrucciones" style={styles.input} value={instructions} />
      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <Pressable disabled={isSaving} onPress={() => { void create(); }} style={styles.searchButton}>
        <Text style={styles.searchButtonText}>{isSaving ? 'Guardando...' : 'Crear ejercicio'}</Text>
      </Pressable>
    </ScrollView>
  );
}

export function ExerciseLibrary({
  exerciseService,
  tokens,
  onBack,
  onTokensChange,
}: ExerciseLibraryProps): React.JSX.Element {
  const [filters, setFilters] = useState<ExerciseFilters>({});
  const [exercises, setExercises] = useState<ExerciseSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseDetail | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const loadExercises = useCallback(async (nextFilters: ExerciseFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await exerciseService.list(tokens, nextFilters);
      setExercises(result.exercises);
      if (result.tokens.accessToken !== tokens.accessToken) {
        onTokensChange(result.tokens);
      }
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'No fue posible cargar los ejercicios.');
    } finally {
      setIsLoading(false);
    }
  }, [exerciseService, onTokensChange, tokens]);

  useEffect(() => {
    void loadExercises(filters);
  }, [loadExercises]);

  const openExercise = async (exerciseId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await exerciseService.getDetail(tokens, exerciseId);
      setSelectedExercise(result.exercise);
      if (result.tokens.accessToken !== tokens.accessToken) {
        onTokensChange(result.tokens);
      }
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'No fue posible cargar el ejercicio.');
    } finally {
      setIsLoading(false);
    }
  };

  if (selectedExercise) {
    return <ExerciseDetailView exercise={selectedExercise} onBack={() => setSelectedExercise(null)} />;
  }

  if (isCreating) {
    return (
      <CreateExerciseForm
        exerciseService={exerciseService}
        onBack={() => setIsCreating(false)}
        onCreated={(exercise, nextTokens) => {
          if (nextTokens.accessToken !== tokens.accessToken) {
            onTokensChange(nextTokens);
          }
          setIsCreating(false);
          setSelectedExercise(exercise);
        }}
        tokens={tokens}
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>Volver a rutinas</Text>
      </Pressable>
      <Text style={styles.title}>Ejercicios</Text>
      <Pressable onPress={() => setIsCreating(true)} style={styles.createButton}>
        <Text style={styles.createButtonText}>Crear ejercicio personalizado</Text>
      </Pressable>
      <TextInput
        onChangeText={(query) => setFilters((current) => ({ ...current, query }))}
        placeholder="Buscar por nombre"
        style={styles.input}
        value={filters.query ?? ''}
      />
      <TextInput
        onChangeText={(muscleGroup) => setFilters((current) => ({ ...current, muscleGroup }))}
        placeholder="Grupo muscular"
        style={styles.input}
        value={filters.muscleGroup ?? ''}
      />
      <TextInput
        onChangeText={(equipment) => setFilters((current) => ({ ...current, equipment }))}
        placeholder="Equipo"
        style={styles.input}
        value={filters.equipment ?? ''}
      />
      <Pressable onPress={() => { void loadExercises(filters); }} style={styles.searchButton}>
        <Text style={styles.searchButtonText}>Buscar</Text>
      </Pressable>
      {isLoading && <ActivityIndicator />}
      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {!isLoading && exercises.length === 0 && <Text>No se encontraron ejercicios.</Text>}
      {exercises.map((exercise) => (
        <Pressable key={exercise.id} onPress={() => { void openExercise(exercise.id); }} style={styles.exercise}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          <Text>{exercise.targetMuscleGroups.join(', ') || 'Sin grupo muscular'}</Text>
          <Text>{exercise.equipment ?? 'Sin equipo especificado'}</Text>
        </Pressable>
      ))}
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
  createButton: {
    alignItems: 'center',
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
  },
  createButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  error: {
    color: '#b91c1c',
  },
  exercise: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    gap: 4,
    padding: 16,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '700',
  },
  input: {
    borderColor: '#9ca3af',
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  searchButton: {
    alignItems: 'center',
    backgroundColor: '#1d4ed8',
    borderRadius: 8,
    padding: 12,
  },
  searchButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
  },
});
