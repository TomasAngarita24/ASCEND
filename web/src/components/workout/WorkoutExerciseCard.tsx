import React from 'react';
import { ChevronUp, ChevronDown, Dumbbell, Trash2, TrendingUp, TrendingDown, Minus, Info, Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { WorkoutExercise } from '../../api/api';
import { DELOAD_SETS_THRESHOLD } from '../../utils/coaching';
import { ExerciseSetRow, type PrevSetData } from './ExerciseSetRow';

interface WorkoutExerciseCardProps {
  exItem: WorkoutExercise;
  exIdx: number;
  totalExercisesCount: number;
  prevSets: PrevSetData[];
  coaching: { direction: 'up' | 'down' | 'same'; weight: number; reason: string } | null;
  deloadWarning: boolean;
  weeklySets: number;
  checkIsPR: (exerciseId: string, weight: number | null, reps: number | null) => { isPR: boolean; reason: string; est1RM: number };
  onMoveExercise: (currentIndex: number, direction: 'up' | 'down') => void;
  onDeleteExercise: (exerciseId: string, exerciseName: string) => void;
  onApplyCoachingSuggestion: (exerciseId: string, weight: number) => void;
  onToggleSet: (exerciseId: string, setId: string, currentlyCompleted: boolean) => void;
  onUpdateSetField: (exerciseId: string, setId: string, field: 'weight' | 'repetitions', val: string) => void;
  onCycleSetType: (exerciseId: string, setId: string, currentType?: string) => void;
  onDeleteSet: (exerciseId: string, setId: string) => void;
  onAddSetToExercise: (exerciseId: string) => void;
}

export const WorkoutExerciseCard: React.FC<WorkoutExerciseCardProps> = ({
  exItem,
  exIdx,
  totalExercisesCount,
  prevSets,
  coaching,
  deloadWarning,
  weeklySets,
  checkIsPR,
  onMoveExercise,
  onDeleteExercise,
  onApplyCoachingSuggestion,
  onToggleSet,
  onUpdateSetField,
  onCycleSetType,
  onDeleteSet,
  onAddSetToExercise,
}) => {
  return (
    <div style={styles.exerciseCard}>
      <div style={styles.exHeader}>
        <div style={styles.exHeaderLeft}>
          {exItem.exercise.mediaUrl ? (
            <img
              src={exItem.exercise.mediaUrl}
              alt=""
              style={styles.exThumb}
              loading="lazy"
              onError={(e) => {
                const img = e.currentTarget;
                img.style.display = 'none';
              }}
            />
          ) : (
            <div style={styles.exThumbFallback}>
              <Dumbbell size={18} strokeWidth={1.5} color="var(--text-dim)" />
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            <button
              style={{
                ...styles.reorderBtn,
                opacity: exIdx === 0 ? 0.3 : 1,
                cursor: exIdx === 0 ? 'default' : 'pointer',
              }}
              onClick={() => onMoveExercise(exIdx, 'up')}
              disabled={exIdx === 0}
              title="Mover arriba"
              aria-label="Mover ejercicio arriba"
            >
              <ChevronUp size={14} />
            </button>
            <button
              style={{
                ...styles.reorderBtn,
                opacity: exIdx === totalExercisesCount - 1 ? 0.3 : 1,
                cursor: exIdx === totalExercisesCount - 1 ? 'default' : 'pointer',
              }}
              onClick={() => onMoveExercise(exIdx, 'down')}
              disabled={exIdx === totalExercisesCount - 1}
              title="Mover abajo"
              aria-label="Mover ejercicio abajo"
            >
              <ChevronDown size={14} />
            </button>
          </div>

          <div style={styles.exNumberBadge}>{exItem.position}</div>
          <h3 style={styles.exName}>{exItem.exercise.name}</h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={styles.restInfoBadge}>Descanso: {exItem.restSeconds ?? 90}s</span>
          <button
            style={styles.deleteExIconBtn}
            onClick={() => onDeleteExercise(exItem.id, exItem.exercise.name)}
            title="Quitar ejercicio"
            aria-label="Quitar ejercicio"
          >
            <Trash2 size={16} color="var(--text-dim)" />
          </button>
        </div>
      </div>

      {(coaching || deloadWarning) && (
        <div style={styles.coachingRow}>
          {coaching && (
            <button
              type="button"
              style={{
                ...styles.coachingChip,
                ...(coaching.direction === 'up' ? styles.coachingChipUp : {}),
                ...(coaching.direction === 'down' ? styles.coachingChipDown : {}),
              }}
              title={coaching.reason}
              onClick={() => onApplyCoachingSuggestion(exItem.id, coaching.weight)}
            >
              {coaching.direction === 'up' ? (
                <TrendingUp size={13} />
              ) : coaching.direction === 'down' ? (
                <TrendingDown size={13} />
              ) : (
                <Minus size={13} />
              )}
              <span>Sugerido: {coaching.weight} kg</span>
            </button>
          )}
          {deloadWarning && (
            <button
              type="button"
              style={styles.deloadChip}
              title={`Llevas ${weeklySets} series completadas de este ejercicio en los últimos 7 días. Considera una semana de descarga.`}
              onClick={() =>
                toast.info(
                  `Volumen semanal: ${weeklySets} series. Más de ${DELOAD_SETS_THRESHOLD} sin descarga puede frenar tu progreso.`,
                  { duration: 5000 }
                )
              }
            >
              <Info size={13} />
              <span>Deload ({weeklySets} series/sem)</span>
            </button>
          )}
        </div>
      )}

      {/* Set Table */}
      <div style={styles.setTable}>
        <div className="aw-set-table aw-set-header" style={styles.tableHeader}>
          <span>Serie / Tipo</span>
          <span>Anterior</span>
          <span>Peso (kg)</span>
          <span>Reps</span>
          <span style={{ textAlign: 'center' }}>Listo</span>
          <span style={{ textAlign: 'center' }}></span>
        </div>

        {exItem.sets.map((set, setIdx) => {
          const prevSet = prevSets.find((s) => s.setNumber === set.setNumber) || prevSets[setIdx];
          const rawExId = exItem.exercise?.id;
          const prInfo = checkIsPR(rawExId, set.weight, set.repetitions);

          return (
            <ExerciseSetRow
              key={set.id}
              set={set}
              prevSet={prevSet}
              exerciseId={exItem.id}
              totalSetsCount={exItem.sets.length}
              isPR={prInfo.isPR}
              prReason={prInfo.reason}
              onToggleSet={onToggleSet}
              onUpdateSetField={onUpdateSetField}
              onCycleSetType={onCycleSetType}
              onDeleteSet={onDeleteSet}
            />
          );
        })}
      </div>

      {/* Add Set Button */}
      <button style={styles.addSetBtn} onClick={() => onAddSetToExercise(exItem.id)}>
        <Plus size={16} />
        <span>Agregar serie</span>
      </button>
    </div>
  );
};

const SET_TABLE_GRID_COLUMNS = '56px minmax(118px, 1.2fr) minmax(72px, 1.1fr) minmax(72px, 1.1fr) 50px 32px';

const styles: Record<string, React.CSSProperties> = {
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
  exHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
    flexWrap: 'wrap',
    minWidth: 0,
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
    borderRadius: '50%',
    objectFit: 'cover',
    flexShrink: 0,
    border: '1px solid var(--border-color)',
  },
  exThumbFallback: {
    width: '42px',
    height: '42px',
    borderRadius: '50%',
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
    minWidth: 0,
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
    flexShrink: 1,
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
  coachingRow: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
    padding: '0 0.75rem 0.25rem',
  },
  coachingChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.3rem 0.65rem',
    borderRadius: '999px',
    fontSize: '0.74rem',
    fontWeight: 700,
    letterSpacing: '0.02em',
    cursor: 'pointer',
    border: '1px solid',
    background: 'rgba(192, 138, 90, 0.16)',
    borderColor: 'rgba(192, 138, 90, 0.5)',
    color: 'var(--accent-teal)',
    transition: 'transform 0.15s ease, background 0.15s ease',
  },
  coachingChipUp: {
    background: 'rgba(125, 211, 175, 0.12)',
    borderColor: 'rgba(125, 211, 175, 0.45)',
    color: '#6fd99e',
  },
  coachingChipDown: {
    background: 'rgba(192, 105, 105, 0.12)',
    borderColor: 'rgba(192, 105, 105, 0.45)',
    color: 'var(--danger-color)',
  },
  deloadChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.3rem 0.65rem',
    borderRadius: '999px',
    fontSize: '0.74rem',
    fontWeight: 700,
    letterSpacing: '0.02em',
    cursor: 'pointer',
    border: '1px solid rgba(192, 138, 90, 0.5)',
    background: 'rgba(192, 138, 90, 0.12)',
    color: 'var(--accent-teal)',
    transition: 'transform 0.15s ease, background 0.15s ease',
  },
  setTable: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.45rem',
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
  },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: SET_TABLE_GRID_COLUMNS,
    padding: '0.4rem 0.75rem',
    fontSize: '0.72rem',
    fontWeight: 800,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
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
};
