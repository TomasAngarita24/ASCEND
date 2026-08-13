import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AnimatedPressable from '../../components/AnimatedPressable';
import { EquipmentPickerModal } from '../../components/EquipmentPickerModal';
import { MuscleGroupPickerModal } from '../../components/MuscleGroupPickerModal';
import { ApiError } from '../../lib/api-client';
import { colors, spacing, typography } from '../../theme';
import type { Tokens } from '../auth/auth.types';
import {
  ExerciseService,
  type CreateExerciseInput,
  type ExerciseDetail,
  type ExerciseFilters,
  type ExerciseSummary,
} from './exercise.service';

interface ExerciseLibraryProps {
  exerciseService: ExerciseService;
  onBack: () => void;
  onTokensChange: (tokens: Tokens) => void;
  tokens: Tokens;
}

function ExerciseDetailView({
  exercise,
  onBack,
}: {
  exercise: ExerciseDetail;
  onBack: () => void;
}): React.JSX.Element {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <AnimatedPressable onPress={onBack} style={styles.backButton}>
        <MaterialIcons name="arrow-back" size={20} color={colors.text} />
        <Text style={styles.backButtonText}>Volver</Text>
      </AnimatedPressable>
      <Text style={styles.title}>{exercise.name}</Text>
      <View style={styles.badgeRow}>
        {exercise.targetMuscleGroups.map((group) => (
          <View key={group} style={styles.badge}>
            <Text style={styles.badgeText}>{group}</Text>
          </View>
        ))}
        {exercise.equipment && (
          <View style={styles.badgeEquipment}>
            <Text style={styles.badgeEquipmentText}>{exercise.equipment}</Text>
          </View>
        )}
      </View>
      {exercise.description && <Text style={styles.bodyText}>{exercise.description}</Text>}
      {exercise.instructions && <Text style={styles.bodyText}>{exercise.instructions}</Text>}
    </ScrollView>
  );
}

interface CreateExerciseFormProps {
  exerciseService: ExerciseService;
  onBack: () => void;
  onCreated: (exercise: ExerciseDetail, tokens: Tokens) => void;
  tokens: Tokens;
}

function CreateExerciseForm({
  exerciseService,
  onBack,
  onCreated,
  tokens,
}: CreateExerciseFormProps): React.JSX.Element {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetMuscleGroup, setTargetMuscleGroup] = useState<string | undefined>();
  const [equipment, setEquipment] = useState<string | undefined>();
  const [instructions, setInstructions] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showMusclePicker, setShowMusclePicker] = useState(false);
  const [showEquipmentPicker, setShowEquipmentPicker] = useState(false);

  const create = async () => {
    if (!name.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const input: CreateExerciseInput = {
        name: name.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(equipment ? { equipment } : {}),
        ...(instructions.trim() ? { instructions: instructions.trim() } : {}),
        ...(targetMuscleGroup ? { targetMuscleGroups: [targetMuscleGroup] } : {}),
      };
      const result = await exerciseService.create(tokens, input);
      onCreated(result.exercise, result.tokens);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'No fue posible crear el ejercicio.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <View style={styles.topBar}>
          <AnimatedPressable onPress={onBack}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </AnimatedPressable>
          <Text style={styles.topBarTitle}>Nuevo ejercicio</Text>
          <View style={{ width: 24 }} />
        </View>

        <TextInput onChangeText={setName} placeholder="Nombre del ejercicio" placeholderTextColor={colors.muted} style={styles.input} value={name} />
        <TextInput multiline onChangeText={setDescription} placeholder="Descripción" placeholderTextColor={colors.muted} style={styles.input} value={description} />
        
        <AnimatedPressable onPress={() => setShowMusclePicker(true)} style={styles.selectorButton}>
          <Text style={styles.selectorLabel}>Grupo muscular:</Text>
          <Text style={styles.selectorValue}>{targetMuscleGroup || 'Seleccionar ▾'}</Text>
        </AnimatedPressable>

        <AnimatedPressable onPress={() => setShowEquipmentPicker(true)} style={styles.selectorButton}>
          <Text style={styles.selectorLabel}>Equipo:</Text>
          <Text style={styles.selectorValue}>{equipment || 'Seleccionar ▾'}</Text>
        </AnimatedPressable>

        <TextInput multiline onChangeText={setInstructions} placeholder="Instrucciones" placeholderTextColor={colors.muted} style={styles.input} value={instructions} />
        {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        <AnimatedPressable disabled={isSaving} onPress={() => { void create(); }} style={styles.createSubmitButton}>
          <Text style={styles.createSubmitButtonText}>{isSaving ? 'Guardando...' : 'Crear ejercicio'}</Text>
        </AnimatedPressable>
      </ScrollView>

      <MuscleGroupPickerModal
        onClose={() => setShowMusclePicker(false)}
        onSelect={(selected) => setTargetMuscleGroup(selected)}
        selectedValue={targetMuscleGroup}
        visible={showMusclePicker}
      />

      <EquipmentPickerModal
        onClose={() => setShowEquipmentPicker(false)}
        onSelect={(selected) => setEquipment(selected)}
        selectedValue={equipment}
        visible={showEquipmentPicker}
      />
    </View>
  );
}

export function ExerciseLibrary({
  exerciseService,
  onBack,
  onTokensChange,
  tokens,
}: ExerciseLibraryProps): React.JSX.Element {
  const [filters, setFilters] = useState<ExerciseFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [rawExercises, setRawExercises] = useState<ExerciseSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseDetail | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [showMusclePicker, setShowMusclePicker] = useState(false);
  const [showEquipmentPicker, setShowEquipmentPicker] = useState(false);

  const loadExercises = useCallback(async (nextFilters: ExerciseFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await exerciseService.list(tokens, nextFilters);
      setRawExercises(result.exercises);
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
  }, [filters, loadExercises]);

  const filteredExercises = useMemo(() => {
    if (!searchQuery.trim()) {
      return rawExercises;
    }
    const q = searchQuery.toLowerCase().trim();
    return rawExercises.filter((e) => e.name.toLowerCase().includes(q));
  }, [rawExercises, searchQuery]);

  const handleMuscleGroupSelect = (muscleGroup: string | undefined) => {
    setShowMusclePicker(false);
    setFilters((current) => ({ ...current, muscleGroup }));
  };

  const handleEquipmentSelect = (equipment: string | undefined) => {
    setShowEquipmentPicker(false);
    setFilters((current) => ({ ...current, equipment }));
  };

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
    <View style={styles.root}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        {/* Top Header Bar matching Image 3 */}
        <View style={styles.topBar}>
          <AnimatedPressable onPress={onBack}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </AnimatedPressable>
          <Text style={styles.topBarTitle}>Ejercicios</Text>
          <AnimatedPressable onPress={() => setIsCreating(true)}>
            <Text style={styles.createLinkText}>Crear</Text>
          </AnimatedPressable>
        </View>

        {/* Search Input with Magnifying Glass Icon matching Image 3 */}
        <View style={styles.searchBarContainer}>
          <MaterialIcons name="search" size={20} color={colors.muted} />
          <TextInput
            onChangeText={(text) => {
              setSearchQuery(text);
              setFilters((current) => ({ ...current, query: text.trim() ? text.trim() : undefined }));
            }}
            placeholder="Buscar ejercicio"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            value={searchQuery}
          />
          {Boolean(searchQuery) && (
            <AnimatedPressable onPress={() => {
              setSearchQuery('');
              setFilters((current) => ({ ...current, query: undefined }));
            }}>
              <MaterialIcons name="close" size={18} color={colors.muted} />
            </AnimatedPressable>
          )}
        </View>

        {/* Side-by-side Selectors for Equipment and Muscle Groups matching Image 3 */}
        <View style={styles.selectorRow}>
          <AnimatedPressable
            onPress={() => setShowEquipmentPicker(true)}
            style={[styles.filterPillButton, Boolean(filters.equipment) && styles.filterPillActive]}
          >
            <Text style={[styles.filterPillText, Boolean(filters.equipment) && styles.filterPillTextActive]}>
              {filters.equipment ? `Equipo: ${filters.equipment}` : 'Todo el equipo ▾'}
            </Text>
          </AnimatedPressable>

          <AnimatedPressable
            onPress={() => setShowMusclePicker(true)}
            style={[styles.filterPillButton, Boolean(filters.muscleGroup) && styles.filterPillActive]}
          >
            <Text style={[styles.filterPillText, Boolean(filters.muscleGroup) && styles.filterPillTextActive]}>
              {filters.muscleGroup ? `Músculo: ${filters.muscleGroup}` : 'Todos los músculos ▾'}
            </Text>
          </AnimatedPressable>
        </View>

        {/* Section Header matching Image 3 */}
        <Text style={styles.sectionHeader}>Ejercicios populares</Text>

        {isLoading && <ActivityIndicator color={colors.accentAlt} style={{ marginVertical: 10 }} />}
        {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        {!isLoading && filteredExercises.length === 0 && (
          <Text style={styles.helper}>No se encontraron ejercicios.</Text>
        )}

        {/* Exercise Rows matching Image 3 */}
        {filteredExercises.map((exercise) => (
          <AnimatedPressable
            key={exercise.id}
            onPress={() => { void openExercise(exercise.id); }}
            style={styles.exerciseRow}
          >
            <View style={styles.exerciseAvatar}>
              <MaterialIcons name="fitness-center" size={24} color={colors.muted} />
            </View>
            <View style={styles.exerciseInfo}>
              <Text style={styles.exerciseRowName}>{exercise.name}</Text>
              <Text style={styles.exerciseRowMuscle}>
                {exercise.targetMuscleGroups.join(', ') || 'Sin grupo muscular'}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
          </AnimatedPressable>
        ))}
      </ScrollView>

      {/* Modals rendered OUTSIDE ScrollView at root View level */}
      <MuscleGroupPickerModal
        onClose={() => setShowMusclePicker(false)}
        onSelect={handleMuscleGroupSelect}
        selectedValue={filters.muscleGroup}
        visible={showMusclePicker}
      />

      <EquipmentPickerModal
        onClose={() => setShowEquipmentPicker(false)}
        onSelect={handleEquipmentSelect}
        selectedValue={filters.equipment}
        visible={showEquipmentPicker}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    flexDirection: 'row',
    gap: spacing(0.5),
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backButtonText: {
    color: colors.text,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeEquipment: {
    backgroundColor: 'rgba(96, 165, 250, 0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeEquipmentText: {
    color: '#93c5fd',
    fontSize: 12,
    fontWeight: '600',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing(0.5),
  },
  badgeText: {
    color: '#6ee7b7',
    fontSize: 12,
    fontWeight: '600',
  },
  bodyText: {
    color: colors.muted,
    fontSize: typography.body,
    lineHeight: 22,
  },
  container: {
    gap: spacing(1.5),
    padding: spacing(2.5),
    paddingBottom: spacing(4),
  },
  createLinkText: {
    color: colors.accentAlt,
    fontSize: typography.body,
    fontWeight: '600',
  },
  createSubmitButton: {
    alignItems: 'center',
    backgroundColor: colors.accentAlt,
    borderRadius: 14,
    marginTop: spacing(1),
    paddingVertical: spacing(1.75),
  },
  createSubmitButtonText: {
    color: '#ffffff',
    fontSize: typography.body,
    fontWeight: '700',
  },
  error: {
    color: colors.danger,
  },
  exerciseAvatar: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 25,
    borderWidth: 1,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  exerciseInfo: {
    flex: 1,
    gap: 2,
  },
  exerciseRow: {
    alignItems: 'center',
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing(1.5),
    paddingVertical: spacing(1.5),
  },
  exerciseRowMuscle: {
    color: colors.muted,
    fontSize: typography.caption,
  },
  exerciseRowName: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '600',
  },
  filterPillActive: {
    backgroundColor: 'rgba(37, 99, 235, 0.2)',
    borderColor: colors.accentAlt,
  },
  filterPillButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    paddingVertical: spacing(1.5),
  },
  filterPillText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: colors.accentAlt,
    fontWeight: '700',
  },
  helper: {
    color: colors.muted,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    color: colors.text,
    padding: 12,
  },
  root: {
    backgroundColor: colors.background,
    flex: 1,
  },
  scroll: {
    backgroundColor: colors.background,
    flex: 1,
  },
  searchBarContainer: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing(1),
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.5),
  },
  searchInput: {
    color: colors.text,
    flex: 1,
    fontSize: typography.body,
    paddingVertical: spacing(1),
  },
  sectionHeader: {
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: '700',
    marginTop: spacing(1),
  },
  selectorButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  selectorLabel: {
    color: colors.muted,
    fontSize: typography.body,
  },
  selectorRow: {
    flexDirection: 'row',
    gap: spacing(1.25),
  },
  selectorValue: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '600',
  },
  title: {
    color: colors.text,
    fontSize: typography.h2,
    fontWeight: '700',
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing(0.5),
  },
  topBarTitle: {
    color: colors.text,
    fontSize: typography.h2,
    fontWeight: '700',
  },
});
