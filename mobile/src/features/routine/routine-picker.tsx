import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AnimatedPressable from '../../components/AnimatedPressable';
import { ApiError } from '../../lib/api-client';
import { colors, spacing, typography } from '../../theme';
import type { Tokens } from '../auth/auth.types';
import { RoutineService, type MobileWorkout, type RoutineSummary } from './routine.service';

interface RoutinePickerProps {
  onEditRoutine: (routineId: string) => void;
  onExploreRoutines: () => void;
  onStartIndependentWorkout: () => Promise<void>;
  onStarted: (workout: MobileWorkout, tokens: Tokens) => void;
  onTokensChange: (tokens: Tokens) => void;
  onViewHistory?: () => void;
  routineService: RoutineService;
  tokens: Tokens;
}

export function RoutinePicker({
  onEditRoutine,
  onExploreRoutines,
  onStartIndependentWorkout,
  onStarted,
  onTokensChange,
  onViewHistory,
  routineService,
  tokens,
}: RoutinePickerProps): React.JSX.Element {
  const [routines, setRoutines] = useState<RoutineSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startingRoutineId, setStartingRoutineId] = useState<string | null>(null);
  const [deletingRoutineId, setDeletingRoutineId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isStartingIndependentWorkout, setIsStartingIndependentWorkout] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRoutinesExpanded, setIsRoutinesExpanded] = useState(true);

  const loadRoutines = async () => {
    try {
      const result = await routineService.list(tokens);
      setRoutines(result.routines);
      if (result.tokens.accessToken !== tokens.accessToken) {
        onTokensChange(result.tokens);
      }
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'No fue posible cargar las rutinas.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadRoutines();
  }, []);

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

  const createNewRoutine = async () => {
    setIsCreating(true);
    setError(null);
    try {
      const result = await routineService.create(tokens, 'Nueva rutina');
      if (result.tokens.accessToken !== tokens.accessToken) {
        onTokensChange(result.tokens);
      }
      onEditRoutine(result.routine.id);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'No fue posible crear la rutina.');
    } finally {
      setIsCreating(false);
    }
  };

  const startIndependentWorkout = async () => {
    setIsStartingIndependentWorkout(true);
    setError(null);
    try {
      await onStartIndependentWorkout();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'No fue posible iniciar el entrenamiento.');
      setIsStartingIndependentWorkout(false);
    }
  };

  const deleteRoutine = (routineId: string, routineName: string) => {
    Alert.alert(
      'Eliminar rutina',
      `¿Estás seguro de que deseas eliminar "${routineName}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setDeletingRoutineId(routineId);
            try {
              const result = await routineService.delete(tokens, routineId);
              setRoutines((current) => current.filter((r) => r.id !== routineId));
              if (result.tokens.accessToken !== tokens.accessToken) {
                onTokensChange(result.tokens);
              }
            } catch (requestError) {
              setError(requestError instanceof ApiError ? requestError.message : 'No fue posible eliminar la rutina.');
            } finally {
              setDeletingRoutineId(null);
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {/* Top Header Bar - No arrow icon, no PRO badge, history icon connected */}
      <View style={styles.topBar}>
        <Text style={styles.title}>Entrenamiento</Text>

        <View style={styles.topRightActions}>
          <AnimatedPressable onPress={onViewHistory} style={styles.iconButton}>
            <MaterialIcons name="history" size={24} color={colors.text} />
          </AnimatedPressable>
        </View>
      </View>

      {/* Start Empty Workout Primary Card */}
      <AnimatedPressable
        accessibilityRole="button"
        disabled={isStartingIndependentWorkout}
        onPress={() => { void startIndependentWorkout(); }}
        style={styles.emptyWorkoutButton}
      >
        <MaterialIcons name="add" size={24} color={colors.text} />
        <Text style={styles.emptyWorkoutText}>
          {isStartingIndependentWorkout ? 'Iniciando...' : 'Iniciar rutina vacía'}
        </Text>
      </AnimatedPressable>

      {/* Routines Section Header - Folder icon present without action for now */}
      <View style={styles.routinesSectionHeader}>
        <Text style={styles.sectionTitle}>Rutinas</Text>
        <View style={styles.folderIconBtn}>
          <MaterialIcons name="folder" size={22} color={colors.muted} />
        </View>
      </View>

      {/* Quick Routine Actions (Nueva rutina / Explorar) filling full horizontal width */}
      <View style={styles.quickActionsRow}>
        <AnimatedPressable
          accessibilityRole="button"
          disabled={isCreating}
          onPress={() => { void createNewRoutine(); }}
          style={styles.quickActionButton}
        >
          <MaterialIcons name="assignment" size={20} color={colors.text} />
          <Text style={styles.quickActionText}>
            {isCreating ? 'Creando...' : 'Nueva rutina'}
          </Text>
        </AnimatedPressable>

        <AnimatedPressable
          accessibilityRole="button"
          onPress={onExploreRoutines}
          style={styles.quickActionButton}
        >
          <MaterialIcons name="search" size={20} color={colors.text} />
          <Text style={styles.quickActionText}>Explorar</Text>
        </AnimatedPressable>
      </View>

      {/* Accordion Subheader */}
      <AnimatedPressable
        onPress={() => setIsRoutinesExpanded(!isRoutinesExpanded)}
        style={styles.accordionHeader}
      >
        <MaterialIcons
          name={isRoutinesExpanded ? 'arrow-drop-down' : 'arrow-right'}
          size={24}
          color={colors.muted}
        />
        <Text style={styles.accordionTitle}>
          Mis rutinas ({routines.length})
        </Text>
      </AnimatedPressable>

      {/* Routine Cards List with Delete Routine option */}
      {isRoutinesExpanded && (
        <View style={styles.routinesList}>
          {isLoading && <ActivityIndicator color={colors.accentAlt} style={{ marginVertical: 10 }} />}
          {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          {!isLoading && routines.length === 0 && (
            <Text style={styles.emptyState}>Aún no tienes rutinas.</Text>
          )}
          {routines.map((routine) => (
            <View key={routine.id} style={styles.routineCard}>
              <View style={styles.routineCardHeader}>
                <Text style={styles.routineName}>{routine.name}</Text>
                <View style={styles.cardHeaderActions}>
                  <AnimatedPressable
                    disabled={deletingRoutineId === routine.id}
                    onPress={() => onEditRoutine(routine.id)}
                    style={styles.cardIconAction}
                  >
                    <MaterialIcons name="edit" size={20} color={colors.muted} />
                  </AnimatedPressable>
                  <AnimatedPressable
                    disabled={deletingRoutineId === routine.id}
                    onPress={() => deleteRoutine(routine.id, routine.name)}
                    style={styles.cardIconAction}
                  >
                    <MaterialIcons name="delete-outline" size={20} color={colors.danger} />
                  </AnimatedPressable>
                </View>
              </View>

              <Text numberOfLines={2} style={styles.routineExerciseSummary}>
                {routine.exerciseCount > 0
                  ? `${routine.exerciseCount} ejercicios registrados`
                  : 'Sin ejercicios asignados todavía'}
              </Text>

              <AnimatedPressable
                accessibilityRole="button"
                disabled={startingRoutineId !== null || deletingRoutineId === routine.id}
                onPress={() => { void startRoutine(routine); }}
                style={styles.startRoutineBtn}
              >
                <Text style={styles.startRoutineBtnText}>
                  {startingRoutineId === routine.id
                    ? 'Iniciando...'
                    : deletingRoutineId === routine.id
                    ? 'Eliminando...'
                    : 'Iniciar rutina'}
                </Text>
              </AnimatedPressable>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  accordionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing(0.5),
    marginTop: spacing(1),
  },
  accordionTitle: {
    color: colors.muted,
    fontSize: typography.body,
    fontWeight: '600',
  },
  cardHeaderActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing(1),
  },
  cardIconAction: {
    padding: spacing(0.5),
  },
  container: {
    gap: spacing(1.5),
    padding: spacing(2.5),
    paddingBottom: spacing(4),
  },
  emptyState: {
    color: colors.muted,
    fontSize: typography.body,
    paddingVertical: spacing(1),
  },
  emptyWorkoutButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing(1.5),
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(2),
  },
  emptyWorkoutText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '600',
  },
  error: {
    color: colors.danger,
  },
  folderIconBtn: {
    opacity: 0.6,
    padding: spacing(0.5),
  },
  iconButton: {
    backgroundColor: colors.surface,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 999,
    borderWidth: 1,
    padding: spacing(1),
  },
  quickActionButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: spacing(1),
    height: 56,
    justifyContent: 'center',
    paddingHorizontal: spacing(1),
  },
  quickActionText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '600',
    textAlign: 'center',
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: spacing(1.25),
    width: '100%',
  },
  routineCard: {
    backgroundColor: colors.surface,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 18,
    borderWidth: 1,
    gap: spacing(1.25),
    padding: spacing(2),
  },
  routineCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  routineExerciseSummary: {
    color: colors.muted,
    fontSize: typography.body,
    lineHeight: 22,
  },
  routineName: {
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: '700',
  },
  routinesList: {
    gap: spacing(1.5),
  },
  routinesSectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing(1),
  },
  scroll: {
    backgroundColor: colors.background,
    flex: 1,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.h2,
    fontWeight: '700',
  },
  startRoutineBtn: {
    alignItems: 'center',
    backgroundColor: colors.accentAlt,
    borderRadius: 12,
    marginTop: spacing(0.5),
    paddingVertical: spacing(1.5),
  },
  startRoutineBtnText: {
    color: '#ffffff',
    fontSize: typography.body,
    fontWeight: '700',
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
  topRightActions: {
    alignItems: 'center',
    flexDirection: 'row',
  },
});
