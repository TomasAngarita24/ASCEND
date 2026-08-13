import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AnimatedPressable from '../../components/AnimatedPressable';
import { ApiError } from '../../lib/api-client';
import { colors, spacing, typography } from '../../theme';
import type { Tokens } from '../auth/auth.types';
import { ExerciseService, type ExerciseSummary } from '../exercise/exercise.service';
import {
  RoutineService,
  type RoutineDetail,
  type RoutineExercise,
  type RoutineExerciseInput,
} from './routine.service';

interface RoutineEditorProps {
  exerciseService: ExerciseService;
  onBack: () => void;
  onTokensChange: (tokens: Tokens) => void;
  routineId: string;
  routineService: RoutineService;
  tokens: Tokens;
}

function parseNumber(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

interface RoutineExerciseEditorProps {
  canMoveDown: boolean;
  canMoveUp: boolean;
  exercise: RoutineExercise;
  onDelete: () => Promise<void>;
  onMoveDown: () => Promise<void>;
  onMoveUp: () => Promise<void>;
  onSave: (input: RoutineExerciseInput) => Promise<void>;
}

function RoutineExerciseEditor({
  canMoveDown,
  canMoveUp,
  exercise,
  onDelete,
  onMoveDown,
  onMoveUp,
  onSave,
}: RoutineExerciseEditorProps): React.JSX.Element {
  const [targetSets, setTargetSets] = useState(exercise.targetSets?.toString() ?? '');
  const [repetitionsMin, setRepetitionsMin] = useState(exercise.targetRepetitionsMin?.toString() ?? '');
  const [repetitionsMax, setRepetitionsMax] = useState(exercise.targetRepetitionsMax?.toString() ?? '');
  const [targetWeight, setTargetWeight] = useState(exercise.targetWeight?.toString() ?? '');
  const [restSeconds, setRestSeconds] = useState(exercise.restSeconds?.toString() ?? '');
  const [notes, setNotes] = useState(exercise.notes ?? '');
  const [isSaving, setIsSaving] = useState(false);

  const save = async () => {
    setIsSaving(true);
    try {
      await onSave({
        ...(parseNumber(targetSets) !== undefined ? { targetSets: parseNumber(targetSets) } : {}),
        ...(parseNumber(repetitionsMin) !== undefined ? { targetRepetitionsMin: parseNumber(repetitionsMin) } : {}),
        ...(parseNumber(repetitionsMax) !== undefined ? { targetRepetitionsMax: parseNumber(repetitionsMax) } : {}),
        ...(parseNumber(targetWeight) !== undefined ? { targetWeight: parseNumber(targetWeight) } : {}),
        ...(parseNumber(restSeconds) !== undefined ? { restSeconds: parseNumber(restSeconds) } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const runAction = async (action: () => Promise<void>) => {
    setIsSaving(true);
    try {
      await action();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.routineExercise}>
      <Text style={styles.exerciseName}>{exercise.position}. {exercise.exercise.name}</Text>
      <View style={styles.inputGrid}>
        <TextInput
          keyboardType="number-pad"
          onChangeText={setTargetSets}
          placeholder="Series objetivo"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={targetSets}
        />
        <TextInput
          keyboardType="number-pad"
          onChangeText={setRepetitionsMin}
          placeholder="Repeticiones mínimas"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={repetitionsMin}
        />
        <TextInput
          keyboardType="number-pad"
          onChangeText={setRepetitionsMax}
          placeholder="Repeticiones máximas"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={repetitionsMax}
        />
        <TextInput
          keyboardType="decimal-pad"
          onChangeText={setTargetWeight}
          placeholder="Peso objetivo (kg)"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={targetWeight}
        />
        <TextInput
          keyboardType="number-pad"
          onChangeText={setRestSeconds}
          placeholder="Descanso (segundos)"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={restSeconds}
        />
      </View>
      <TextInput
        multiline
        onChangeText={setNotes}
        placeholder="Notas"
        placeholderTextColor={colors.muted}
        style={styles.input}
        value={notes}
      />
      <AnimatedPressable disabled={isSaving} onPress={() => { void save(); }} style={styles.saveConfigButton}>
        <Text style={styles.saveConfigButtonText}>{isSaving ? 'Guardando...' : 'Guardar configuración'}</Text>
      </AnimatedPressable>
      <View style={styles.exerciseActions}>
        <AnimatedPressable disabled={isSaving || !canMoveUp} onPress={() => { void runAction(onMoveUp); }} style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Subir</Text>
        </AnimatedPressable>
        <AnimatedPressable disabled={isSaving || !canMoveDown} onPress={() => { void runAction(onMoveDown); }} style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Bajar</Text>
        </AnimatedPressable>
        <AnimatedPressable disabled={isSaving} onPress={() => { void runAction(onDelete); }} style={styles.deleteButton}>
          <Text style={styles.deleteButtonText}>Eliminar</Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}

export function RoutineEditor({
  exerciseService,
  onBack,
  onTokensChange,
  routineId,
  routineService,
  tokens,
}: RoutineEditorProps): React.JSX.Element {
  const [routine, setRoutine] = useState<RoutineDetail | null>(null);
  const [exercises, setExercises] = useState<ExerciseSummary[]>([]);
  const [routineName, setRoutineName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSavingRoutine, setIsSavingRoutine] = useState(false);
  const [isPickerVisible, setIsPickerVisible] = useState(false);

  useEffect(() => {
    const loadRoutine = async () => {
      try {
        const routineResult = await routineService.getDetail(tokens, routineId);
        const exerciseResult = await exerciseService.list(routineResult.tokens, {});
        setRoutine(routineResult.routine);
        setRoutineName(routineResult.routine.name);
        setExercises(exerciseResult.exercises);
        if (exerciseResult.tokens.accessToken !== tokens.accessToken) {
          onTokensChange(exerciseResult.tokens);
        }
      } catch (requestError) {
        setError(requestError instanceof ApiError ? requestError.message : 'No fue posible cargar la rutina.');
      }
    };
    void loadRoutine();
  }, [exerciseService, onTokensChange, routineId, routineService, tokens]);

  const addExercise = async (exerciseId: string) => {
    if (!routine) {
      return;
    }
    try {
      const result = await routineService.addExercise(tokens, routine.id, exerciseId);
      setRoutine((currentRoutine) => currentRoutine && {
        ...currentRoutine,
        exercises: [...currentRoutine.exercises, result.routineExercise],
      });
      setIsPickerVisible(false);
      if (result.tokens.accessToken !== tokens.accessToken) {
        onTokensChange(result.tokens);
      }
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'No fue posible añadir el ejercicio.');
    }
  };

  const saveAndExit = async () => {
    if (!routine || !routineName.trim()) {
      setError('El título de rutina es obligatorio.');
      return;
    }
    setIsSavingRoutine(true);
    try {
      const result = await routineService.update(tokens, routine.id, routineName.trim());
      setRoutine(result.routine);
      setRoutineName(result.routine.name);
      if (result.tokens.accessToken !== tokens.accessToken) {
        onTokensChange(result.tokens);
      }
      onBack();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'No fue posible guardar la rutina.');
    } finally {
      setIsSavingRoutine(false);
    }
  };

  const saveExercise = async (routineExerciseId: string, input: RoutineExerciseInput) => {
    if (!routine) {
      return;
    }
    try {
      const result = await routineService.updateExercise(tokens, routine.id, routineExerciseId, input);
      setRoutine((currentRoutine) => currentRoutine && {
        ...currentRoutine,
        exercises: currentRoutine.exercises.map((item) => (
          item.id === routineExerciseId ? result.routineExercise : item
        )),
      });
      if (result.tokens.accessToken !== tokens.accessToken) {
        onTokensChange(result.tokens);
      }
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'No fue posible guardar la configuración.');
    }
  };

  const deleteExercise = async (routineExerciseId: string) => {
    if (!routine) {
      return;
    }
    try {
      const result = await routineService.deleteExercise(tokens, routine.id, routineExerciseId);
      setRoutine((currentRoutine) => currentRoutine && {
        ...currentRoutine,
        exercises: currentRoutine.exercises
          .filter((item) => item.id !== routineExerciseId)
          .map((item, index) => ({ ...item, position: index + 1 })),
      });
      if (result.tokens.accessToken !== tokens.accessToken) {
        onTokensChange(result.tokens);
      }
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'No fue posible eliminar el ejercicio.');
    }
  };

  const moveExercise = async (routineExerciseId: string, direction: -1 | 1) => {
    if (!routine) {
      return;
    }
    const currentIndex = routine.exercises.findIndex((item) => item.id === routineExerciseId);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= routine.exercises.length) {
      return;
    }
    const reorderedExercises = [...routine.exercises];
    [reorderedExercises[currentIndex], reorderedExercises[targetIndex]] = [
      reorderedExercises[targetIndex],
      reorderedExercises[currentIndex],
    ];
    try {
      const result = await routineService.reorderExercises(
        tokens,
        routine.id,
        reorderedExercises.map((item) => item.id),
      );
      setRoutine(result.routine);
      if (result.tokens.accessToken !== tokens.accessToken) {
        onTokensChange(result.tokens);
      }
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'No fue posible reordenar los ejercicios.');
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {/* Top Header Bar matching Image 2 */}
      <View style={styles.topBar}>
        <AnimatedPressable
          accessibilityRole="button"
          disabled={isSavingRoutine}
          onPress={onBack}
        >
          <Text style={styles.cancelText}>Cancelar</Text>
        </AnimatedPressable>

        <Text style={styles.topBarTitle}>Crear rutina</Text>

        <AnimatedPressable
          accessibilityRole="button"
          disabled={isSavingRoutine}
          onPress={() => { void saveAndExit(); }}
          style={styles.savePillBtn}
        >
          <Text style={styles.savePillBtnText}>
            {isSavingRoutine ? '...' : 'Guardar'}
          </Text>
        </AnimatedPressable>
      </View>

      {!routine && !error && <ActivityIndicator color={colors.accentAlt} style={{ marginVertical: 20 }} />}
      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}

      {routine && (
        <>
          {/* Routine Title Input matching Image 2 */}
          <TextInput
            onChangeText={setRoutineName}
            placeholder="Título de rutina"
            placeholderTextColor={colors.muted}
            style={styles.routineTitleInput}
            value={routineName}
          />

          {/* Empty State matching Image 2 when no exercises exist */}
          {routine.exercises.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="fitness-center" size={56} color={colors.muted} />
              <Text style={styles.emptyText}>
                Comienza añadiendo un ejercicio a tu rutina.
              </Text>
              <AnimatedPressable
                onPress={() => setIsPickerVisible(true)}
                style={styles.addExerciseMainBtn}
              >
                <MaterialIcons name="add" size={22} color="#ffffff" />
                <Text style={styles.addExerciseMainBtnText}>Añadir ejercicio</Text>
              </AnimatedPressable>
            </View>
          ) : (
            <>
              {/* Exercise Items List */}
              {routine.exercises.map((item, index) => (
                <RoutineExerciseEditor
                  canMoveDown={index < routine.exercises.length - 1}
                  canMoveUp={index > 0}
                  exercise={item}
                  key={item.id}
                  onDelete={() => deleteExercise(item.id)}
                  onMoveDown={() => moveExercise(item.id, 1)}
                  onMoveUp={() => moveExercise(item.id, -1)}
                  onSave={(input) => saveExercise(item.id, input)}
                />
              ))}

              {/* Add Exercise CTA Button at Bottom */}
              <AnimatedPressable
                onPress={() => setIsPickerVisible(true)}
                style={styles.addExerciseMainBtn}
              >
                <MaterialIcons name="add" size={22} color="#ffffff" />
                <Text style={styles.addExerciseMainBtnText}>Añadir ejercicio</Text>
              </AnimatedPressable>
            </>
          )}

          {/* Exercise Picker Modal */}
          {isPickerVisible && (
            <View style={styles.pickerContainer}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Seleccionar ejercicio</Text>
                <AnimatedPressable onPress={() => setIsPickerVisible(false)}>
                  <MaterialIcons name="close" size={24} color={colors.muted} />
                </AnimatedPressable>
              </View>
              {exercises.map((item) => (
                <AnimatedPressable
                  key={item.id}
                  onPress={() => { void addExercise(item.id); }}
                  style={styles.pickerItem}
                >
                  <Text style={styles.pickerItemName}>{item.name}</Text>
                  <Text style={styles.pickerItemMuscle}>{item.targetMuscleGroups.join(', ')}</Text>
                </AnimatedPressable>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.75),
  },
  actionButtonText: {
    color: colors.text,
    fontSize: 12,
  },
  addExerciseMainBtn: {
    alignItems: 'center',
    backgroundColor: colors.accentAlt,
    borderRadius: 14,
    flexDirection: 'row',
    gap: spacing(1),
    justifyContent: 'center',
    marginTop: spacing(2),
    paddingVertical: spacing(1.75),
    width: '100%',
  },
  addExerciseMainBtnText: {
    color: '#ffffff',
    fontSize: typography.body,
    fontWeight: '700',
  },
  cancelText: {
    color: colors.accentAlt,
    fontSize: typography.body,
    fontWeight: '600',
  },
  container: {
    gap: spacing(1.5),
    padding: spacing(2.5),
    paddingBottom: spacing(4),
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 8,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.75),
  },
  deleteButtonText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    gap: spacing(2),
    justifyContent: 'center',
    paddingVertical: spacing(6),
  },
  emptyText: {
    color: colors.muted,
    fontSize: typography.body,
    textAlign: 'center',
    width: '80%',
  },
  error: {
    color: colors.danger,
  },
  exerciseActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing(0.5),
  },
  exerciseName: {
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#111827',
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    borderWidth: 1,
    color: colors.text,
    padding: spacing(1),
  },
  inputGrid: {
    gap: 8,
  },
  pickerContainer: {
    backgroundColor: colors.surface,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    borderWidth: 1,
    gap: spacing(1),
    marginTop: spacing(2),
    padding: spacing(2),
  },
  pickerHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing(1),
  },
  pickerItem: {
    backgroundColor: '#111827',
    borderRadius: 10,
    padding: spacing(1.5),
  },
  pickerItemMuscle: {
    color: colors.muted,
    fontSize: 12,
  },
  pickerItemName: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '600',
  },
  pickerTitle: {
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: '700',
  },
  routineExercise: {
    backgroundColor: colors.surface,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  routineTitleInput: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    paddingVertical: spacing(1),
  },
  saveConfigButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(37, 99, 235, 0.2)',
    borderColor: 'rgba(37, 99, 235, 0.4)',
    borderRadius: 10,
    borderWidth: 1,
    padding: spacing(1.25),
  },
  saveConfigButtonText: {
    color: colors.accentAlt,
    fontWeight: '700',
  },
  savePillBtn: {
    backgroundColor: colors.accentAlt,
    borderRadius: 999,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(0.75),
  },
  savePillBtnText: {
    color: '#ffffff',
    fontSize: typography.body,
    fontWeight: '700',
  },
  scroll: {
    backgroundColor: colors.background,
    flex: 1,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing(0.5),
  },
  topBarTitle: {
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: '700',
  },
});
