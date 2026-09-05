import React, { useEffect, useState } from 'react';
import { Plus, Timer, Square, CheckSquare, Trophy, X, Flame, Trash2 } from 'lucide-react';
import { api, type ActiveWorkout, type ExerciseSummary, type Tokens } from '../api/api';

interface ActiveWorkoutViewProps {
  tokens: Tokens;
  workout: ActiveWorkout;
  onFinished: () => void;
}

interface PrevSetData {
  setNumber: number;
  weight: number | null;
  repetitions: number | null;
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

  // Previous performance map: exerciseId -> array of previous sets (FR-WORK-004)
  const [prevPerformanceMap, setPrevPerformanceMap] = useState<Record<string, PrevSetData[]>>({});

  // Add exercise modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [allExercises, setAllExercises] = useState<ExerciseSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [completing, setCompleting] = useState(false);

  // Workout duration timer
  useEffect(() => {
    const startMs = new Date(workout.startedAt).getTime();
    const interval = setInterval(() => {
      const now = Date.now();
      setElapsedSeconds(Math.floor((now - startMs) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [workout.startedAt]);

  // Rest countdown timer
  useEffect(() => {
    if (!isRestTimerActive || restSecondsLeft === null) return;
    if (restSecondsLeft <= 0) {
      setIsRestTimerActive(false);
      setRestSecondsLeft(null);
      return;
    }
    const timer = setInterval(() => {
      setRestSecondsLeft((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isRestTimerActive, restSecondsLeft]);

  // Load previous workout performance (FR-WORK-004)
  useEffect(() => {
    const fetchPreviousPerformance = async () => {
      try {
        const history = await api.listWorkoutHistory(tokens.accessToken);
        if (!history || history.length === 0) return;

        const perfMap: Record<string, PrevSetData[]> = {};

        // Fetch detail for recent workouts to find previous performance for exercises
        for (const entry of history.slice(0, 5)) {
          const detail = await api.getWorkout(tokens.accessToken, entry.id);
          if (detail && detail.exercises) {
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
        }
        setPrevPerformanceMap(perfMap);
      } catch {
        // Silently ignore if previous history can't be fetched
      }
    };

    fetchPreviousPerformance();
  }, [tokens]);

  const startRestTimer = (seconds: number = 90) => {
    setRestSecondsLeft(seconds);
    setIsRestTimerActive(true);
  };

  const handleToggleSet = async (exerciseId: string, setId: string, currentlyCompleted: boolean) => {
    const targetExercise = workout.exercises.find((e) => e.id === exerciseId);
    const targetSet = targetExercise?.sets.find((s) => s.id === setId);
    if (!targetSet) return;

    const nextCompleted = !currentlyCompleted;

    try {
      const updatedSet = await api.recordWorkoutSet(tokens.accessToken, workout.id, exerciseId, setId, {
        isCompleted: nextCompleted,
        weight: targetSet.weight ?? 0,
        repetitions: targetSet.repetitions ?? 0,
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
        startRestTimer(90);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al registrar serie.');
    }
  };

  const handleUpdateSetField = async (exerciseId: string, setId: string, field: 'weight' | 'repetitions', val: string) => {
    const numVal = val === '' ? null : Number(val);
    if (numVal !== null && isNaN(numVal)) return;

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
        [field]: numVal ?? 0,
      });
    } catch {
      // Ignore
    }
  };

  const handleAddSetToExercise = async (exerciseId: string) => {
    const targetExercise = workout.exercises.find((e) => e.id === exerciseId);
    const lastSet = targetExercise?.sets[targetExercise.sets.length - 1];

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
      alert(err instanceof Error ? err.message : 'Error al añadir serie.');
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
          // Renumber sets sequentially
          return {
            ...ex,
            sets: remaining.map((s, idx) => ({ ...s, setNumber: idx + 1 })),
          };
        }),
      }));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al eliminar serie.');
    }
  };

  const handleDeleteExercise = async (exerciseId: string, exerciseName: string) => {
    if (!window.confirm(`¿Quitar "${exerciseName}" del entrenamiento actual?`)) return;
    try {
      await api.deleteWorkoutExercise(tokens.accessToken, workout.id, exerciseId);
      setWorkout((prev) => ({
        ...prev,
        exercises: prev.exercises
          .filter((ex) => ex.id !== exerciseId)
          .map((ex, idx) => ({ ...ex, position: idx + 1 })),
      }));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al quitar ejercicio.');
    }
  };

  const handleFinishWorkout = async () => {
    if (!window.confirm('¿Deseas finalizar y guardar este entrenamiento?')) return;
    setCompleting(true);
    try {
      await api.finishWorkout(tokens.accessToken, workout.id, 'complete');
      onFinished();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al finalizar entrenamiento.');
      setCompleting(false);
    }
  };

  const handleCancelWorkout = async () => {
    if (!window.confirm('¿Seguro que deseas cancelar el entrenamiento? Se descartarán los cambios no guardados.')) return;
    try {
      await api.finishWorkout(tokens.accessToken, workout.id, 'cancel');
      onFinished();
    } catch {
      onFinished();
    }
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
      alert(err instanceof Error ? err.message : 'Error al añadir ejercicio al entrenamiento.');
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
    ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ex.targetMuscleGroups.some((m) => m.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div style={styles.container}>
      {/* Top Header Card */}
      <div style={styles.topCard}>
        <div>
          <span style={styles.eyebrow}>ENTRENAMIENTO EN CURSO</span>
          <h1 style={styles.workoutName}>Sesión Activa</h1>
        </div>

        <div style={styles.topRight}>
          <div style={styles.timerBadge}>
            <Timer size={20} color="var(--accent-teal)" />
            <span style={styles.timerText}>{formatElapsed(elapsedSeconds)}</span>
          </div>

          <button
            style={styles.finishBtn}
            onClick={handleFinishWorkout}
            disabled={completing}
          >
            <Trophy size={18} />
            <span>{completing ? 'Guardando...' : 'Finalizar'}</span>
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

      {/* Rest Banner */}
      {isRestTimerActive && restSecondsLeft !== null && (
        <div style={styles.restBanner}>
          <div style={styles.restLeft}>
            <Timer size={24} color="var(--accent-teal)" />
            <div>
              <div style={styles.restTitle}>TIEMPO DE DESCANSO</div>
              <div style={styles.restTime}>
                {Math.floor(restSecondsLeft / 60)}:{(restSecondsLeft % 60) < 10 ? '0' : ''}{restSecondsLeft % 60}
              </div>
            </div>
          </div>
          <div style={styles.restControls}>
            <button style={styles.restBtn} onClick={() => setRestSecondsLeft((r) => (r !== null ? r + 30 : 30))}>+30s</button>
            <button style={styles.restBtnDismiss} onClick={() => setIsRestTimerActive(false)}>Omitir</button>
          </div>
        </div>
      )}

      {/* Exercises List */}
      <div style={styles.exercisesList}>
        {workout.exercises.map((exItem) => {
          const prevSets = prevPerformanceMap[exItem.exercise.id] || [];

          return (
            <div key={exItem.id} style={styles.exerciseCard}>
              <div style={styles.exHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <h3 style={styles.exName}>{exItem.position}. {exItem.exercise.name}</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={styles.restInfoBadge}>Descanso recomendado: 90s</span>
                  <button
                    style={styles.deleteExIconBtn}
                    onClick={() => handleDeleteExercise(exItem.id, exItem.exercise.name)}
                    title="Quitar ejercicio"
                  >
                    <Trash2 size={16} color="#ef4444" />
                  </button>
                </div>
              </div>

              {/* Set Table with Previous Performance (FR-WORK-004) and Delete Set */}
              <div style={styles.setTable}>
                <div style={styles.tableHeader}>
                  <span>Serie</span>
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

                  return (
                    <div
                      key={set.id}
                      style={{
                        ...styles.tableRow,
                        ...(set.isCompleted ? styles.tableRowCompleted : {}),
                      }}
                    >
                      <span style={styles.setNumber}>#{set.setNumber}</span>

                      {/* Previous Performance Column (FR-WORK-004) */}
                      <span style={styles.prevPerfCell} title={hasPrev ? 'Rendimiento en la última sesión' : 'Sin registro previo'}>
                        {prevDisplay}
                      </span>

                      <input
                        type="number"
                        min="0"
                        placeholder={prevSet?.weight != null ? String(prevSet.weight) : '0'}
                        defaultValue={set.weight ?? ''}
                        onBlur={(e) => handleUpdateSetField(exItem.id, set.id, 'weight', e.target.value)}
                        style={styles.setCellInput}
                      />

                      <input
                        type="number"
                        min="0"
                        placeholder={prevSet?.repetitions != null ? String(prevSet.repetitions) : '0'}
                        defaultValue={set.repetitions ?? ''}
                        onBlur={(e) => handleUpdateSetField(exItem.id, set.id, 'repetitions', e.target.value)}
                        style={styles.setCellInput}
                      />

                      <button
                        style={{ ...styles.checkBtn, ...(set.isCompleted ? styles.checkBtnCompleted : {}) }}
                        onClick={() => handleToggleSet(exItem.id, set.id, set.isCompleted)}
                        title={set.isCompleted ? 'Desmarcar serie' : 'Completar serie'}
                      >
                        {set.isCompleted ? <CheckSquare size={20} color="#ffffff" /> : <Square size={20} color="var(--text-muted)" />}
                      </button>

                      <button
                        style={styles.trashSetBtn}
                        onClick={() => handleDeleteSet(exItem.id, set.id)}
                        title="Eliminar serie"
                      >
                        <Trash2 size={15} color="#ef4444" />
                      </button>
                    </div>
                  );
                })}

                <button style={styles.addSetBtn} onClick={() => handleAddSetToExercise(exItem.id)}>
                  <Plus size={16} />
                  <span>Añadir serie</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Extra Exercise Button */}
      <button style={styles.addExBtn} onClick={openAddModal}>
        <Plus size={20} />
        <span>Añadir ejercicio al entrenamiento</span>
      </button>

      {/* Add Exercise Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Añadir ejercicio</h2>
              <button style={styles.modalCloseBtn} onClick={() => setIsAddModalOpen(false)}>✕</button>
            </div>

            <input
              type="text"
              placeholder="Buscar ejercicio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.modalSearchInput}
            />

            <div style={styles.modalExList}>
              {filteredAddExercises.map((ex) => (
                <div key={ex.id} style={styles.modalExItem} onClick={() => handleAddExerciseToWorkout(ex.id)}>
                  <div>
                    <div style={styles.modalExName}>{ex.name}</div>
                    <div style={styles.modalExMuscle}>{ex.targetMuscleGroups.join(', ')}</div>
                  </div>
                  <Plus size={18} color="var(--accent-teal)" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    padding: '2.5rem 3rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
    boxSizing: 'border-box',
  },
  topCard: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: '20px',
    padding: '2rem 2.25rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    boxSizing: 'border-box',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  eyebrow: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: 'var(--accent-teal)',
    letterSpacing: '1px',
  },
  workoutName: {
    fontSize: '1.6rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    marginTop: '0.25rem',
  },
  topRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  timerBadge: {
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '0.5rem 1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  timerText: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  finishBtn: {
    backgroundColor: 'var(--accent-teal)',
    color: '#000000',
    padding: '0.65rem 1.25rem',
    borderRadius: '12px',
    fontWeight: 700,
    fontSize: '0.95rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  cancelBtn: {
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-muted)',
    padding: '0.65rem',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  restBanner: {
    backgroundColor: 'rgba(34, 240, 197, 0.12)',
    border: '1px solid rgba(34, 240, 197, 0.25)',
    borderRadius: '14px',
    padding: '1rem 1.25rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  restLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  restTitle: {
    fontSize: '0.75rem',
    color: 'var(--accent-teal)',
    fontWeight: 700,
    letterSpacing: '0.5px',
  },
  restTime: {
    fontSize: '1.35rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
  },
  restControls: {
    display: 'flex',
    gap: '0.5rem',
  },
  restBtn: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    padding: '0.4rem 0.75rem',
    borderRadius: '8px',
    fontSize: '0.85rem',
    fontWeight: 600,
  },
  restBtnDismiss: {
    backgroundColor: 'transparent',
    color: 'var(--text-muted)',
    padding: '0.4rem 0.75rem',
    fontSize: '0.85rem',
  },
  exercisesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  exerciseCard: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: '18px',
    padding: '1.25rem 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  exHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '0.5rem',
  },
  exName: {
    fontSize: '1.15rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  restInfoBadge: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    padding: '0.25rem 0.6rem',
    borderRadius: '6px',
  },
  deleteExIconBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '0.25rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.8,
  },
  setTable: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '45px 110px 1fr 1fr 45px 36px',
    gap: '0.65rem',
    fontSize: '0.78rem',
    fontWeight: 700,
    color: 'var(--text-muted)',
    padding: '0 0.5rem',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '45px 110px 1fr 1fr 45px 36px',
    gap: '0.65rem',
    alignItems: 'center',
    backgroundColor: 'var(--input-bg)',
    padding: '0.5rem',
    borderRadius: '12px',
    border: '1px solid var(--border-color)',
    transition: 'background-color 0.15s ease, border-color 0.15s ease',
  },
  trashSetBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '0.35rem',
    opacity: 0.75,
    borderRadius: '6px',
  },
  tableRowCompleted: {
    backgroundColor: 'rgba(34, 240, 197, 0.08)',
    borderColor: 'rgba(34, 240, 197, 0.25)',
  },
  setNumber: {
    fontWeight: 700,
    color: 'var(--text-muted)',
    paddingLeft: '0.35rem',
    fontSize: '0.9rem',
  },
  prevPerfCell: {
    fontSize: '0.82rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    backgroundColor: 'var(--surface-color)',
    padding: '0.35rem 0.5rem',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  setCellInput: {
    padding: '0.45rem 0.65rem',
    fontSize: '0.92rem',
    borderRadius: '8px',
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    textAlign: 'center',
  },
  checkBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.45rem',
    borderRadius: '8px',
    backgroundColor: 'transparent',
    cursor: 'pointer',
  },
  checkBtnCompleted: {
    backgroundColor: 'var(--accent-teal)',
    borderRadius: '8px',
    color: '#000000',
  },
  addSetBtn: {
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    color: 'var(--accent-teal)',
    padding: '0.55rem',
    borderRadius: '10px',
    fontWeight: 600,
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.35rem',
    marginTop: '0.25rem',
    cursor: 'pointer',
  },
  addExBtn: {
    backgroundColor: 'var(--surface-color)',
    border: '1px dashed var(--border-color)',
    color: 'var(--accent-teal)',
    padding: '1rem',
    borderRadius: '16px',
    fontWeight: 700,
    fontSize: '0.95rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1rem',
  },
  modalTitle: {
    fontSize: '1.2rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
  },
  modalCloseBtn: {
    padding: '0.35rem',
    fontSize: '1.1rem',
    color: 'var(--text-muted)',
    cursor: 'pointer',
  },
  modalSearchInput: {
    width: '100%',
    marginBottom: '1rem',
    boxSizing: 'border-box',
    padding: '0.75rem 1rem',
    borderRadius: '12px',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
  },
  modalExList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    maxHeight: '350px',
    overflowY: 'auto',
  },
  modalExItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    padding: '0.75rem 1rem',
    borderRadius: '12px',
    cursor: 'pointer',
  },
  modalExName: {
    fontWeight: 700,
    fontSize: '0.92rem',
    color: 'var(--text-primary)',
  },
  modalExMuscle: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginTop: '0.15rem',
  },
};
