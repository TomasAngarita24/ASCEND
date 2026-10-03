import React, { useMemo } from 'react';
import { Search, X, Dumbbell, ChevronRight } from 'lucide-react';
import type { ExerciseSummary } from '../../api/api';
import { matchesSearch } from '../../utils/text';

interface ExerciseSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  allExercises: ExerciseSummary[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectExercise: (exerciseId: string) => void;
}

export const ExerciseSelectorModal: React.FC<ExerciseSelectorModalProps> = ({
  isOpen,
  onClose,
  allExercises,
  searchQuery,
  onSearchChange,
  onSelectExercise,
}) => {
  const filteredAddExercises = useMemo(
    () =>
      allExercises.filter(
        (ex) =>
          matchesSearch(ex.name, searchQuery) ||
          ex.targetMuscleGroups.some((m) => matchesSearch(m, searchQuery))
      ),
    [allExercises, searchQuery]
  );

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>Agregar Ejercicio</h2>
          <button style={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
            <X size={20} color="var(--text-muted)" />
          </button>
        </div>

        <div style={styles.modalSearchWrapper}>
          <Search size={18} color="var(--text-muted)" style={styles.modalSearchIcon} />
          <input
            type="text"
            placeholder="Buscar ejercicio..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={styles.modalSearchInput}
            autoFocus
          />
        </div>

        <div style={styles.modalExList}>
          {filteredAddExercises.map((ex) => (
            <div
              key={ex.id}
              style={styles.modalExItem}
              onClick={() => onSelectExercise(ex.id)}
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
                    <span key={m} style={styles.modalTagM}>
                      {m}
                    </span>
                  ))}
                  {ex.equipment && <span style={styles.modalTagE}>{ex.equipment}</span>}
                </div>
              </div>
              <ChevronRight size={18} color="var(--text-muted)" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
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
    transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease, transform 0.15s ease',
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
