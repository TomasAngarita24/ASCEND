import React, { useEffect, useState } from 'react';
import { Dumbbell, Repeat, X } from 'lucide-react';
import { api, type RoutineDetail, type RoutineExercise } from '../api/api';

interface RoutineDetailModalProps {
  routineId: string;
  accessToken: string;
  onClose: () => void;
}

function formatTarget(ex: RoutineExercise): string {
  const parts: string[] = [];
  if (ex.targetSets != null) parts.push(`${ex.targetSets} series`);
  if (ex.targetRepetitionsMin != null) {
    parts.push(
      ex.targetRepetitionsMax != null && ex.targetRepetitionsMax !== ex.targetRepetitionsMin
        ? `${ex.targetRepetitionsMin}-${ex.targetRepetitionsMax} reps`
        : `${ex.targetRepetitionsMin} reps`,
    );
  }
  if (ex.targetWeight != null && ex.targetWeight > 0) parts.push(`${ex.targetWeight} kg`);
  if (ex.restSeconds != null) parts.push(`descanso ${ex.restSeconds}s`);
  return parts.length > 0 ? parts.join(' · ') : 'Sin configuración de series';
}

export const RoutineDetailModal: React.FC<RoutineDetailModalProps> = ({ routineId, accessToken, onClose }) => {
  const [routine, setRoutine] = useState<RoutineDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api.getRoutine(accessToken, routineId)
      .then((data) => {
        if (active) setRoutine(data);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'No se pudo cargar la rutina.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [accessToken, routineId]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        <div style={styles.modalHeader}>
          <div style={styles.titleWrap}>
            <Repeat size={20} color="var(--accent-teal)" />
            <h2 style={styles.modalTitle}>{routine?.name ?? 'Rutina'}</h2>
            {routine?.isPublic && <span style={styles.visibilityBadge}>Compartida</span>}
          </div>
          <button style={styles.closeBtn} onClick={onClose} aria-label="Cerrar detalle de la rutina">
            <X size={20} color="var(--text-muted)" />
          </button>
        </div>

        {loading ? (
          <div style={styles.stateBox}>
            <div style={styles.spinner} />
            <span style={styles.stateText}>Cargando ejercicios...</span>
          </div>
        ) : error ? (
          <div style={styles.stateBox}>
            <span style={styles.errorText}>{error}</span>
          </div>
        ) : routine && routine.exercises.length === 0 ? (
          <div style={styles.stateBox}>
            <span style={styles.stateText}>Esta rutina no tiene ejercicios todavía.</span>
          </div>
        ) : routine ? (
          <div style={styles.exerciseList}>
            {routine.exercises.map((ex, idx) => (
              <div key={ex.id} style={styles.exerciseCard}>
                <div style={styles.indexBadge}>{idx + 1}</div>
                <div style={styles.exerciseInfo}>
                  <div style={styles.exerciseName}>{ex.exercise.name}</div>
                  <div style={styles.exerciseMeta}>
                    <Dumbbell size={13} color="var(--accent-teal)" />
                    <span>{formatTarget(ex)}</span>
                  </div>
                  {ex.notes && <div style={styles.exerciseNotes}>{ex.notes}</div>}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.75rem',
    marginBottom: '1.25rem',
  },
  titleWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    minWidth: 0,
  },
  modalTitle: {
    fontSize: '1.3rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
    wordBreak: 'break-word',
    minWidth: 0,
  },
  visibilityBadge: {
    flexShrink: 0,
    fontSize: '0.68rem',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--accent-teal)',
    backgroundColor: 'rgba(192, 138, 90, 0.12)',
    border: '1px solid rgba(192, 138, 90, 0.28)',
    padding: '0.25rem 0.6rem',
    borderRadius: 'var(--radius-full)',
  },
  closeBtn: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.35rem',
    borderRadius: 'var(--radius-element)',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
  },
  stateBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '2.5rem 1rem',
    color: 'var(--text-muted)',
  },
  spinner: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    border: '3px solid var(--border-color)',
    borderTopColor: 'var(--accent-teal)',
    animation: 'spin 0.8s linear infinite',
  },
  stateText: {
    fontSize: '0.95rem',
    color: 'var(--text-muted)',
  },
  errorText: {
    fontSize: '0.95rem',
    color: 'var(--danger-color)',
    textAlign: 'center',
  },
  exerciseList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  exerciseCard: {
    display: 'flex',
    gap: '0.85rem',
    padding: '1rem 1.15rem',
    borderRadius: 'var(--radius-container)',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
  },
  indexBadge: {
    flexShrink: 0,
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
  },
  exerciseInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem',
    minWidth: 0,
  },
  exerciseName: {
    fontSize: '1rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    wordBreak: 'break-word',
  },
  exerciseMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    flexWrap: 'wrap',
  },
  exerciseNotes: {
    fontSize: '0.82rem',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
    marginTop: '0.1rem',
  },
};