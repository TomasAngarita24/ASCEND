import React, { useEffect, useState } from 'react';
import {
  Plus,
  Timer,
  Check,
  Trophy,
  X,
  Trash2,
  ChevronRight,
  Search,
  Volume2,
  VolumeX,
  ChevronUp,
  ChevronDown,
  Dumbbell,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError, OfflineQueuedError, type ActiveWorkout, type ExerciseSummary, type Tokens } from '../api/api';
import { ConfirmModal } from '../components/ConfirmModal';
import { matchesSearch } from '../utils/text';
import { soundManager } from '../utils/audio';
import { roundOneRepMax } from '../utils/oneRepMax';
import type { WorkoutSummaryData } from '../components/WorkoutSummaryModal';

interface ActiveWorkoutViewProps {
  tokens: Tokens;
  workout: ActiveWorkout;
  onFinished: (summary?: WorkoutSummaryData) => void;
}

interface PrevSetData {
  setNumber: number;
  weight: number | null;
  repetitions: number | null;
}

interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  variant: 'danger' | 'warning';
  onConfirm: () => void;
}

export const ActiveWorkoutView: React.FC<ActiveWorkoutViewProps> = ({
  tokens,
  workout: initialWorkout,
  onFinished,
}) => {
  const [workout, setWorkout] = useState<ActiveWorkout>(initialWorkout);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Rest Timer State
  const [restSecondsLeft, setRestSecondsLeft] = useState<number | null>(null);
  const [isRestTimerActive, setIsRestTimerActive] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Previous performance map: exerciseId -> array of previous sets (FR-WORK-004)
  const [prevPerformanceMap, setPrevPerformanceMap] = useState<Record<string, PrevSetData[]>>({});

  // Baseline Personal Records map: exerciseId -> { maxWeight, max1RM }
  const [baselinePRMap, setBaselinePRMap] = useState<Record<string, { maxWeight: number; max1RM: number }>>({});

  // Add exercise modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [allExercises, setAllExercises] = useState<ExerciseSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [completing, setCompleting] = useState(false);

  // Guards against double-firing async mutate actions (fast double-clicks)
  const [togglingSetIds, setTogglingSetIds] = useState<Set<string>>(() => new Set());
  const [addingSetExerciseIds, setAddingSetExerciseIds] = useState<Set<string>>(() => new Set());
  const [addingExerciseId, setAddingExerciseId] = useState<string | null>(null);

  // Confirm modal state (replaces window.confirm)
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'Confirmar',
    variant: 'danger',
    onConfirm: () => {},
  });

  const showConfirm = (cfg: Omit<ConfirmState, 'isOpen'>) => {
    setConfirmState({ ...cfg, isOpen: true });
  };
  const closeConfirm = () => setConfirmState((s) => ({ ...s, isOpen: false }));

  // Workout duration timer
  useEffect(() => {
    const startMs = new Date(workout.startedAt).getTime();
    const interval = setInterval(() => {
      const now = Date.now();
      setElapsedSeconds(Math.floor((now - startMs) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [workout.startedAt]);

  // Rest countdown timer with Web Audio chime notification
  useEffect(() => {
    if (!isRestTimerActive || restSecondsLeft === null) return;
    if (restSecondsLeft <= 0) {
      setIsRestTimerActive(false);
      setRestSecondsLeft(null);
      if (soundEnabled) {
        soundManager.playRestFinishedChime();
      }
      toast.info('⏰ ¡Tiempo de descanso completado! A por la siguiente serie.');
      return;
    }
    const timer = setInterval(() => {
      setRestSecondsLeft((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isRestTimerActive, restSecondsLeft, soundEnabled]);

  // Load previous workout performance
  useEffect(() => {
    const fetchPreviousPerformance = async () => {
      try {
        const history = await api.listWorkoutHistory(tokens.accessToken);
        if (!history || history.length === 0) return;

        // Fetch recent workout details in parallel
        const recentIds = history.slice(0, 5).map((e) => e.id);
        const details = await Promise.all(
          recentIds.map((id) => api.getWorkout(tokens.accessToken, id).catch(() => null))
        );

        const perfMap: Record<string, PrevSetData[]> = {};
        for (const detail of details) {
          if (!detail?.exercises) continue;
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
      } catch {
        // Silently ignore
      }
    };

    fetchPreviousPerformance();
  }, [tokens]);

  // Load all-time Personal Records (PR) baseline for all exercises in current workout
  const exerciseIdsKey = workout.exercises.map((e) => e.exercise.id).join(',');

  useEffect(() => {
    const fetchBaselines = async () => {
      const map: Record<string, { maxWeight: number; max1RM: number }> = {};
      await Promise.all(
        workout.exercises.map(async (wex) => {
          const rawId = wex.exercise?.id;
          if (!rawId) return;
          try {
            const prog = await api.getExerciseProgression(tokens.accessToken, rawId);
            if (prog && Array.isArray(prog.data) && prog.data.length > 0) {
              let maxW = 0;
              let max1 = 0;
              for (const pt of prog.data) {
                if (pt.weight !== null && pt.weight !== undefined && pt.weight > maxW) {
                  maxW = pt.weight;
                }
                if (pt.estimatedOneRepMax !== null && pt.estimatedOneRepMax !== undefined && pt.estimatedOneRepMax > max1) {
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
  }, [tokens, exerciseIdsKey]);

  const checkIsPR = (exerciseId: string, weight: number | null, reps: number | null) => {
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
  };

  const startRestTimer = (seconds: number = 90) => {
    setRestSecondsLeft(seconds);
    setIsRestTimerActive(true);
  };

  const handleToggleSet = async (exerciseId: string, setId: string, currentlyCompleted: boolean) => {
    if (togglingSetIds.has(setId)) return;
    const targetExercise = workout.exercises.find((e) => e.id === exerciseId);
    const targetSet = targetExercise?.sets.find((s) => s.id === setId);
    if (!targetSet) return;

    const nextCompleted = !currentlyCompleted;
    setTogglingSetIds((prev) => new Set(prev).add(setId));

    try {
      // Only flip the completion flag. Sending weight/repetitions here would either
      // persist phantom zeros (weight 0) or be rejected (repetitions 0) when the
      // user taps complete before typing values.
      const updatedSet = await api.recordWorkoutSet(tokens.accessToken, workout.id, exerciseId, setId, {
        isCompleted: nextCompleted,
      });

      setWorkout((prev) => ({
        ...prev,
        exercises: prev.exercises.map((ex) => (
          ex.id === exerciseId
            ? {
                ...ex,
                sets: ex.sets.map((s) => (s.id === setId ? updatedSet : s)),
              }
            : ex
        )),
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

        startRestTimer(90);
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
  };

  const handleUpdateSetField = async (exerciseId: string, setId: string, field: 'weight' | 'repetitions', val: string) => {
    const numVal = val === '' ? null : Number(val);
    if (numVal !== null && isNaN(numVal)) return;

    const prevSet = workout.exercises
      .find((e) => e.id === exerciseId)
      ?.sets.find((s) => s.id === setId);

    setWorkout((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex) => (
        ex.id === exerciseId
          ? {
              ...ex,
              sets: ex.sets.map((s) => (s.id === setId ? { ...s, [field]: numVal } : s)),
            }
          : ex
      )),
    }));

    try {
      await api.recordWorkoutSet(tokens.accessToken, workout.id, exerciseId, setId, {
        [field]: numVal,
      });
    } catch (err: unknown) {
      // Roll back the optimistic value and surface the failure instead of
      // silently keeping a value that never reached the server.
      setWorkout((prev) => ({
        ...prev,
        exercises: prev.exercises.map((ex) =>
          ex.id === exerciseId
            ? {
                ...ex,
                sets: ex.sets.map((s) =>
                  s.id === setId && prevSet ? { ...s, [field]: prevSet[field] } : s,
                ),
              }
            : ex,
        ),
      }));
      toast.error(err instanceof OfflineQueuedError ? err.message : `No se pudo guardar: ${err instanceof Error ? err.message : 'error inesperado.'}`);
    }
  };

  const handleAddSetToExercise = async (exerciseId: string) => {
    if (addingSetExerciseIds.has(exerciseId)) return;
    const targetExercise = workout.exercises.find((e) => e.id === exerciseId);
    const lastSet = targetExercise?.sets[targetExercise.sets.length - 1];
    setAddingSetExerciseIds((prev) => new Set(prev).add(exerciseId));

    try {
      const newSet = await api.createWorkoutSet(tokens.accessToken, workout.id, exerciseId, {
        weight: lastSet?.weight ?? 0,
        repetitions: lastSet?.repetitions ?? 10,
        setType: 'normal',
      });

      setWorkout((prev) => ({
        ...prev,
        exercises: prev.exercises.map((ex) => (
          ex.id === exerciseId
            ? { ...ex, sets: [...ex.sets, newSet] }
            : ex
        )),
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
  };

  const handleDeleteSet = async (exerciseId: string, setId: string) => {
    try {
      await api.deleteWorkoutSet(tokens.accessToken, workout.id, exerciseId, setId);
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
  };

  const handleMoveExercise = async (currentIndex: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= workout.exercises.length) return;

    const reordered = [...workout.exercises];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    const updated = reordered.map((ex, idx) => ({ ...ex, position: idx + 1 }));
    setWorkout((prev) => ({ ...prev, exercises: updated }));

    try {
      await api.reorderWorkoutExercises(
        tokens.accessToken,
        workout.id,
        updated.map((e) => e.id)
      );
    } catch {
      // Revert if failed
      setWorkout((prev) => ({ ...prev, exercises: workout.exercises }));
      toast.error('Error al reordenar los ejercicios');
    }
  };

  const handleCycleSetType = async (exerciseId: string, setId: string, currentType?: string) => {
    const cycle: Record<string, 'normal' | 'warmup' | 'drop' | 'failure'> = {
      normal: 'warmup',
      warmup: 'drop',
      drop: 'failure',
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

    try {
      await api.recordWorkoutSet(tokens.accessToken, workout.id, exerciseId, setId, {
        setType: nextType,
      } as Parameters<typeof api.recordWorkoutSet>[4]);
    } catch {
      // Background / offline will sync
    }
  };

  const handleDeleteExercise = (exerciseId: string, exerciseName: string) => {
    showConfirm({
      title: 'Quitar ejercicio',
      message: `¿Quitar "${exerciseName}" del entrenamiento actual?`,
      confirmLabel: 'Quitar',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await api.deleteWorkoutExercise(tokens.accessToken, workout.id, exerciseId);
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
  };


  // Fallback for createSet responses that never reached the UI (lost network,
  // queued offline replays): before the workout is completed, delete any set
  // present on the server that the local session does not know about.
  const reconcileOrphanSets = async () => {
    try {
      const serverWorkout = await api.getWorkout(tokens.accessToken, workout.id);
      const localExerciseIds = new Set(workout.exercises.map((e) => e.id));
      const deletes: Promise<void>[] = [];
      for (const serverEx of serverWorkout.exercises) {
        if (!localExerciseIds.has(serverEx.id)) continue;
        const localEx = workout.exercises.find((e) => e.id === serverEx.id);
        const localSetIds = new Set((localEx?.sets ?? []).map((s) => s.id));
        for (const serverSet of serverEx.sets) {
          if (!localSetIds.has(serverSet.id)) {
            deletes.push(api.deleteWorkoutSet(tokens.accessToken, workout.id, serverEx.id, serverSet.id));
          }
        }
      }
      await Promise.all(deletes);
    } catch {
      // Best-effort cleanup: never block finishing the workout on it.
    }
  };

  const handleFinishWorkout = () => {
    showConfirm({
      title: 'Finalizar entrenamiento',
      message: '¿Deseas finalizar y guardar esta sesión?',
      confirmLabel: 'Finalizar',
      variant: 'warning',
      onConfirm: async () => {
        setCompleting(true);
        try {
          await reconcileOrphanSets();
          await api.finishWorkout(tokens.accessToken, workout.id, 'complete');

          // Compute summary metrics
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
  };

  const handleCancelWorkout = () => {
    showConfirm({
      title: 'Cancelar sesión',
      message: '¿Seguro que deseas cancelar el entrenamiento? Se descartarán los cambios no guardados.',
      confirmLabel: 'Cancelar sesión',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await api.finishWorkout(tokens.accessToken, workout.id, 'cancel');
          onFinished();
        } catch (err: unknown) {
          if (err instanceof ApiError) {
            // A real server rejection (e.g. already completed) — keep the local
            // session and let the user decide, instead of discarding silently.
            toast.error(err instanceof Error ? err.message : 'Error al cancelar la sesión.');
          } else {
            // Network failure: the mutation was enqueued for offline sync and will
            // cancel server-side; safe to close the local session.
            onFinished();
          }
        }
      },
    });
  };

  const openAddModal = async () => {
    setIsAddModalOpen(true);
    try {
      const list = await api.listExercises(tokens.accessToken);
      setAllExercises(list);
    } catch {
      // Ignore
    }
  };

  const handleAddExerciseToWorkout = async (exerciseId: string) => {
    if (addingExerciseId !== null) return;
    setAddingExerciseId(exerciseId);
    try {
      const addedExercise = await api.addExerciseToWorkout(tokens.accessToken, workout.id, exerciseId);
      const initialSet = await api.createWorkoutSet(tokens.accessToken, workout.id, addedExercise.id, {
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
  };

  const formatElapsed = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const filteredAddExercises = allExercises.filter((ex) =>
    matchesSearch(ex.name, searchQuery) ||
    ex.targetMuscleGroups.some((m) => matchesSearch(m, searchQuery))
  );

  return (
    <div style={styles.container}>
      {/* Top Header Card */}
      <div style={styles.topCard}>
        <div>
          <div style={styles.eyebrowWrap}>
            <span style={styles.livePulseDot} />
            <span style={styles.eyebrow}>SESIÓN EN CURSO</span>
          </div>
          <h1 style={styles.workoutName}>Entrenamiento Activo</h1>
        </div>

        <div style={styles.topRight}>
          <div style={styles.timerBadge}>
            <Timer size={18} color="var(--accent-teal)" />
            <span style={styles.timerText}>{formatElapsed(elapsedSeconds)}</span>
          </div>

          <button
            style={styles.finishBtn}
            onClick={handleFinishWorkout}
            disabled={completing}
          >
            <Trophy size={16} />
            <span>{completing ? 'Guardando...' : 'Finalizar sesión'}</span>
          </button>

          <button
            style={styles.cancelBtn}
            onClick={handleCancelWorkout}
            title="Descartar sesión"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Rest Countdown Bar Widget */}
      {isRestTimerActive && restSecondsLeft !== null && (
        <div style={styles.restBanner}>
          <div style={styles.restLeft}>
            <div style={styles.restIconRing}>
              <Timer size={20} color="var(--accent-teal)" />
            </div>
            <div>
              <div style={styles.restTitle}>TIEMPO DE DESCANSO</div>
              <div style={styles.restTime}>
                {Math.floor(restSecondsLeft / 60)}:{(restSecondsLeft % 60) < 10 ? '0' : ''}{restSecondsLeft % 60}
              </div>
            </div>
          </div>
          <div style={styles.restControls}>
            <button
              style={styles.restBtnMute}
              onClick={() => setSoundEnabled((v) => !v)}
              title={soundEnabled ? 'Aviso sonoro activado (clic para silenciar)' : 'Aviso sonoro silenciado (clic para activar)'}
            >
              {soundEnabled ? (
                <Volume2 size={16} color="var(--accent-teal)" />
              ) : (
                <VolumeX size={16} color="var(--text-muted)" />
              )}
            </button>
            <button style={styles.restBtn} onClick={() => setRestSecondsLeft((r) => (r !== null ? r + 30 : 30))}>
              +30s
            </button>
            <button style={styles.restBtnDismiss} onClick={() => setIsRestTimerActive(false)}>
              Omitir
            </button>
          </div>
        </div>
      )}

      {/* Exercises List */}
      <div style={styles.exercisesList}>
        {workout.exercises.map((exItem, exIdx) => {
          const prevSets = prevPerformanceMap[exItem.exercise.id] || [];

          return (
            <div key={exItem.id} style={styles.exerciseCard}>
<div style={styles.exHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  {/* Exercise thumbnail */}
                  {exItem.exercise.mediaUrl ? (
                    <img
                      src={exItem.exercise.mediaUrl}
                      alt=""
                      style={styles.exThumb}
                      loading="lazy"
                      onError={(e) => { const img = e.currentTarget; img.style.display = 'none'; }}
                    />
                  ) : (
                    <div style={styles.exThumbFallback}>
                      <Dumbbell size={18} strokeWidth={1.5} color="var(--text-dim)" />
                    </div>
                  )}
                  {/* Reordering Controls */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                    <button
                      style={{
                        ...styles.reorderBtn,
                        opacity: exIdx === 0 ? 0.3 : 1,
                        cursor: exIdx === 0 ? 'default' : 'pointer',
                      }}
                      onClick={() => handleMoveExercise(exIdx, 'up')}
                      disabled={exIdx === 0}
                      title="Mover arriba"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      style={{
                        ...styles.reorderBtn,
                        opacity: exIdx === workout.exercises.length - 1 ? 0.3 : 1,
                        cursor: exIdx === workout.exercises.length - 1 ? 'default' : 'pointer',
                      }}
                      onClick={() => handleMoveExercise(exIdx, 'down')}
                      disabled={exIdx === workout.exercises.length - 1}
                      title="Mover abajo"
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>

                  <div style={styles.exNumberBadge}>{exItem.position}</div>
                  <h3 style={styles.exName}>{exItem.exercise.name}</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={styles.restInfoBadge}>Descanso: 90s</span>
                  <button
                    style={styles.deleteExIconBtn}
                    onClick={() => handleDeleteExercise(exItem.id, exItem.exercise.name)}
                    title="Quitar ejercicio"
                  >
                    <Trash2 size={16} color="var(--text-dim)" />
                  </button>
                </div>
              </div>

              {/* Set Table */}
              <div style={styles.setTable}>
                <div className="aw-set-table" style={styles.tableHeader}>
                  <span>Serie / Tipo</span>
                  <span>Anterior</span>
                  <span>Peso (kg)</span>
                  <span>Reps</span>
                  <span style={{ textAlign: 'center' }}>Listo</span>
                  <span style={{ textAlign: 'center' }}></span>
                </div>

                {exItem.sets.map((set, setIdx) => {
                  const prevSet = prevSets.find((s) => s.setNumber === set.setNumber) || prevSets[setIdx];
                  const hasPrev = prevSet && (prevSet.weight !== null || prevSet.repetitions !== null);
                  const prevDisplay = hasPrev
                    ? `${prevSet.weight ?? 0} kg × ${prevSet.repetitions ?? 0}`
                    : '—';

                  const rawExId = exItem.exercise?.id;
                  const prInfo = checkIsPR(rawExId, set.weight, set.repetitions);
                  const setType = set.setType || 'normal';

                  // Styling for setType
                  const setTypeConfig: Record<string, { label: string; color: string; bg: string; title: string }> = {
                    normal: { label: `${set.setNumber}`, color: 'var(--text-primary)', bg: 'transparent', title: 'Serie Normal (clic para cambiar a Calentamiento)' },
                    warmup: { label: 'W', color: 'var(--accent-teal)', bg: 'rgba(192, 138, 90, 0.15)', title: 'Calentamiento (W) - no cuenta en series pesadas (clic para Drop set)' },
                    drop: { label: 'D', color: '#C0C2C6', bg: 'rgba(192, 194, 198, 0.15)', title: 'Drop Set (D) - serie descendente (clic para Fallo)' },
                    failure: { label: 'F', color: 'var(--danger-color)', bg: 'rgba(192, 105, 105, 0.15)', title: 'Fallo muscular (F) - RPE 10 (clic para Normal)' },
                  };
                  const currentConfig = setTypeConfig[setType] || setTypeConfig.normal;

                  return (
                    <div
                      key={set.id}
                      className="aw-set-table"
                      style={{
                        ...styles.tableRow,
                        ...(set.isCompleted ? styles.tableRowCompleted : {}),
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <button
                          type="button"
                          onClick={() => handleCycleSetType(exItem.id, set.id, setType)}
                          style={{
                            ...styles.setTypeBtn,
                            color: currentConfig.color,
                            backgroundColor: currentConfig.bg,
                          }}
                          title={currentConfig.title}
                        >
                          {currentConfig.label}
                        </button>
                        {prInfo.isPR && (
                          <span style={styles.prBadge} title={prInfo.reason}>
                            <Trophy size={11} color="var(--accent-gold)" />
                            <span>PR</span>
                          </span>
                        )}
                      </div>

                      {/* Previous Performance Column */}
                      <span style={styles.prevSetText}>{prevDisplay}</span>

                      {/* Weight Input */}
                      <div className="aw-set-cell">
                        <input
                          type="number"
                          step="0.5"
                          placeholder={prevSet?.weight?.toString() || '0'}
                          value={set.weight === null ? '' : set.weight}
                          onChange={(e) => handleUpdateSetField(exItem.id, set.id, 'weight', e.target.value)}
                          style={{
                            ...styles.inputField,
                            ...(set.isCompleted ? styles.inputFieldCompleted : {}),
                          }}
                        />
                      </div>

                      {/* Reps Input */}
                      <div className="aw-set-cell">
                        <input
                          type="number"
                          placeholder={prevSet?.repetitions?.toString() || '10'}
                          value={set.repetitions === null ? '' : set.repetitions}
                          onChange={(e) => handleUpdateSetField(exItem.id, set.id, 'repetitions', e.target.value)}
                          style={{
                            ...styles.inputField,
                            ...(set.isCompleted ? styles.inputFieldCompleted : {}),
                          }}
                        />
                      </div>

                      {/* Completion Checkbox Button */}
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <button
                          style={{
                            ...styles.checkBtn,
                            ...(set.isCompleted ? styles.checkBtnCompleted : styles.checkBtnPending),
                          }}
                          onClick={() => handleToggleSet(exItem.id, set.id, set.isCompleted)}
                        >
                          <Check size={16} strokeWidth={3} />
                        </button>
                      </div>

                      {/* Delete Set Button */}
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        {exItem.sets.length > 1 && (
                          <button
                            style={styles.deleteSetBtn}
                            onClick={() => handleDeleteSet(exItem.id, set.id)}
                            title="Eliminar serie"
                          >
                            <Trash2 size={15} color="var(--text-dim)" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Set Button */}
              <button
                style={styles.addSetBtn}
                onClick={() => handleAddSetToExercise(exItem.id)}
              >
                <Plus size={16} />
                <span>Agregar serie</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Add Exercise Floating / Bottom Button */}
      <button style={styles.addExerciseMainBtn} onClick={openAddModal}>
        <div style={styles.addIconCircle}>
          <Plus size={18} color="var(--bg-color)" />
        </div>
        <span>Agregar Ejercicio a la Sesión</span>
      </button>

      {/* Add Exercise Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Agregar Ejercicio</h2>
              <button style={styles.closeBtn} onClick={() => setIsAddModalOpen(false)}>
                <X size={20} color="var(--text-muted)" />
              </button>
            </div>

            <div style={styles.modalSearchWrapper}>
              <Search size={18} color="var(--text-muted)" style={styles.modalSearchIcon} />
              <input
                type="text"
                placeholder="Buscar ejercicio..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.modalSearchInput}
                autoFocus
              />
            </div>

            <div style={styles.modalExList}>
              {filteredAddExercises.map((ex) => (
                <div
                  key={ex.id}
                  style={styles.modalExItem}
                  onClick={() => handleAddExerciseToWorkout(ex.id)}
                >
                  {ex.mediaUrl ? (
                    <img src={ex.mediaUrl} alt="" style={styles.modalExThumb} loading="lazy" />
                  ) : (
                    <div style={styles.modalExThumbFallback}>
                      <Dumbbell size={18} strokeWidth={1.5} color="var(--text-dim)" />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={styles.modalExName}>{ex.name}</h4>
                    <div style={styles.modalExTags}>
                      {ex.targetMuscleGroups.map((m) => (
                        <span key={m} style={styles.modalTagM}>{m}</span>
                      ))}
                      {ex.equipment && (
                        <span style={styles.modalTagE}>{ex.equipment}</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={18} color="var(--text-muted)" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal (replaces window.confirm) */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        variant={confirmState.variant}
        onConfirm={() => { confirmState.onConfirm(); closeConfirm(); }}
        onCancel={closeConfirm}
      />
    </div>
  );
};


const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: 'clamp(1.5rem, 4vw, 2.5rem) clamp(1rem, 5vw, 3rem)',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.75rem',
    maxWidth: '1100px',
    margin: '0 auto',
    boxSizing: 'border-box',
  },
  topCard: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-container)',
    padding: '1.75rem 2.25rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '1rem',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
  },
  eyebrowWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.45rem',
    marginBottom: '0.2rem',
  },
  livePulseDot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent-teal)',
  },
  eyebrow: {
    fontSize: '0.72rem',
    fontWeight: 800,
    color: 'var(--accent-teal)',
    letterSpacing: '0.08em',
  },
  workoutName: {
    fontSize: '2rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    letterSpacing: '-0.03em',
  },
  topRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  timerBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    padding: '0.65rem 1rem',
    borderRadius: 'var(--radius-container)',
  },
  timerText: {
    fontSize: '1.15rem',
    fontWeight: 800,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-primary)',
  },
  finishBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: 'var(--accent-teal)',
    color: 'var(--bg-color)',
    padding: '0.7rem 1.25rem',
    borderRadius: 'var(--radius-container)',
    fontWeight: 800,
    fontSize: '0.9rem',
    
  },
  cancelBtn: {
    padding: '0.7rem',
    borderRadius: 'var(--radius-container)',
    backgroundColor: 'rgba(192, 105, 105, 0.12)',
    border: '1px solid rgba(192, 105, 105, 0.25)',
    color: 'var(--danger-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  restBanner: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-highlight)',
    borderRadius: 'var(--radius-container)',
    padding: '1.1rem 1.75rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    
  },
  restLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  restIconRing: {
    width: '42px',
    height: '42px',
    borderRadius: 'var(--radius-container)',
    backgroundColor: 'rgba(192, 138, 90, 0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  restTitle: {
    fontSize: '0.72rem',
    fontWeight: 800,
    color: 'var(--accent-teal)',
    letterSpacing: '0.06em',
  },
  restTime: {
    fontSize: '1.4rem',
    fontWeight: 800,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-primary)',
  },
  restControls: {
    display: 'flex',
    gap: '0.65rem',
  },
  restBtn: {
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    padding: '0.5rem 0.9rem',
    borderRadius: 'var(--radius-control)',
    fontWeight: 700,
    fontSize: '0.85rem',
  },
  restBtnMute: {
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    padding: '0.45rem 0.65rem',
    borderRadius: 'var(--radius-control)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  restBtnDismiss: {
    backgroundColor: 'transparent',
    color: 'var(--text-muted)',
    padding: '0.5rem 0.9rem',
    borderRadius: 'var(--radius-control)',
    fontWeight: 600,
    fontSize: '0.85rem',
  },
  exercisesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  exerciseCard: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-container)',
    padding: 'clamp(1rem, 3vw, 1.5rem) clamp(0.9rem, 3vw, 1.75rem)',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
  },
  exHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '0.5rem',
  },
  exNumberBadge: {
    width: '28px',
    height: '28px',
    borderRadius: 'var(--radius-element)',
    backgroundColor: 'rgba(192, 138, 90, 0.12)',
    color: 'var(--accent-teal)',
    fontSize: '0.85rem',
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  exThumb: {
    width: '42px',
    height: '42px',
    borderRadius: 'var(--radius-element)',
    objectFit: 'cover',
    flexShrink: 0,
    border: '1px solid var(--border-color)',
  },
  exThumbFallback: {
    width: '42px',
    height: '42px',
    borderRadius: 'var(--radius-element)',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  exName: {
    fontSize: '1.2rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
  },
  restInfoBadge: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    backgroundColor: 'var(--input-bg)',
    padding: '0.25rem 0.65rem',
    borderRadius: '6px',
    fontWeight: 600,
  },
  deleteExIconBtn: {
    padding: '0.45rem',
    borderRadius: 'var(--radius-element)',
    backgroundColor: 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  setTable: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.45rem',
  },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '56px minmax(0, 1.2fr) minmax(0, 1.1fr) minmax(0, 1.1fr) 50px 32px',
    padding: '0.4rem 0.75rem',
    fontSize: '0.72rem',
    fontWeight: 800,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '56px minmax(0, 1.2fr) minmax(0, 1.1fr) minmax(0, 1.1fr) 50px 32px',
    alignItems: 'center',
    padding: '0.45rem 0.75rem',
    borderRadius: 'var(--radius-container)',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-subtle)',
    transition: 'all 0.18s ease',
  },
  tableRowCompleted: {
    backgroundColor: 'rgba(76, 175, 125, 0.1)',
    borderColor: 'rgba(76, 175, 125, 0.25)',
  },
  setNumber: {
    fontSize: '0.88rem',
    fontWeight: 800,
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
  },
  prBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '2px',
    padding: '1px 5px',
    borderRadius: '6px',
    backgroundColor: 'rgba(192, 138, 90, 0.15)',
    border: '1px solid rgba(192, 138, 90, 0.45)',
    color: 'var(--accent-gold)',
    fontSize: '0.68rem',
    fontWeight: 800,
    letterSpacing: '0.02em',
    userSelect: 'none',
  },
  reorderBtn: {
    background: 'none',
    border: 'none',
    padding: '1px',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
    transition: 'color 0.15s ease',
  },
  setTypeBtn: {
    minWidth: '26px',
    height: '24px',
    borderRadius: '6px',
    border: '1px solid var(--border-color)',
    fontSize: '0.78rem',
    fontWeight: 800,
    fontFamily: 'var(--font-mono)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 4px',
    transition: 'all 0.15s ease',
  },
  prevSetText: {
    fontSize: '0.82rem',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    minWidth: 0,
  },
  inputField: {
    width: '100%',
    minWidth: 0,
    padding: '0.45rem 0.5rem',
    borderRadius: 'var(--radius-element)',
    fontSize: '0.92rem',
    fontWeight: 700,
    textAlign: 'center',
    boxSizing: 'border-box',
  },
  inputFieldCompleted: {
    color: 'var(--accent-green)',
  },
  checkBtn: {
    width: '34px',
    height: '34px',
    borderRadius: 'var(--radius-control)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  checkBtnPending: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-dim)',
  },
  checkBtnCompleted: {
    backgroundColor: 'var(--accent-green)',
    color: 'var(--bg-color)',
  },
  deleteSetBtn: {
    padding: '0.35rem',
    borderRadius: '6px',
    backgroundColor: 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSetBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.45rem',
    padding: '0.65rem',
    borderRadius: 'var(--radius-container)',
    backgroundColor: 'var(--input-bg)',
    border: '1px dashed var(--border-color)',
    color: 'var(--text-secondary)',
    fontSize: '0.85rem',
    fontWeight: 700,
    marginTop: '0.25rem',
  },
  addExerciseMainBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    padding: '1rem',
    borderRadius: 'var(--radius-container)',
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    fontWeight: 800,
    fontSize: '1rem',
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
  },
  addIconCircle: {
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent-teal)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1.25rem',
  },
  modalTitle: {
    fontSize: '1.3rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
  },
  closeBtn: {
    padding: '0.25rem',
  },
  modalSearchWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  modalSearchIcon: {
    position: 'absolute',
    left: '12px',
  },
  modalSearchInput: {
    width: '100%',
    paddingLeft: '2.5rem',
  },
  modalExList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    maxHeight: '380px',
    overflowY: 'auto',
  },
  modalExItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.75rem',
    padding: '0.85rem 1rem',
    borderRadius: 'var(--radius-container)',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  modalExThumb: {
    width: '44px',
    height: '44px',
    borderRadius: 'var(--radius-element)',
    objectFit: 'cover',
    flexShrink: 0,
    border: '1px solid var(--border-color)',
  },
  modalExThumbFallback: {
    width: '44px',
    height: '44px',
    borderRadius: 'var(--radius-element)',
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  modalExName: {
    fontSize: '0.92rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: '0.25rem',
  },
  modalExTags: {
    display: 'flex',
    gap: '0.35rem',
  },
  modalTagM: {
    fontSize: '0.7rem',
    backgroundColor: 'rgba(76, 175, 125, 0.15)',
    color: 'var(--accent-green)',
    padding: '0.1rem 0.4rem',
    borderRadius: '4px',
    fontWeight: 600,
  },
  modalTagE: {
    fontSize: '0.7rem',
    backgroundColor: 'rgba(192, 194, 198, 0.14)',
    color: '#C0C2C6',
    padding: '0.1rem 0.4rem',
    borderRadius: '4px',
    fontWeight: 600,
  },
};
