import React, { useState } from 'react';
import { Dumbbell, Play, Heart, Edit2, Trash2 } from 'lucide-react';
import type { ExerciseSummary } from '../../api/api';

const CardImage: React.FC<{ url?: string | null; name: string }> = ({ url, name }) => {
  const [hasError, setHasError] = useState(false);

  if (!url || hasError) {
    return (
      <div className="exercise-fallback-icon">
        <Dumbbell size={44} strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={name}
      onError={() => setHasError(true)}
      loading="lazy"
    />
  );
};

interface ExerciseCardProps {
  exercise: ExerciseSummary;
  isFavorite: boolean;
  onSelect: (exercise: ExerciseSummary) => void;
  onToggleFavorite: (id: string) => void;
  onEdit: (exercise: ExerciseSummary) => void;
  onDelete: (exercise: ExerciseSummary) => void;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
  exercise: ex,
  isFavorite,
  onSelect,
  onToggleFavorite,
  onEdit,
  onDelete,
}) => {
  return (
    <div
      className="exercise-card"
      onClick={() => onSelect(ex)}
    >
      {/* Media */}
      <div className="exercise-card-media">
        <CardImage url={ex.mediaUrl} name={ex.name} />
        <div className="exercise-overlay">
          <span className="exercise-play">
            <Play size={16} fill="currentColor" /> Ver ejercicio
          </span>
        </div>
        <button
          className={`exercise-fav${isFavorite ? ' is-active' : ''}`}
          title={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(ex.id);
          }}
        >
          <Heart size={17} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Info */}
      <div className="exercise-card-body">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
          <h3 style={styles.cardTitle}>{ex.name}</h3>
          {ex.isCustom && <span style={styles.customBadgeSmall}>Mío</span>}
        </div>
        {ex.description && <span style={styles.cardSubtitle}>{ex.description}</span>}
        <div className="exercise-tags">
          {ex.targetMuscleGroups.slice(0, 2).map((group) => (
            <span key={group} style={styles.tagMuscle}>
              {group}
            </span>
          ))}
          {ex.equipment && <span style={styles.tagEquipment}>{ex.equipment}</span>}
        </div>
        {ex.isCustom && (
          <div style={styles.cardTools} onClick={(e) => e.stopPropagation()}>
            <button
              title="Editar ejercicio"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(ex);
              }}
              style={styles.cardToolBtn}
            >
              <Edit2 size={14} color="var(--text-muted)" />
            </button>
            <button
              title="Eliminar ejercicio"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(ex);
              }}
              style={styles.cardToolBtnDelete}
            >
              <Trash2 size={14} color="var(--danger-color)" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  cardTitle: {
    fontSize: '1rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    margin: 0,
  },
  cardSubtitle: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  customBadgeSmall: {
    backgroundColor: 'rgba(192, 138, 90, 0.15)',
    color: 'var(--accent-gold)',
    border: '1px solid rgba(192, 138, 90, 0.3)',
    padding: '0.1rem 0.4rem',
    borderRadius: '6px',
    fontSize: '0.7rem',
    fontWeight: 700,
    flexShrink: 0,
  },
  tagMuscle: {
    backgroundColor: 'rgba(192, 138, 90, 0.15)',
    color: 'var(--accent-gold)',
    border: '1px solid rgba(192, 138, 90, 0.28)',
    padding: '0.15rem 0.5rem',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  tagEquipment: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-subtle)',
    padding: '0.15rem 0.5rem',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  cardTools: { display: 'flex', gap: '0.4rem', marginTop: '0.15rem' },
  cardToolBtn: {
    padding: '0.4rem',
    borderRadius: 'var(--radius-element)',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardToolBtnDelete: {
    padding: '0.4rem',
    borderRadius: 'var(--radius-element)',
    backgroundColor: 'rgba(192, 105, 105, 0.12)',
    border: '1px solid rgba(192, 105, 105, 0.2)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
