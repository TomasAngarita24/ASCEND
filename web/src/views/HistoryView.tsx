import React, { useEffect, useState } from 'react';
import { History, Calendar, Clock, Award, Dumbbell, ChevronRight, X, CheckSquare, Zap, Target } from 'lucide-react';
import { api, type WorkoutHistoryEntry, type WorkoutDetailEntry, type Tokens } from '../api/api';

interface HistoryViewProps {
  tokens: Tokens;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ tokens }) => {
  const [workouts, setWorkouts] = useState<WorkoutHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [workoutDetail, setWorkoutDetail] = useState<WorkoutDetailEntry | null>(null);

  useEffect(() => {
    loadHistory();
  }, [tokens]);

  const loadHistory = () => {
    setLoading(true);
    api.listWorkoutHistory(tokens.accessToken)
      .then(setWorkouts)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const handleOpenDetail = async (workoutId: string) => {
    setSelectedWorkoutId(workoutId);
    setDetailLoading(true);
    setWorkoutDetail(null);
    try {
      const detail = await api.getWorkout(tokens.accessToken, workoutId);
      setWorkoutDetail(detail);
    } catch {
      alert('Error al cargar el detalle del entrenamiento.');
      setSelectedWorkoutId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseDetail = () => {
    setSelectedWorkoutId(null);
    setWorkoutDetail(null);
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
    if (reps === 1) return weight;
    if (reps > 1 && reps <= 30) return Math.round(weight * (36 / (37 - reps)) * 10) / 10;
    return weight;
  };

  // Find summary stats for selected workout if open
  const selectedSummary = workouts.find((w) => w.id === selectedWorkoutId);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Historial de Entrenamientos</h1>
          <p style={styles.subtitle}>Revisa cada sesión, ejercicios realizados y récords de tus entrenamientos pasados.</p>
        </div>
        <span style={styles.countBadge}>{workouts.length} completados</span>
      </div>

      {loading ? (
        <div style={styles.loadingText}>Cargando historial...</div>
      ) : workouts.length === 0 ? (
        <div style={styles.emptyCard}>
          <History size={48} color="var(--text-muted)" />
          <p style={styles.emptyText}>Aún no hay entrenamientos completados en tu historial.</p>
        </div>
      ) : (
        <div style={styles.list}>
          {workouts.map((item) => (
            <div
              key={item.id}
              style={styles.card}
              onClick={() => handleOpenDetail(item.id)}
              role="button"
              tabIndex={0}
            >
              <div style={styles.cardHeader}>
                <div style={styles.dateCol}>
                  <Calendar size={18} color="var(--accent-teal)" />
                  <span style={styles.dateText}>{formatDate(item.startedAt)}</span>
                  <span style={styles.timeTag}>{formatTime(item.startedAt)}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={styles.durationBadge}>
                    <Clock size={15} color="var(--text-muted)" />
                    <span>{formatDuration(item.durationSeconds)}</span>
                  </div>
                  <div style={styles.detailBtnHint}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-teal)' }}>Ver detalle</span>
                    <ChevronRight size={18} color="var(--accent-teal)" />
                  </div>
                </div>
              </div>

              <div style={styles.statsGrid}>
                <div style={styles.statBox}>
                  <Dumbbell size={16} color="var(--accent-teal)" />
                  <span style={styles.statVal}>{item.exerciseCount}</span>
                  <span style={styles.statLabel}>Ejercicios</span>
                </div>

                <div style={styles.statBox}>
                  <Award size={16} color="var(--accent-green)" />
                  <span style={styles.statVal}>{item.setsCompleted}</span>
                  <span style={styles.statLabel}>Series</span>
                </div>

                <div style={styles.statBox}>
                  <Target size={16} color="#38bdf8" />
                  <span style={styles.statVal}>{item.totalRepetitions}</span>
                  <span style={styles.statLabel}>Repeticiones</span>
                </div>

                <div style={styles.statBox}>
                  <Zap size={16} color="#eab308" />
                  <span style={styles.statVal}>{item.totalVolume} kg</span>
                  <span style={styles.statLabel}>Volumen Total</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Workout Detail Modal (FR-HIST-002) */}
      {selectedWorkoutId && (
        <div style={styles.modalOverlay} onClick={handleCloseDetail}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={styles.modalIconBadge}>
                  <History size={22} color="var(--accent-teal)" />
                </div>
                <div>
                  <h2 style={styles.modalTitle}>
                    {selectedSummary ? formatDate(selectedSummary.startedAt) : 'Detalle de Entrenamiento'}
                  </h2>
                  <span style={styles.modalSubtitle}>
                    {selectedSummary ? `${formatTime(selectedSummary.startedAt)} • ${formatDuration(selectedSummary.durationSeconds)}` : ''}
                  </span>
                </div>
              </div>
              <button style={styles.closeBtn} onClick={handleCloseDetail} title="Cerrar">
                <X size={20} color="var(--text-muted)" />
              </button>
            </div>

            {/* Quick Metrics Bar */}
            {selectedSummary && (
              <div style={styles.modalStatsBar}>
                <div style={styles.modalStatItem}>
                  <span style={styles.modalStatLabel}>Ejercicios</span>
                  <span style={styles.modalStatValue}>{selectedSummary.exerciseCount}</span>
                </div>
                <div style={styles.modalStatItem}>
                  <span style={styles.modalStatLabel}>Series totales</span>
                  <span style={styles.modalStatValue}>{selectedSummary.setsCompleted}</span>
                </div>
                <div style={styles.modalStatItem}>
                  <span style={styles.modalStatLabel}>Repeticiones</span>
                  <span style={styles.modalStatValue}>{selectedSummary.totalRepetitions}</span>
                </div>
                <div style={styles.modalStatItem}>
                  <span style={styles.modalStatLabel}>Volumen total</span>
                  <span style={{ ...styles.modalStatValue, color: 'var(--accent-teal)' }}>{selectedSummary.totalVolume} kg</span>
                </div>
              </div>
            )}

            {/* Detail Body */}
            <div style={styles.modalBody}>
              {detailLoading ? (
                <div style={styles.detailLoadingBox}>
                  <div className="spinner" style={{ width: '32px', height: '32px', border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-teal)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Cargando detalles de los ejercicios...</span>
                </div>
              ) : workoutDetail && workoutDetail.exercises && workoutDetail.exercises.length > 0 ? (
                <div style={styles.exerciseDetailList}>
                  {workoutDetail.exercises.map((exItem, idx) => (
                    <div key={exItem.id || idx} style={styles.detailExerciseCard}>
                      <div style={styles.detailExHeader}>
                        <h3 style={styles.detailExTitle}>
                          {idx + 1}. {exItem.exercise?.name || 'Ejercicio'}
                        </h3>
                        <span style={styles.detailSetCountBadge}>
                          {exItem.sets?.length || 0} series registradas
                        </span>
                      </div>

                      <div style={styles.tableWrapper}>
                        <table style={styles.detailTable}>
                          <thead>
                            <tr>
                              <th style={styles.th}>Serie</th>
                              <th style={styles.th}>Tipo</th>
                              <th style={styles.th}>Peso</th>
                              <th style={styles.th}>Reps</th>
                              <th style={styles.th}>1RM Est.</th>
                              <th style={styles.th}>Estado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {exItem.sets?.map((s) => {
                              const est = (s.weight && s.repetitions) ? estimate1RM(s.weight, s.repetitions) : null;
                              return (
                                <tr key={s.id} style={styles.tr}>
                                  <td style={styles.tdBold}>#{s.setNumber}</td>
                                  <td style={styles.td}>
                                    <span style={{
                                      ...styles.setTypeBadge,
                                      backgroundColor: s.setType === 'warmup' ? 'rgba(234, 179, 8, 0.15)' : s.setType === 'drop' ? 'rgba(168, 85, 247, 0.15)' : s.setType === 'failure' ? 'rgba(239, 68, 68, 0.15)' : 'var(--input-bg)',
                                      color: s.setType === 'warmup' ? '#eab308' : s.setType === 'drop' ? '#c084fc' : s.setType === 'failure' ? '#ef4444' : 'var(--text-muted)',
                                    }}>
                                      {s.setType === 'warmup' ? 'Calentamiento' : s.setType === 'drop' ? 'Drop set' : s.setType === 'failure' ? 'Fallo' : 'Normal'}
                                    </span>
                                  </td>
                                  <td style={styles.td}>{s.weight !== null ? `${s.weight} kg` : '-'}</td>
                                  <td style={styles.td}>{s.repetitions !== null ? s.repetitions : '-'}</td>
                                  <td style={styles.tdAccent}>{est ? `${est} kg` : '-'}</td>
                                  <td style={styles.td}>
                                    {s.isCompleted ? (
                                      <span style={styles.completedStatus}>
                                        <CheckSquare size={16} color="var(--accent-teal)" />
                                        <span>Completada</span>
                                      </span>
                                    ) : (
                                      <span style={styles.incompleteStatus}>Incompleta</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={styles.emptyDetailBox}>
                  <p style={{ color: 'var(--text-muted)' }}>No hay ejercicios registrados en esta sesión.</p>
                </div>
              )}
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
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  title: {
    fontSize: '2.4rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    color: 'var(--text-muted)',
    fontSize: '0.95rem',
    marginTop: '0.35rem',
  },
  countBadge: {
    backgroundColor: 'rgba(34, 240, 197, 0.12)',
    color: 'var(--accent-teal)',
    border: '1px solid rgba(34, 240, 197, 0.25)',
    padding: '0.45rem 1rem',
    borderRadius: '999px',
    fontSize: '0.9rem',
    fontWeight: 700,
  },
  loadingText: {
    textAlign: 'center',
    color: 'var(--text-muted)',
    padding: '3rem',
  },
  emptyCard: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: '20px',
    padding: '3.5rem 2rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
    textAlign: 'center',
  },
  emptyText: {
    color: 'var(--text-muted)',
    fontSize: '1rem',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  card: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: '18px',
    padding: '1.5rem 1.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
    cursor: 'pointer',
    transition: 'transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '0.75rem',
  },
  dateCol: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    flexWrap: 'wrap',
  },
  dateText: {
    fontSize: '1.15rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    textTransform: 'capitalize',
  },
  timeTag: {
    fontSize: '0.82rem',
    color: 'var(--text-muted)',
    backgroundColor: 'var(--input-bg)',
    padding: '0.15rem 0.55rem',
    borderRadius: '6px',
    border: '1px solid var(--border-color)',
  },
  durationBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    padding: '0.35rem 0.75rem',
    borderRadius: '10px',
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    fontWeight: 600,
  },
  detailBtnHint: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.2rem',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
    gap: '0.75rem',
  },
  statBox: {
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '0.85rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.3rem',
  },
  statVal: {
    fontSize: '1.15rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
  },
  statLabel: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },

  // Modal Styles (FR-HIST-002)
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1.5rem',
    boxSizing: 'border-box',
  },
  modalContent: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: '24px',
    width: '100%',
    maxWidth: '750px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.6)',
    overflow: 'hidden',
  },
  modalHeader: {
    padding: '1.5rem 2rem',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalIconBadge: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    backgroundColor: 'rgba(34, 240, 197, 0.12)',
    border: '1px solid rgba(34, 240, 197, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: '1.3rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    textTransform: 'capitalize',
  },
  modalSubtitle: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    marginTop: '0.2rem',
    display: 'block',
  },
  closeBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  modalStatsBar: {
    padding: '1rem 2rem',
    backgroundColor: 'var(--input-bg)',
    borderBottom: '1px solid var(--border-color)',
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '1rem',
    textAlign: 'center',
  },
  modalStatItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem',
  },
  modalStatLabel: {
    fontSize: '0.72rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  modalStatValue: {
    fontSize: '1.1rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
  },
  modalBody: {
    padding: '1.5rem 2rem',
    overflowY: 'auto',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  detailLoadingBox: {
    padding: '3rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
  },
  emptyDetailBox: {
    padding: '2.5rem',
    textAlign: 'center',
  },
  exerciseDetailList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  detailExerciseCard: {
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '16px',
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.85rem',
  },
  detailExHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailExTitle: {
    fontSize: '1.05rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  detailSetCountBadge: {
    fontSize: '0.78rem',
    color: 'var(--text-muted)',
    fontWeight: 600,
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    padding: '0.2rem 0.6rem',
    borderRadius: '8px',
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  detailTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.88rem',
  },
  th: {
    textAlign: 'left',
    padding: '0.5rem 0.6rem',
    color: 'var(--text-muted)',
    fontWeight: 600,
    fontSize: '0.78rem',
    borderBottom: '1px solid var(--border-color)',
    textTransform: 'uppercase',
  },
  tr: {
    borderBottom: '1px solid var(--border-color)',
  },
  tdBold: {
    padding: '0.65rem 0.6rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  td: {
    padding: '0.65rem 0.6rem',
    color: 'var(--text-secondary)',
  },
  tdAccent: {
    padding: '0.65rem 0.6rem',
    color: 'var(--accent-teal)',
    fontWeight: 700,
  },
  setTypeBadge: {
    fontSize: '0.72rem',
    fontWeight: 600,
    padding: '0.15rem 0.5rem',
    borderRadius: '6px',
    border: '1px solid var(--border-color)',
  },
  completedStatus: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    color: 'var(--accent-teal)',
    fontSize: '0.8rem',
    fontWeight: 600,
  },
  incompleteStatus: {
    color: 'var(--text-muted)',
    fontSize: '0.8rem',
  },
};
