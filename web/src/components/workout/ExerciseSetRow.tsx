import React from 'react';
import { Check, Trash2, Trophy } from 'lucide-react';
import type { WorkoutSet } from '../../api/api';

export interface PrevSetData {
  setNumber: number;
  weight: number | null;
  repetitions: number | null;
}

interface ExerciseSetRowProps {
  set: WorkoutSet;
  prevSet?: PrevSetData;
  exerciseId: string;
  totalSetsCount: number;
  isPR: boolean;
  prReason: string;
  onToggleSet: (exerciseId: string, setId: string, currentlyCompleted: boolean) => void;
  onUpdateSetField: (exerciseId: string, setId: string, field: 'weight' | 'repetitions', val: string) => void;
  onCycleSetType: (exerciseId: string, setId: string, currentType?: string) => void;
  onDeleteSet: (exerciseId: string, setId: string) => void;
}

export const ExerciseSetRow: React.FC<ExerciseSetRowProps> = ({
  set,
  prevSet,
  exerciseId,
  totalSetsCount,
  isPR,
  prReason,
  onToggleSet,
  onUpdateSetField,
  onCycleSetType,
  onDeleteSet,
}) => {
  const hasPrev = prevSet && (prevSet.weight !== null || prevSet.repetitions !== null);
  const prevDisplay = hasPrev
    ? `${prevSet.weight ?? 0} kg × ${prevSet.repetitions ?? 0}`
    : '—';

  const setType = set.setType || 'normal';

  const dropSetConfig = {
    label: 'D',
    color: '#C0C2C6',
    bg: 'rgba(192, 194, 198, 0.15)',
    title: 'Drop Set (D) - serie descendente (clic para Fallo)',
  };

  const setTypeConfig: Record<string, { label: string; color: string; bg: string; title: string }> = {
    normal: {
      label: `${set.setNumber}`,
      color: 'var(--text-primary)',
      bg: 'transparent',
      title: 'Serie Normal (clic para cambiar a Calentamiento)',
    },
    warmup: {
      label: 'W',
      color: 'var(--accent-teal)',
      bg: 'rgba(192, 138, 90, 0.15)',
      title: 'Calentamiento (W) - no cuenta en series pesadas (clic para Drop set)',
    },
    drop_set: dropSetConfig,
    drop: dropSetConfig,
    failure: {
      label: 'F',
      color: 'var(--danger-color)',
      bg: 'rgba(192, 105, 105, 0.15)',
      title: 'Fallo muscular (F) - RPE 10 (clic para Normal)',
    },
  };

  const currentConfig = setTypeConfig[setType] || setTypeConfig.normal;

  return (
    <div
      className="aw-set-table"
      style={{
        ...styles.tableRow,
        ...(set.isCompleted ? styles.tableRowCompleted : {}),
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        <button
          type="button"
          onClick={() => onCycleSetType(exerciseId, set.id, setType)}
          style={{
            ...styles.setTypeBtn,
            color: currentConfig.color,
            backgroundColor: currentConfig.bg,
          }}
          title={currentConfig.title}
        >
          {currentConfig.label}
        </button>
        {isPR && (
          <span style={styles.prBadge} title={prReason}>
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
          inputMode="decimal"
          enterKeyHint="done"
          placeholder={prevSet?.weight?.toString() || '0'}
          value={set.weight === null ? '' : set.weight}
          onChange={(e) => onUpdateSetField(exerciseId, set.id, 'weight', e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
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
          inputMode="numeric"
          enterKeyHint="done"
          placeholder={prevSet?.repetitions?.toString() || '10'}
          value={set.repetitions === null ? '' : set.repetitions}
          onChange={(e) => onUpdateSetField(exerciseId, set.id, 'repetitions', e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
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
          onClick={() => onToggleSet(exerciseId, set.id, set.isCompleted)}
          aria-label={set.isCompleted ? 'Marcar serie como no completada' : 'Marcar serie como completada'}
        >
          <Check size={16} strokeWidth={3} />
        </button>
      </div>

      {/* Delete Set Button */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        {totalSetsCount > 1 && (
          <button
            style={styles.deleteSetBtn}
            onClick={() => onDeleteSet(exerciseId, set.id)}
            title="Eliminar serie"
            aria-label="Eliminar serie"
          >
            <Trash2 size={15} color="var(--text-dim)" />
          </button>
        )}
      </div>
    </div>
  );
};

const SET_TABLE_GRID_COLUMNS = '56px minmax(118px, 1.2fr) minmax(72px, 1.1fr) minmax(72px, 1.1fr) 50px 32px';

const styles: Record<string, React.CSSProperties> = {
  tableRow: {
    display: 'grid',
    gridTemplateColumns: SET_TABLE_GRID_COLUMNS,
    alignItems: 'center',
    padding: '0.45rem 0.75rem',
    borderRadius: 'var(--radius-container)',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-subtle)',
    transition: 'background-color 0.18s ease, border-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease, transform 0.18s ease',
  },
  tableRowCompleted: {
    backgroundColor: 'rgba(76, 175, 125, 0.1)',
    borderColor: 'rgba(76, 175, 125, 0.25)',
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
    transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease, transform 0.15s ease',
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
  prevSetText: {
    fontSize: '0.82rem',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
    overflowWrap: 'anywhere',
    wordBreak: 'break-word',
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
    transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease, transform 0.15s ease',
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
};
