import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  api,
  ApiError,
  OfflineQueuedError,
  type ActiveWorkout,
  type ExerciseSummary,
} from '../api/api';
import { soundManager } from '../utils/audio';
import { roundOneRepMax } from '../utils/oneRepMax';
import { sumSetsByExercise } from '../utils/coaching';
import type { WorkoutSummaryData } from '../components/WorkoutSummaryModal';
import type { PrevSetData } from '../components/workout/ExerciseSetRow';

interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  variant: 'danger' | 'warning';
  onConfirm: () => void;
}

export const useWorkoutSession = (
  initialWorkout: ActiveWorkout,
  onFinished: (summary?: WorkoutSummaryData) => void,
  startRestTimer: (seconds?: number) => void,
  soundEnabled: boolean,
  elapsedSeconds: number
) => {
  const [workout, setWorkout] = useState<ActiveWorkout>(initialWorkout);
  const [prevPerformanceMap, setPrevPerformanceMap] = useState<Record<string, PrevSetData[]>>({});
  const [recentSetsByExercise, setRecentSetsByExercise] = useState<Record<string, number>>({});
  const [baselinePRMap, setBaselinePRMap] = useState<Record<string, { maxWeight: number; max1RM: number }>>({});

  // Add exercise modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [allExercises, setAllExercises] = useState<ExerciseSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [completing, setCompleting] = useState(false);

  // Guards against double-firing async actions
  const [togglingSetIds, setTogglingSetIds] = useState<Set<string>>(() => new Set());
  const [addingSetExerciseIds, setAddingSetExerciseIds] = useState<Set<string>>(() => new Set());
  const [addingExerciseId, setAddingExerciseId] = useState<string | null>(null);

  // Confirm modal state
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'Confirmar',
    variant: 'danger',
    onConfirm: () => {},
  });

  const showConfirm = useCallback((cfg: Omit<ConfirmState, 'isOpen'>) => {
    setConfirmState({ ...cfg, isOpen: true });
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmState((s) => ({ ...s, isOpen: false }));
  }, []);

  // Load previous workout performance + weekly volume for deload detection
  useEffect(() => {
    const fetchPreviousPerformance = async () => {
      try {
        const history = await api.listWorkoutHistory();
        if (!history || history.length === 0) return;

        const recentIds = history.slice(0, 10).map((e) => e.id);
        const details = await Promise.all(
          recentIds.map((id) => api.getWorkout(id).catch(() => null))
        );

        const perfMap: Record<string, PrevSetData[]> = {};
        const weekStart = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const recentWorkouts: Array<{ exercises: ActiveWorkout['exercises'] }> = [];

        for (const detail of details) {
          if (!detail?.exercises) continue;
          const startedAt = new Date(detail.startedAt).getTime();
          if (startedAt >= weekStart) {
            recentWorkouts.push({ exercises: detail.exercises });
          }
          for (const wex of detail.exercises) {
            const exId = wex.exercise?.id;
            if (exId && !perfMap[exId] && wex.sets && wex.sets.length > 0) {
              const recordedSets = wex.sets
                .filter((s) => s.isCompleted || s.weight !== null || s.repetitions !== null)
                .map((s) => ({
                  setNumber: s.setNumber,
                  weight: s.weight,
                  repetitions: s.repetitions,
                }));
              if (recordedSets.length > 0) {
                perfMap[exId] = recordedSets;
              }
            }
          }
        }
        setPrevPerformanceMap(perfMap);
        setRecentSetsByExercise(sumSetsByExercise(recentWorkouts));
      } catch {
        // Silently ignore
      }
    };

    fetchPreviousPerformance();
  }, []);

  // Load baseline Personal Records (PR)
  const exerciseIdsKey = workout.exercises.map((e) => e.exercise.id).join(',');

  useEffect(() => {
    const fetchBaselines = async () => {
      const map: Record<string, { maxWeight: number; max1RM: number }> = {};
      await Promise.all(
        workout.exercises.map(async (wex) => {
          const rawId = wex.exercise?.id;
          if (!rawId) return;
          try {
            const prog = await api.getExerciseProgression(rawId);
            if (prog && Array.isArray(prog.data) && prog.data.length > 0) {
              let maxW = 0;
              let max1 = 0;
              for (const pt of prog.data) {
                if (pt.weight !== null && pt.weight !== undefined && pt.weight > maxW) {
                  maxW = pt.weight;
                }
                if (
                  pt.estimatedOneRepMax !== null &&
                  pt.estimatedOneRepMax !== undefined &&
                  pt.estimatedOneRepMax > max1
                ) {
                  max1 = pt.estimatedOneRepMax;
                }
              }
              map[rawId] = { maxWeight: maxW, max1RM: max1 };
            } else {
              map[rawId] = { maxWeight: 0, max1RM: 0 };
            }
          } catch {
            map[rawId] = { maxWeight: 0, max1RM: 0 };
          }
        })
      );
      setBaselinePRMap((prev) => ({ ...prev, ...map }));
    };

    if (workout.exercises.length > 0) {
      fetchBaselines();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseIdsKey]);

  const checkIsPR = useCallback(
    (exerciseId: string, weight: number | null, reps: number | null) => {
      if (!weight || !reps || weight <= 0 || reps <= 0) return { isPR: false, reason: '', est1RM: 0 };
      const baseline = baselinePRMap[exerciseId];
      const est1RM = roundOneRepMax(weight, reps);

      if (!baseline || (baseline.maxWeight === 0 && baseline.max1RM === 0)) {
        return { isPR: false, reason: '', est1RM };
      }

      if (weight > baseline.maxWeight && baseline.maxWeight > 0) {
        return {
          isPR: true,
          reason: `¡Superaste tu récord de peso de ${baseline.maxWeight} kg!`,
          est1RM,
        };
      }

      if (est1RM > baseline.max1RM && baseline.max1RM > 0) {
        return {
          isPR: true,
          reason: `¡Nuevo 1RM récord de ${est1RM} kg (anterior: ${baseline.max1RM} kg)!`,
          est1RM,
        };
      }

      return { isPR: false, reason: '', est1RM };
    },
    [baselinePRMap]
  );

  const handleToggleSet = useCallback(
    async (exerciseId: string, setId: string, currentlyCompleted: boolean) => {
      if (togglingSetIds.has(setId)) return;
      const targetExercise = workout.exercises.find((e) => e.id === exerciseId);
      const targetSet = targetExercise?.sets.find((s) => s.id === setId);
      if (!targetSet) return;

      const nextCompleted = !currentlyCompleted;
      setTogglingSetIds((prev) => new Set(prev).add(setId));

      try {
        const updatedSet = await api.recordWorkoutSet(workout.id, exerciseId, setId, {
          isCompleted: nextCompleted,
        });

        setWorkout((prev) => ({
          ...prev,
          exercises: prev.exercises.map((ex) =>
            ex.id === exerciseId
              ? {
                  ...ex,
                  sets: ex.sets.map((s) => (s.id === setId ? updatedSet : s)),
                }
              : ex
          ),
        }));

        if (nextCompleted) {
          const rawExId = targetExercise?.exercise.id || exerciseId;
          const exName = targetExercise?.exercise.name || 'Ejercicio';
          const prCheck = checkIsPR(rawExId, targetSet.weight, targetSet.repetitions);

          if (prCheck.isPR) {
            if (soundEnabled) {
              soundManager.playPRCelebrationFanfare();
            }
            toast.success(`🏆 ¡NUEVO RÉCORD PERSONAL!`, {
              description: `${exName}: ${targetSet.weight} kg × ${targetSet.repetitions} reps. ${prCheck.reason}`,
              duration: 5000,
            });
          }

          startRestTimer(targetExercise?.restSeconds ?? 90);
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Error al registrar serie.');
      } finally {
        setTogglingSetIds((prev) => {
          const next = new Set(prev);
          next.delete(setId);
          return next;
        });
      }
    },
    [togglingSetIds, workout.exercises, workout.id, checkIsPR, soundEnabled, startRestTimer]
  );

  const handleUpdateSetField = useCallback(
    async (exerciseId: string, setId: string, field: 'weight' | 'repetitions', val: string) => {
      const numVal = val === '' ? null : Number(val);
      if (numVal !== null && isNaN(numVal)) return;

      const prevSet = workout.exercises
        .find((e) => e.id === exerciseId)
        ?.sets.find((s) => s.id === setId);

      setWorkout((prev) => ({
        ...prev,
        exercises: prev.exercises.map((ex) =>
          ex.id === exerciseId
            ? {
                ...ex,
                sets: ex.sets.map((s) => (s.id === setId ? { ...s, [field]: numVal } : s)),
              }
            : ex
        ),
      }));

      try {
        await api.recordWorkoutSet(workout.id, exerciseId, setId, {
          [field]: numVal,
        });
      } catch (err: unknown) {
        setWorkout((prev) => ({
          ...prev,
          exercises: prev.exercises.map((ex) =>
            ex.id === exerciseId
              ? {
                  ...ex,
                  sets: ex.sets.map((s) =>
                    s.id === setId && prevSet ? { ...s, [field]: prevSet[field] } : s
                  ),
                }
              : ex
          ),
        }));
        toast.error(
          err instanceof OfflineQueuedError
            ? err.message
            : `No se pudo guardar: ${err instanceof Error ? err.message : 'error inesperado.'}`
        );
      }
    },
    [workout.exercises, workout.id]
  );

  const handleAddSetToExercise = useCallback(
    async (exerciseId: string) => {
      if (addingSetExerciseIds.has(exerciseId)) return;
      const targetExercise = workout.exercises.find((e) => e.id === exerciseId);
      const lastSet = targetExercise?.sets[targetExercise.sets.length - 1];
      setAddingSetExerciseIds((prev) => new Set(prev).add(exerciseId));

      try {
        const newSet = await api.createWorkoutSet(workout.id, exerciseId, {
          weight: lastSet?.weight ?? 0,
          repetitions: lastSet?.repetitions ?? 10,
          setType: 'normal',
        });

        setWorkout((prev) => ({
          ...prev,
          exercises: prev.exercises.map((ex) =>
            ex.id === exerciseId ? { ...ex, sets: [...ex.sets, newSet] } : ex
          ),
        }));
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Error al añadir serie.');
      } finally {
        setAddingSetExerciseIds((prev) => {
          const next = new Set(prev);
          next.delete(exerciseId);
          return next;
        });
      }
    },
    [addingSetExerciseIds, workout.exercises, workout.id]
  );

  const handleDeleteSet = useCallback(
    async (exerciseId: string, setId: string) => {
      try {
        await api.deleteWorkoutSet(workout.id, exerciseId, setId);
        setWorkout((prev) => ({
          ...prev,
          exercises: prev.exercises.map((ex) => {
            if (ex.id !== exerciseId) return ex;
            const remaining = ex.sets.filter((s) => s.id !== setId);
            return {
              ...ex,
              sets: remaining.map((s, idx) => ({ ...s, setNumber: idx + 1 })),
            };
          }),
        }));
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Error al eliminar serie.');
      }
    },
    [workout.id]
  );

  const handleMoveExercise = useCallback(
    async (currentIndex: number, direction: 'up' | 'down') => {
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= workout.exercises.length) return;

      const reordered = [...workout.exercises];
      const [moved] = reordered.splice(currentIndex, 1);
      reordered.splice(targetIndex, 0, moved);

      const updated = reordered.map((ex, idx) => ({ ...ex, position: idx + 1 }));
      setWorkout((prev) => ({ ...prev, exercises: updated }));

      try {
        await api.reorderWorkoutExercises(
          workout.id,
          updated.map((e) => e.id)
        );
      } catch {
        setWorkout((prev) => ({ ...prev, exercises: workout.exercises }));
        toast.error('Error al reordenar los ejercicios');
      }
    },
    [workout.exercises, workout.id]
  );

  const suggestDropWeight = (baseWeight: number): number => {
    const step = 2.5;
    return Math.max(2.5, Math.round((baseWeight * 0.7) / step) * step);
  };

  const applyDropSetWeight = useCallback(
    async (exerciseId: string, setId: string, weight: number, actionId: string) => {
      toast.dismiss(actionId);
      setWorkout((prev) => ({
        ...prev,
        exercises: prev.exercises.map((ex) =>
          ex.id === exerciseId
            ? { ...ex, sets: ex.sets.map((s) => (s.id === setId ? { ...s, weight } : s)) }
            : ex
        ),
      }));
      try {
        await api.recordWorkoutSet(workout.id, exerciseId, setId, { weight });
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Error al ajustar el peso de la serie.');
      }
    },
    [workout.id]
  );

  const handleCycleSetType = useCallback(
    async (exerciseId: string, setId: string, currentType?: string) => {
      const cycle: Record<string, 'normal' | 'warmup' | 'drop_set' | 'failure'> = {
        normal: 'warmup',
        warmup: 'drop_set',
        drop_set: 'failure',
        drop: 'drop_set',
        failure: 'normal',
      };
      const nextType = cycle[currentType || 'normal'] || 'normal';

      setWorkout((prev) => ({
        ...prev,
        exercises: prev.exercises.map((ex) =>
          ex.id === exerciseId
            ? {
                ...ex,
                sets: ex.sets.map((s) => (s.id === setId ? { ...s, setType: nextType } : s)),
              }
            : ex
        ),
      }));

      if (nextType === 'drop_set') {
        const exItem = workout.exercises.find((e) => e.id === exerciseId);
        const setItem = exItem?.sets.find((s) => s.id === setId);
        const base = setItem?.weight;
        if (base != null && base > 0) {
          const suggested = suggestDropWeight(base);
          if (suggested < base) {
            const actionId = `drop-suggest:${exerciseId}:${setId}`;
            toast(`💪 Drop set recomendado: ${suggested} kg`, {
              id: actionId,
              description: `Empieza en ${base} kg, baja a ${suggested} kg y encadena series sin descanso.`,
              action: {
                label: `Usar ${suggested} kg`,
                onClick: () => {
                  void applyDropSetWeight(exerciseId, setId, suggested, actionId);
                },
              },
            });
          }
        }
      }

      try {
        await api.recordWorkoutSet(workout.id, exerciseId, setId, {
          setType: nextType,
        } as Parameters<typeof api.recordWorkoutSet>[3]);
      } catch {
        // Synchronize in background
      }
    },
    [applyDropSetWeight, workout.exercises, workout.id]
  );

  const applyCoachingSuggestion = useCallback(
    async (exerciseId: string, weight: number) => {
      const exercise = workout.exercises.find((ex) => ex.id === exerciseId);
      const targetSet = exercise?.sets.find((s) => !s.isCompleted && (s.setType || 'normal') === 'normal');
      if (!exercise || !targetSet) return;

      setWorkout((prev) => ({
        ...prev,
        exercises: prev.exercises.map((ex) =>
          ex.id === exerciseId
            ? { ...ex, sets: ex.sets.map((s) => (s.id === targetSet.id ? { ...s, weight } : s)) }
            : ex
        ),
      }));
      try {
        await api.recordWorkoutSet(workout.id, exerciseId, targetSet.id, { weight });
        toast.info(`Peso de trabajo puesto en ${weight} kg.`);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Error al ajustar el peso sugerido.');
      }
    },
    [workout.exercises, workout.id]
  );

  const handleDeleteExercise = useCallback(
    (exerciseId: string, exerciseName: string) => {
      showConfirm({
        title: 'Quitar ejercicio',
        message: `¿Quitar "${exerciseName}" del entrenamiento actual?`,
        confirmLabel: 'Quitar',
        variant: 'danger',
        onConfirm: async () => {
          try {
            await api.deleteWorkoutExercise(workout.id, exerciseId);
            setWorkout((prev) => ({
              ...prev,
              exercises: prev.exercises
                .filter((ex) => ex.id !== exerciseId)
                .map((ex, idx) => ({ ...ex, position: idx + 1 })),
            }));
          } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Error al quitar ejercicio.');
          }
        },
      });
    },
    [showConfirm, workout.id]
  );

  const reconcileOrphanSets = useCallback(async () => {
    try {
      const serverWorkout = await api.getWorkout(workout.id);
      const localExerciseIds = new Set(workout.exercises.map((e) => e.id));
      const deletes: Promise<void>[] = [];
      for (const serverEx of serverWorkout.exercises) {
        if (!localExerciseIds.has(serverEx.id)) continue;
        const localEx = workout.exercises.find((e) => e.id === serverEx.id);
        const localSetIds = new Set((localEx?.sets ?? []).map((s) => s.id));
        for (const serverSet of serverEx.sets) {
          if (!localSetIds.has(serverSet.id)) {
            deletes.push(api.deleteWorkoutSet(workout.id, serverEx.id, serverSet.id));
          }
        }
      }
      await Promise.all(deletes);
    } catch {
      // Best-effort cleanup
    }
  }, [workout.exercises, workout.id]);

  const handleFinishWorkout = useCallback(() => {
    showConfirm({
      title: 'Finalizar entrenamiento',
      message: '¿Deseas finalizar y guardar esta sesión?',
      confirmLabel: 'Finalizar',
      variant: 'warning',
      onConfirm: async () => {
        setCompleting(true);
        try {
          await reconcileOrphanSets();
          await api.finishWorkout(workout.id, 'complete');

          let totalVolume = 0;
          let totalReps = 0;
          let completedSetsCount = 0;
          const prsAchieved: WorkoutSummaryData['prsAchieved'] = [];
          const exercisesSummary: WorkoutSummaryData['exercisesSummary'] = [];

          for (const ex of workout.exercises) {
            const rawExId = ex.exercise.id || ex.id;
            let exCompletedCount = 0;

            for (const s of ex.sets) {
              if (s.isCompleted) {
                completedSetsCount++;
                exCompletedCount++;
                const w = s.weight ?? 0;
                const r = s.repetitions ?? 0;
                totalVolume += w * r;
                totalReps += r;

                const pr = checkIsPR(rawExId, s.weight, s.repetitions);
                if (pr.isPR) {
                  prsAchieved.push({
                    exerciseName: ex.exercise.name,
                    weight: w,
                    repetitions: r,
                    reason: pr.reason,
                  });
                }
              }
            }

            if (exCompletedCount > 0) {
              exercisesSummary.push({
                name: ex.exercise.name,
                setsCompleted: exCompletedCount,
              });
            }
          }

          const summary: WorkoutSummaryData = {
            workoutId: workout.id,
            durationSeconds: elapsedSeconds,
            totalVolume,
            completedSetsCount,
            totalReps,
            prsAchieved,
            exercisesSummary,
          };

          onFinished(summary);
        } catch (err: unknown) {
          toast.error(err instanceof Error ? err.message : 'Error al finalizar entrenamiento.');
          setCompleting(false);
        }
      },
    });
  }, [showConfirm, reconcileOrphanSets, workout.id, workout.exercises, elapsedSeconds, onFinished, checkIsPR]);

  const handleCancelWorkout = useCallback(() => {
    showConfirm({
      title: 'Cancelar sesión',
      message: '¿Seguro que deseas cancelar el entrenamiento? Se descartarán los cambios no guardados.',
      confirmLabel: 'Cancelar sesión',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await api.finishWorkout(workout.id, 'cancel');
          onFinished();
        } catch (err: unknown) {
          if (err instanceof ApiError) {
            toast.error(err instanceof Error ? err.message : 'Error al cancelar la sesión.');
          } else {
            onFinished();
          }
        }
      },
    });
  }, [showConfirm, workout.id, onFinished]);

  const openAddModal = useCallback(async () => {
    setIsAddModalOpen(true);
    try {
      const list = await api.listExercises();
      setAllExercises(list);
    } catch {
      // Ignore
    }
  }, []);

  const handleAddExerciseToWorkout = useCallback(
    async (exerciseId: string) => {
      if (addingExerciseId !== null) return;
      setAddingExerciseId(exerciseId);
      try {
        const addedExercise = await api.addExerciseToWorkout(workout.id, exerciseId);
        const initialSet = await api.createWorkoutSet(workout.id, addedExercise.id, {
          setType: 'normal',
          weight: 0,
          repetitions: 10,
        });

        setWorkout((prev) => ({
          ...prev,
          exercises: [
            ...prev.exercises,
            {
              ...addedExercise,
              sets: [initialSet],
            },
          ],
        }));
        setIsAddModalOpen(false);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Error al añadir ejercicio al entrenamiento.');
      } finally {
        setAddingExerciseId(null);
      }
    },
    [addingExerciseId, workout.id]
  );

  return {
    workout,
    prevPerformanceMap,
    recentSetsByExercise,
    isAddModalOpen,
    setIsAddModalOpen,
    allExercises,
    searchQuery,
    setSearchQuery,
    completing,
    confirmState,
    closeConfirm,
    checkIsPR,
    handleToggleSet,
    handleUpdateSetField,
    handleAddSetToExercise,
    handleDeleteSet,
    handleMoveExercise,
    handleCycleSetType,
    applyCoachingSuggestion,
    handleDeleteExercise,
    handleFinishWorkout,
    handleCancelWorkout,
    openAddModal,
    handleAddExerciseToWorkout,
  };
};
