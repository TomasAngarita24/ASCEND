import React, { useEffect, useRef, useState } from 'react';
import {
  History,
  Calendar,
  Clock,
  ChevronRight,
  X,
  Zap,
  Activity,
  Layers,
  Sparkles,
  Trash2,
  Edit3,
  Plus,
  FileText,
  Check,
  Share2,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, type WorkoutHistoryEntry, type WorkoutDetailEntry, type Tokens } from '../api/api';
import { ConfirmModal } from '../components/ConfirmModal';
import { roundOneRepMax } from '../utils/oneRepMax';

interface HistoryViewProps {
  tokens: Tokens;
}

interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  variant: 'danger' | 'warning';
  onConfirm: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ tokens }) => {
  const [workouts, setWorkouts] = useState<WorkoutHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [workoutDetail, setWorkoutDetail] = useState<WorkoutDetailEntry | null>(null);
  const workoutDetailRef = useRef<WorkoutDetailEntry | null>(null);
  useEffect(() => {
    workoutDetailRef.current = workoutDetail;
  }, [workoutDetail]);
  const [isEditing, setIsEditing] = useState(false);
  const [shareWorkoutId, setShareWorkoutId] = useState<string | null>(null);
  const [shareCaption, setShareCaption] = useState('');
  const [sharingWorkout, setSharingWorkout] = useState(false);

  const [confirmState, setConfirmState] = useState<ConfirmState>({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'Confirmar',
    variant: 'danger',
    onConfirm: () => {},
  });
  const showConfirm = (cfg: Omit<ConfirmState, 'isOpen'>) => setConfirmState({ ...cfg, isOpen: true });
  const closeConfirm = () => setConfirmState((s) => ({ ...s, isOpen: false }));

  useEffect(() => {
    const loadHistory = () => {
      setLoading(true);
      api.listWorkoutHistory(tokens.accessToken)
        .then(setWorkouts)
        .catch(() => {})
        .finally(() => setLoading(false));
    };

    loadHistory();
  }, [tokens]);

  const handleOpenDetail = async (workoutId: string) => {
    setSelectedWorkoutId(workoutId);
    setDetailLoading(true);
    setWorkoutDetail(null);
    try {
      const detail = await api.getWorkout(tokens.accessToken, workoutId);
      setWorkoutDetail(detail);
    } catch {
      toast.error('Error al cargar el detalle del entrenamiento.');
      setSelectedWorkoutId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseDetail = () => {
    setSelectedWorkoutId(null);
    setWorkoutDetail(null);
    setIsEditing(false);
  };

  const handlePublishShare = async () => {
    if (!shareWorkoutId || sharingWorkout) return;
    setSharingWorkout(true);
    try {
      await api.shareWorkout(tokens.accessToken, shareWorkoutId, shareCaption.trim());
      toast.success('Entrenamiento publicado en el feed social.');
      setShareWorkoutId(null);
      setShareCaption('');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'No se pudo compartir el entrenamiento.');
    } finally {
      setSharingWorkout(false);
    }
  };

  const handleDeleteWorkout = (workoutId: string, startedAt?: string) => {
    const dateLabel = startedAt ? formatDate(startedAt) : 'esta sesión';
    showConfirm({
      title: 'Eliminar entrenamiento',
      message: `¿Estás seguro de que deseas eliminar el entrenamiento del ${dateLabel}? Esta acción borrará todas sus series registradas de forma permanente.`,
      confirmLabel: 'Eliminar',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await api.deleteWorkout(tokens.accessToken, workoutId);
          setWorkouts((prev) => prev.filter((w) => w.id !== workoutId));
          if (selectedWorkoutId === workoutId) {
            handleCloseDetail();
          }
          toast.success('Entrenamiento eliminado del historial.');
        } catch {
          toast.error('No fue posible eliminar el entrenamiento.');
        }
      },
    });
  };

  const handleUpdateHistoricalSet = async (
    exerciseId: string,
    setId: string,
    fields: { weight?: number | null; repetitions?: number | null; notes?: string }
  ) => {
    if (!selectedWorkoutId) return;
    const detail = workoutDetailRef.current;
    if (!detail) return;

    const applyFields = (exercises: WorkoutDetailEntry['exercises']) =>
      exercises.map((ex) =>
        ex.id === exerciseId
          ? {
              ...ex,
              sets: ex.sets.map((s) => (s.id === setId ? { ...s, ...fields } : s)),
            }
          : ex,
      );

    const computeVolume = (exercises: WorkoutDetailEntry['exercises']) =>
      exercises
        .flatMap((e) => e.sets)
        .reduce((acc, s) => acc + (s.weight ?? 0) * (s.repetitions ?? 0), 0);

    const prevSet = detail.exercises
      .find((e) => e.id === exerciseId)
      ?.sets.find((s) => s.id === setId);
    const originalFields: { weight?: number | null; repetitions?: number | null; notes?: string } = {};
    if (fields.weight !== undefined) originalFields.weight = prevSet?.weight ?? null;
    if (fields.repetitions !== undefined) originalFields.repetitions = prevSet?.repetitions ?? null;
    if (fields.notes !== undefined) originalFields.notes = prevSet?.notes ?? '';

    const nextExercises = applyFields(detail.exercises);
    // Keep the ref fresh so a second rapid edit recomputes from the latest
    // state instead of a stale render closure.
    const nextDetail = { ...detail, exercises: nextExercises };
    workoutDetailRef.current = nextDetail;
    setWorkoutDetail(nextDetail);

    try {
      await api.recordWorkoutSet(tokens.accessToken, selectedWorkoutId, exerciseId, setId, {
        ...(fields.weight !== undefined ? { weight: fields.weight } : {}),
        ...(fields.repetitions !== undefined ? { repetitions: fields.repetitions } : {}),
        ...(fields.notes !== undefined ? { notes: fields.notes } : {}),
      });

      const newTotalVol = computeVolume(nextExercises);
      setWorkouts((prev) =>
        prev.map((w) => (w.id === selectedWorkoutId ? { ...w, totalVolume: newTotalVol } : w)),
      );
    } catch (err: unknown) {
      // Roll back the optimistic change that failed to persist.
      const current = workoutDetailRef.current ?? detail;
      const revertedExercises = current.exercises.map((ex) =>
        ex.id === exerciseId
          ? {
              ...ex,
              sets: ex.sets.map((s) => (s.id === setId ? { ...s, ...originalFields } : s)),
            }
          : ex,
      );
      const revertedDetail = { ...current, exercises: revertedExercises };
      workoutDetailRef.current = revertedDetail;
      setWorkoutDetail(revertedDetail);
      toast.error(err instanceof Error ? err.message : 'Error al actualizar la serie.');
    }
  };

  const handleDeleteHistoricalSet = async (exerciseId: string, setId: string) => {
    if (!selectedWorkoutId || !workoutDetail) return;
    try {
      await api.deleteWorkoutSet(tokens.accessToken, selectedWorkoutId, exerciseId, setId);
      setWorkoutDetail((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          exercises: prev.exercises.map((ex) => {
            if (ex.id !== exerciseId) return ex;
            const remaining = ex.sets.filter((s) => s.id !== setId);
            return {
              ...ex,
              sets: remaining.map((s, idx) => ({ ...s, setNumber: idx + 1 })),
            };
          }),
        };
      });
      toast.success('Serie eliminada.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar la serie.');
    }
  };

  const handleAddHistoricalSet = async (exerciseId: string) => {
    if (!selectedWorkoutId || !workoutDetail) return;
    const targetEx = workoutDetail.exercises.find((e) => e.id === exerciseId);
    const lastSet = targetEx?.sets[targetEx.sets.length - 1];

    try {
      const newSet = await api.createWorkoutSet(tokens.accessToken, selectedWorkoutId, exerciseId, {
        weight: lastSet?.weight ?? 0,
        repetitions: lastSet?.repetitions ?? 10,
        setType: 'normal',
      });
      setWorkoutDetail((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          exercises: prev.exercises.map((ex) => {
            if (ex.id !== exerciseId) return ex;
            return {
              ...ex,
              sets: [...ex.sets, newSet],
            };
          }),
        };
      });
      toast.success('Serie añadida.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al añadir la serie.');
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'Sin duración';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins} min`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const estimate1RM = (weight: number, reps: number) => {
    if (reps <= 0 || weight <= 0) return weight;
    return roundOneRepMax(weight, reps);
  };

  const selectedSummary = workouts.find((w) => w.id === selectedWorkoutId);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.headerHero}>
        <div>
          <h1 style={styles.title}>Historial de Entrenamientos</h1>
          <p style={styles.subtitle}>Inspecciona todas tus sesiones completadas, series registradas y marcas estimadas.</p>
        </div>
        <div style={styles.countBadge}>
          <Sparkles size={14} color="var(--accent-teal)" />
          <span>{workouts.length} entrenamientos</span>
        </div>
      </div>

      {loading ? (
        <div style={styles.loadingBox}>Cargando historial...</div>
      ) : workouts.length === 0 ? (
        <div style={styles.emptyCard}>
          <History size={44} color="var(--text-dim)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
            Aún no tienes sesiones registradas
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Completa tu primer entrenamiento para revisar el historial detallado de series y volumen.
          </p>
        </div>
      ) : (
        <div style={styles.list}>
          {workouts.map((item) => (
            <div
              key={item.id}
              style={styles.card}
              onClick={() => handleOpenDetail(item.id)}
            >
              <div style={styles.cardLeft}>
                <div style={styles.dateBadgeWrap}>
                  <Calendar size={18} color="var(--accent-teal)" />
                  <span style={styles.dateText}>{formatDate(item.startedAt)}</span>
                  <span style={styles.timeText}>• {formatTime(item.startedAt)}</span>
                </div>

                <div style={styles.metricsPillsRow}>
                  <div style={styles.pillItem}>
                    <Zap size={14} color="var(--accent-teal)" />
                    <span style={styles.pillValue}>{item.totalVolume.toLocaleString()} kg</span>
                    <span style={styles.pillLabel}>volumen</span>
                  </div>

                  <div style={styles.pillItem}>
                    <Activity size={14} color="var(--accent-green)" />
                    <span style={styles.pillValue}>{item.setsCompleted}</span>
                    <span style={styles.pillLabel}>series</span>
                  </div>

                  <div style={styles.pillItem}>
                    <Layers size={14} color="var(--accent-gold)" />
                    <span style={styles.pillValue}>{item.exerciseCount}</span>
                    <span style={styles.pillLabel}>ejercicios</span>
                  </div>

                  <div style={styles.pillItem}>
                    <Clock size={14} color="var(--text-muted)" />
                    <span style={styles.pillValue}>{formatDuration(item.durationSeconds)}</span>
                  </div>
                </div>
              </div>

              <div style={styles.cardRight}>
                <button
                  style={styles.shareCardBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShareWorkoutId(item.id);
                    setShareCaption('');
                  }}
                  title="Compartir en el feed social"
                >
                  <Share2 size={15} color="var(--accent-teal)" />
                  <span>Compartir</span>
                </button>
                <span style={styles.inspectText}>Ver detalle</span>
                <ChevronRight size={18} color="var(--accent-teal)" />
                <button
                  style={styles.deleteCardBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteWorkout(item.id, item.startedAt);
                  }}
                  title="Eliminar sesión del historial"
                >
                  <Trash2 size={16} color="var(--text-dim)" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Workout Detail Inspector Modal */}
      {selectedWorkoutId && (
        <div className="modal-overlay" onClick={handleCloseDetail}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '820px' }}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                  {selectedSummary ? formatDate(selectedSummary.startedAt) : 'Entrenamiento'}
                </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <button
                  style={isEditing ? styles.editDoneBtn : styles.editToggleBtn}
                  onClick={() => setIsEditing((v) => !v)}
                  title={isEditing ? 'Terminar edición' : 'Editar series, pesos y notas'}
                >
                  {isEditing ? <Check size={16} /> : <Edit3 size={15} />}
                  <span>{isEditing ? 'Listo' : 'Editar series'}</span>
                </button>
                <button
                  style={styles.deleteModalBtn}
                  onClick={() => handleDeleteWorkout(selectedWorkoutId!, selectedSummary?.startedAt)}
                  title="Eliminar este entrenamiento"
                >
                  <Trash2 size={16} color="var(--danger-color)" />
                </button>
                <button style={styles.closeBtn} onClick={handleCloseDetail}>
                  <X size={20} color="var(--text-muted)" />
                </button>
              </div>
            </div>

            {detailLoading ? (
              <div style={styles.modalLoading}>Cargando ejercicios y series...</div>
            ) : workoutDetail ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Workout Summary Bar */}
                <div style={styles.modalStatsBar}>
                  <div style={styles.modalStatCol}>
                    <span style={styles.modalStatVal}>{workoutDetail.exercises.length}</span>
                    <span style={styles.modalStatLabel}>Ejercicios</span>
                  </div>
                  <div style={styles.modalStatCol}>
                    <span style={styles.modalStatVal}>
                      {workoutDetail.exercises.reduce((acc, ex) => acc + ex.sets.length, 0)}
                    </span>
                    <span style={styles.modalStatLabel}>Series totales</span>
                  </div>
                  <div style={styles.modalStatCol}>
                    <span style={styles.modalStatVal}>
                      {workoutDetail.exercises
                        .flatMap((e) => e.sets)
                        .reduce((acc, s) => acc + (s.weight ?? 0) * (s.repetitions ?? 0), 0)
                        .toLocaleString()}{' '}
                      kg
                    </span>
                    <span style={styles.modalStatLabel}>Volumen total</span>
                  </div>
                </div>

                {/* Exercises & Sets Breakdown */}
                <div style={styles.detailExercisesList}>
                  {workoutDetail.exercises.map((exItem, idx) => (
                    <div key={exItem.id} style={styles.detailExCard}>
                      <div style={styles.detailExHeader}>
                        <div style={styles.detailIndexBadge}>{idx + 1}</div>
                        <h3 style={styles.detailExName}>{exItem.exercise.name}</h3>
                        <span style={styles.detailSetsCount}>{exItem.sets.length} series</span>
                      </div>

                      <div style={styles.detailTable}>
                        <div style={isEditing ? styles.detailTableHeaderEditing : styles.detailTableHeader}>
                          <span>Serie</span>
                          <span>Peso</span>
                          <span>Reps</span>
                          {isEditing ? (
                            <>
                              <span>Notas</span>
                              <span style={{ textAlign: 'center' }}>Quitar</span>
                            </>
                          ) : (
                            <>
                              <span>1RM Estimado</span>
                              <span>Notas / Estado</span>
                            </>
                          )}
                        </div>

                        {exItem.sets.map((s) => {
                          const isDone = s.isCompleted;
                          const est1RM =
                            s.weight && s.repetitions ? estimate1RM(s.weight, s.repetitions) : null;

                          if (isEditing) {
                            return (
                              <div key={s.id} style={styles.detailTableRowEditing}>
                                <span style={{ fontWeight: 800, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                  #{s.setNumber}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    style={styles.editInput}
                                    value={s.weight === null ? '' : s.weight}
                                    onChange={(e) =>
                                      handleUpdateHistoricalSet(exItem.id, s.id, {
                                        weight: e.target.value === '' ? null : Number(e.target.value),
                                      })
                                    }
                                  />
                                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>kg</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <input
                                    type="number"
                                    min="0"
                                    style={styles.editInput}
                                    value={s.repetitions === null ? '' : s.repetitions}
                                    onChange={(e) =>
                                      handleUpdateHistoricalSet(exItem.id, s.id, {
                                        repetitions: e.target.value === '' ? null : Number(e.target.value),
                                      })
                                    }
                                  />
                                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>reps</span>
                                </div>
                                <input
                                  type="text"
                                  placeholder="Añadir nota..."
                                  style={styles.editNoteInput}
                                  value={s.notes || ''}
                                  onChange={(e) =>
                                    handleUpdateHistoricalSet(exItem.id, s.id, {
                                      notes: e.target.value,
                                    })
                                  }
                                />
                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                  <button
                                    style={styles.deleteHistoricalSetBtn}
                                    onClick={() => handleDeleteHistoricalSet(exItem.id, s.id)}
                                    title="Eliminar serie"
                                  >
                                    <Trash2 size={15} color="var(--danger-color)" />
                                  </button>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div key={s.id} style={styles.detailTableRow}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontWeight: 800, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                  #{s.setNumber}
                                </span>
                                {s.setType && s.setType !== 'normal' && (
                                  <span
                                    style={{
                                      fontSize: '0.68rem',
                                      fontWeight: 800,
                                      padding: '1px 5px',
                                      borderRadius: '4px',
                                      backgroundColor:
                                        s.setType === 'warmup'
                                          ? 'rgba(192, 138, 90, 0.15)'
                                          : s.setType === 'drop'
                                          ? 'rgba(192, 194, 198, 0.14)'
                                          : 'rgba(192, 105, 105, 0.15)',
                                      color:
                                        s.setType === 'warmup'
                                          ? 'var(--accent-teal)'
                                          : s.setType === 'drop'
                                          ? '#C0C2C6'
                                          : 'var(--danger-color)',
                                    }}
                                    title={
                                      s.setType === 'warmup'
                                        ? 'Serie de Calentamiento'
                                        : s.setType === 'drop'
                                        ? 'Drop Set'
                                        : 'Serie al Fallo'
                                    }
                                  >
                                    {s.setType === 'warmup' ? 'W' : s.setType === 'drop' ? 'D' : 'F'}
                                  </span>
                                )}
                              </div>
                              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                {s.weight ?? 0} kg
                              </span>
                              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                {s.repetitions ?? 0}
                              </span>
                              <span style={{ color: 'var(--accent-teal)', fontWeight: 700 }}>
                                {est1RM ? `${est1RM} kg` : '—'}
                              </span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {isDone ? (
                                  <span style={styles.statusDoneBadge}>Completada</span>
                                ) : (
                                  <span style={styles.statusSkipBadge}>Incompleta</span>
                                )}
                                {s.notes && (
                                  <span style={styles.noteBadge} title={s.notes}>
                                    <FileText size={11} />
                                    <span>{s.notes}</span>
                                  </span>
                                )}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {isEditing && (
                        <button
                          style={styles.addHistoricalSetBtn}
                          onClick={() => handleAddHistoricalSet(exItem.id)}
                        >
                          <Plus size={14} />
                          <span>Agregar serie</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Share Workout Modal */}
      {shareWorkoutId && (
        <div className="modal-overlay" onClick={() => setShareWorkoutId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Compartir entrenamiento</h2>
              <button
                style={styles.closeBtn}
                onClick={() => setShareWorkoutId(null)}
                title="Cerrar"
              >
                <X size={20} color="var(--text-muted)" />
              </button>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.55, margin: 0 }}>
              Tu sesión aparecerá en el feed social de la comunidad con sus series, volumen y ejercicios.
            </p>

            <textarea
              value={shareCaption}
              onChange={(e) => setShareCaption(e.target.value)}
              placeholder="Añade un comentario a tu publicación (opcional)…"
              maxLength={280}
              rows={3}
              style={styles.shareCaptionInput}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
              <span style={styles.shareCharCount}>{shareCaption.length}/280</span>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  style={styles.shareCancelBtn}
                  onClick={() => setShareWorkoutId(null)}
                  disabled={sharingWorkout}
                >
                  Cancelar
                </button>
                <button
                  style={styles.sharePublishBtn}
                  onClick={handlePublishShare}
                  disabled={sharingWorkout}
                >
                  {sharingWorkout ? 'Publicando...' : 'Publicar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        variant={confirmState.variant}
        onConfirm={() => {
          confirmState.onConfirm();
          closeConfirm();
        }}
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
    gap: '2rem',
    maxWidth: '1200px',
    margin: '0 auto',
    boxSizing: 'border-box',
  },
  headerHero: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-container)',
    padding: '2rem 2.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '1.25rem',
  },
  eyebrow: {
    fontSize: '0.72rem',
    fontWeight: 800,
    color: 'var(--accent-teal)',
    letterSpacing: '0.08em',
    marginBottom: '0.2rem',
  },
  title: {
    fontSize: '2.2rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    letterSpacing: '-0.03em',
  },
  subtitle: {
    color: 'var(--text-muted)',
    fontSize: '0.95rem',
    marginTop: '0.25rem',
  },
  countBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.45rem',
    backgroundColor: 'rgba(192, 138, 90, 0.1)',
    border: '1px solid rgba(192, 138, 90, 0.25)',
    color: 'var(--accent-teal)',
    padding: '0.45rem 0.95rem',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.82rem',
    fontWeight: 700,
  },
  loadingBox: {
    padding: '4rem',
    textAlign: 'center',
    color: 'var(--text-muted)',
  },
  emptyCard: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-container)',
    padding: '4rem 2rem',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  card: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-container)',
    padding: '1.35rem 1.75rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
  },
  cardLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  dateBadgeWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  dateText: {
    fontSize: '1.05rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    textTransform: 'capitalize',
  },
  timeText: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    fontWeight: 600,
  },
  metricsPillsRow: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  pillItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    backgroundColor: 'var(--input-bg)',
    padding: '0.35rem 0.75rem',
    borderRadius: 'var(--radius-element)',
    border: '1px solid var(--border-subtle)',
  },
  pillValue: {
    fontSize: '0.85rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
  },
  pillLabel: {
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
  },
  cardRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
  },
  inspectText: {
    fontSize: '0.85rem',
    fontWeight: 700,
    color: 'var(--accent-teal)',
  },
  shareCardBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.4rem 0.75rem',
    borderRadius: 'var(--radius-control)',
    backgroundColor: 'rgba(192, 138, 90, 0.08)',
    border: '1px solid rgba(192, 138, 90, 0.25)',
    color: 'var(--accent-teal)',
    fontSize: '0.8rem',
    fontWeight: 700,
    cursor: 'pointer',
    marginRight: '0.4rem',
    transition: 'all 0.15s ease',
  },
  shareCaptionInput: {
    width: '100%',
    padding: '0.7rem 0.9rem',
    borderRadius: 'var(--radius-container)',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    fontFamily: 'inherit',
    outline: 'none',
    resize: 'vertical',
    boxSizing: 'border-box',
    margin: '1.25rem 0 0.5rem',
  },
  shareCharCount: {
    fontSize: '0.78rem',
    color: 'var(--text-dim)',
  },
  shareCancelBtn: {
    padding: '0.6rem 1.25rem',
    borderRadius: 'var(--radius-container)',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-secondary)',
    fontWeight: 600,
    fontSize: '0.88rem',
    cursor: 'pointer',
  },
  sharePublishBtn: {
    padding: '0.6rem 1.25rem',
    borderRadius: 'var(--radius-container)',
    backgroundColor: 'var(--primary)',
    border: 'none',
    color: 'var(--bg-color)',
    fontWeight: 800,
    fontSize: '0.88rem',
    cursor: 'pointer',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '1.25rem',
  },
  modalTitle: {
    fontSize: '1.4rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    textTransform: 'capitalize',
  },
  closeBtn: {
    padding: '0.25rem',
  },
  modalLoading: {
    padding: '3rem',
    textAlign: 'center',
    color: 'var(--text-muted)',
  },
  modalStatsBar: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1rem',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-container)',
    padding: '1.1rem',
    textAlign: 'center',
  },
  modalStatCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem',
  },
  modalStatVal: {
    fontSize: '1.35rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
  },
  modalStatLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    fontWeight: 600,
  },
  detailExercisesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    maxHeight: '400px',
    overflowY: 'auto',
    paddingRight: '0.35rem',
  },
  detailExCard: {
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-container)',
    padding: '1rem 1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  detailExHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
  },
  detailIndexBadge: {
    width: '26px',
    height: '26px',
    borderRadius: 'var(--radius-element)',
    backgroundColor: 'rgba(192, 138, 90, 0.12)',
    color: 'var(--accent-teal)',
    fontSize: '0.78rem',
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailExName: {
    fontSize: '1rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    flex: 1,
  },
  detailSetsCount: {
    fontSize: '0.78rem',
    color: 'var(--text-muted)',
    fontWeight: 600,
  },
  detailTable: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
  },
  detailTableHeader: {
    display: 'grid',
    gridTemplateColumns: '60px 1fr 1fr 1.2fr 100px',
    padding: '0.35rem 0.5rem',
    fontSize: '0.7rem',
    fontWeight: 800,
    color: 'var(--text-dim)',
    textTransform: 'uppercase',
  },
  detailTableRow: {
    display: 'grid',
    gridTemplateColumns: '60px 1fr 1fr 1.2fr 100px',
    alignItems: 'center',
    padding: '0.45rem 0.5rem',
    borderRadius: 'var(--radius-element)',
    backgroundColor: 'var(--surface-color)',
    fontSize: '0.85rem',
  },
  statusDoneBadge: {
    fontSize: '0.7rem',
    color: 'var(--accent-green)',
    backgroundColor: 'rgba(76, 175, 125, 0.12)',
    padding: '0.15rem 0.45rem',
    borderRadius: '4px',
    fontWeight: 700,
  },
  statusSkipBadge: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: '0.15rem 0.45rem',
    borderRadius: '4px',
    fontWeight: 600,
  },
  deleteCardBtn: {
    padding: '0.45rem',
    borderRadius: 'var(--radius-element)',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: '0.5rem',
    transition: 'all 0.15s ease',
  },
  deleteModalBtn: {
    padding: '0.45rem',
    borderRadius: 'var(--radius-element)',
    backgroundColor: 'rgba(192, 105, 105, 0.12)',
    border: '1px solid rgba(192, 105, 105, 0.25)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
  },
  editToggleBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.45rem 0.85rem',
    borderRadius: 'var(--radius-control)',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    fontSize: '0.82rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  editDoneBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.45rem 0.85rem',
    borderRadius: 'var(--radius-control)',
    backgroundColor: 'rgba(192, 138, 90, 0.15)',
    border: '1px solid var(--accent-teal)',
    color: 'var(--accent-teal)',
    fontSize: '0.82rem',
    fontWeight: 800,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  detailTableHeaderEditing: {
    display: 'grid',
    gridTemplateColumns: '55px 95px 95px 1fr 40px',
    padding: '0.35rem 0.5rem',
    fontSize: '0.7rem',
    fontWeight: 800,
    color: 'var(--text-dim)',
    textTransform: 'uppercase',
  },
  detailTableRowEditing: {
    display: 'grid',
    gridTemplateColumns: '55px 95px 95px 1fr 40px',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.4rem 0.5rem',
    borderRadius: 'var(--radius-element)',
    backgroundColor: 'var(--surface-color)',
    fontSize: '0.85rem',
  },
  editInput: {
    width: '58px',
    padding: '0.3rem 0.4rem',
    borderRadius: '6px',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    fontWeight: 700,
    fontSize: '0.88rem',
    textAlign: 'center',
  },
  editNoteInput: {
    width: '100%',
    padding: '0.3rem 0.6rem',
    borderRadius: '6px',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    fontSize: '0.82rem',
    boxSizing: 'border-box',
  },
  deleteHistoricalSetBtn: {
    padding: '0.35rem',
    borderRadius: '6px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addHistoricalSetBtn: {
    alignSelf: 'flex-start',
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    marginTop: '0.4rem',
    padding: '0.35rem 0.75rem',
    borderRadius: 'var(--radius-element)',
    backgroundColor: 'transparent',
    border: '1px dashed var(--border-color)',
    color: 'var(--accent-teal)',
    fontSize: '0.8rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  noteBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    padding: '0.15rem 0.45rem',
    borderRadius: '4px',
    maxWidth: '180px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
};
