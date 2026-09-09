import React, { useEffect, useState } from 'react';
import { Trophy, Clock, Dumbbell, Repeat, Flame, ArrowRight, CheckCircle2, Share2 } from 'lucide-react';

export interface WorkoutSummaryData {
  workoutId?: string;
  durationSeconds: number;
  totalVolume: number;
  completedSetsCount: number;
  totalReps: number;
  prsAchieved: Array<{
    exerciseName: string;
    weight: number;
    repetitions: number;
    reason: string;
  }>;
  exercisesSummary: Array<{
    name: string;
    setsCompleted: number;
  }>;
}

interface WorkoutSummaryModalProps {
  isOpen: boolean;
  data: WorkoutSummaryData;
  onClose: () => void;
  onShare?: (workoutId: string, caption: string) => Promise<void> | void;
  onGoToFeed?: () => void;
  isSharing?: boolean;
}

export const WorkoutSummaryModal: React.FC<WorkoutSummaryModalProps> = ({
  isOpen,
  data,
  onClose,
  onShare,
  onGoToFeed,
  isSharing = false,
}) => {
  const [caption, setCaption] = useState('');
  const [shared, setShared] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setCaption('');
    setShared(false);
  }, [isOpen, data.workoutId]);

  if (!isOpen) return null;

  const minutes = Math.floor(data.durationSeconds / 60);
  const seconds = data.durationSeconds % 60;
  const timeFormatted = `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  const canShare = Boolean(onShare) && Boolean(data.workoutId) && !shared;

  const handleShare = async () => {
    if (!canShare || !data.workoutId) return;
    try {
      await onShare?.(data.workoutId, caption.trim());
      setShared(true);
    } catch {
      setShared(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '560px',
          textAlign: 'center',
          padding: '2.5rem 2rem',
          position: 'relative',
        }}
      >
        {/* Confetti & Trophy Animation Header */}
        <div style={styles.trophyWrapper}>
          <div style={styles.trophyHalo} />
          <Trophy size={48} color="var(--accent-gold)" />
        </div>

        <span style={styles.celebrationSub}>¡SESIÓN COMPLETADA!</span>
        <h2 style={styles.celebrationTitle}>¡Entrenamiento Destruido!</h2>
        <p style={styles.celebrationDesc}>
          Excelente trabajo de sobrecarga hoy. Cada repetición suma para tu versión más fuerte.
        </p>

        {/* 4-Stat Metric Grid */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <Clock size={20} color="var(--accent-teal)" style={{ marginBottom: '0.35rem' }} />
            <span style={styles.statValue}>{timeFormatted}</span>
            <span style={styles.statLabel}>Tiempo Total</span>
          </div>

          <div style={styles.statCard}>
            <Dumbbell size={20} color="var(--accent-teal)" style={{ marginBottom: '0.35rem' }} />
            <span style={styles.statValue}>{data.totalVolume.toLocaleString()} kg</span>
            <span style={styles.statLabel}>Volumen Movido</span>
          </div>

          <div style={styles.statCard}>
            <CheckCircle2 size={20} color="var(--accent-green)" style={{ marginBottom: '0.35rem' }} />
            <span style={styles.statValue}>{data.completedSetsCount}</span>
            <span style={styles.statLabel}>Series Efectivas</span>
          </div>

          <div style={styles.statCard}>
            <Repeat size={20} color="var(--accent-blue)" style={{ marginBottom: '0.35rem' }} />
            <span style={styles.statValue}>{data.totalReps}</span>
            <span style={styles.statLabel}>Reps Totales</span>
          </div>
        </div>

        {/* PRs Section if any were achieved */}
        {data.prsAchieved.length > 0 && (
          <div style={styles.prSection}>
            <div style={styles.prHeader}>
              <Flame size={18} color="var(--accent-gold)" />
              <span style={styles.prTitle}>
                ¡{data.prsAchieved.length} Récord{data.prsAchieved.length > 1 ? 's' : ''} Personal{data.prsAchieved.length > 1 ? 'es' : ''} Roto{data.prsAchieved.length > 1 ? 's' : ''}!
              </span>
            </div>
            <div style={styles.prList}>
              {data.prsAchieved.map((pr, idx) => (
                <div key={idx} style={styles.prCard}>
                  <div style={{ textAlign: 'left' }}>
                    <div style={styles.prExName}>{pr.exerciseName}</div>
                    <div style={styles.prReason}>{pr.reason}</div>
                  </div>
                  <div style={styles.prBadge}>
                    {pr.weight} kg × {pr.repetitions}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Exercise breakdown list */}
        {data.exercisesSummary.length > 0 && (
          <div style={styles.exSummaryList}>
            <span style={styles.exSummaryTitle}>Ejercicios de hoy:</span>
            <div style={styles.exBadgesRow}>
              {data.exercisesSummary.map((ex, idx) => (
                <span key={idx} style={styles.exBadge}>
                  {ex.name} <strong style={{ color: 'var(--accent-teal)' }}>({ex.setsCompleted} series)</strong>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Share to Social */}
        {onShare && (
          <div style={styles.shareBox}>
            <div style={styles.shareHeader}>
              <Share2 size={17} color={shared ? 'var(--accent-green)' : 'var(--accent-teal)'} />
              <span style={styles.shareTitle}>
                {shared ? '¡Entrenamiento publicado en Social!' : 'Compartir en Social'}
              </span>
            </div>
            {!shared ? (
              <>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Cuéntale a la comunidad cómo fue la sesión… (opcional)"
                  rows={2}
                  maxLength={280}
                  style={styles.captionInput}
                />
                <button
                  style={{
                    ...styles.shareBtn,
                    ...(isSharing || !data.workoutId ? { opacity: 0.55, cursor: 'default' } : {}),
                  }}
                  onClick={handleShare}
                  disabled={isSharing || !data.workoutId}
                >
                  <Share2 size={15} />
                  {isSharing ? 'Publicando...' : 'Publicar entrenamiento'}
                </button>
              </>
            ) : (
              <div style={styles.sharedRow}>
                <CheckCircle2 size={18} color="var(--accent-green)" />
                <span style={styles.sharedText}>
                  Tu sesión ya está en el feed de la comunidad.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Primary CTA button */}
        <button style={styles.ctaButton} onClick={shared && onGoToFeed ? onGoToFeed : onClose}>
          <span>{shared ? (onGoToFeed ? 'Ver mi publicación' : 'Listo') : 'Continuar al Historial'}</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  trophyWrapper: {
    width: '88px',
    height: '88px',
    borderRadius: 'var(--radius-container)',
    backgroundColor: 'rgba(192, 138, 90, 0.12)',
    border: '1px solid rgba(192, 138, 90, 0.28)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1.25rem',
    position: 'relative',
  },
  trophyHalo: {
    position: 'absolute',
    inset: -8,
    borderRadius: 'var(--radius-container)',
    background: 'radial-gradient(circle, rgba(192, 138, 90, 0.18) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  celebrationSub: {
    fontSize: '0.78rem',
    fontWeight: 800,
    letterSpacing: '0.12em',
    color: 'var(--accent-gold)',
    marginBottom: '0.35rem',
    display: 'block',
  },
  celebrationTitle: {
    fontSize: '1.85rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    letterSpacing: '-0.03em',
    marginBottom: '0.6rem',
  },
  celebrationDesc: {
    color: 'var(--text-muted)',
    fontSize: '0.92rem',
    lineHeight: 1.5,
    marginBottom: '2rem',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '0.85rem',
    marginBottom: '1.5rem',
  },
  statCard: {
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-element)',
    padding: '1.15rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: '1.35rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
    marginBottom: '0.2rem',
  },
  statLabel: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--text-dim)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  prSection: {
    backgroundColor: 'rgba(192, 138, 90, 0.08)',
    border: '1px solid rgba(192, 138, 90, 0.25)',
    borderRadius: 'var(--radius-element)',
    padding: '1rem 1.25rem',
    marginBottom: '1.5rem',
  },
  prHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.45rem',
    justifyContent: 'center',
    marginBottom: '0.75rem',
  },
  prTitle: {
    fontSize: '0.88rem',
    fontWeight: 800,
    color: 'var(--accent-gold)',
    letterSpacing: '-0.01em',
  },
  prList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  prCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'var(--surface-color)',
    padding: '0.6rem 0.85rem',
    borderRadius: '10px',
    border: '1px solid rgba(192, 138, 90, 0.15)',
  },
  prExName: {
    fontSize: '0.86rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  prReason: {
    fontSize: '0.74rem',
    color: 'var(--text-muted)',
  },
  prBadge: {
    fontSize: '0.78rem',
    fontWeight: 800,
    color: 'var(--accent-gold)',
    backgroundColor: 'rgba(192, 138, 90, 0.12)',
    padding: '0.25rem 0.55rem',
    borderRadius: '6px',
  },
  exSummaryList: {
    marginBottom: '2rem',
    textAlign: 'left',
  },
  exSummaryTitle: {
    fontSize: '0.78rem',
    fontWeight: 700,
    color: 'var(--text-dim)',
    display: 'block',
    marginBottom: '0.5rem',
  },
  exBadgesRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.4rem',
  },
  exBadge: {
    fontSize: '0.76rem',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    padding: '0.25rem 0.6rem',
    borderRadius: '8px',
    color: 'var(--text-secondary)',
  },
  ctaButton: {
    width: '100%',
    padding: '1rem',
    borderRadius: 'var(--radius-control)',
    backgroundColor: 'var(--accent-teal)',
    color: 'var(--bg-color)',
    fontSize: '1rem',
    fontWeight: 800,
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    transition: 'background-color 0.15s ease',
  },
  shareBox: {
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-element)',
    padding: '1rem 1.15rem',
    marginBottom: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.7rem',
  },
  shareHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.45rem',
  },
  shareTitle: {
    fontSize: '0.88rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    letterSpacing: '-0.01em',
    textAlign: 'left',
  },
  captionInput: {
    width: '100%',
    boxSizing: 'border-box',
    resize: 'vertical',
    minHeight: '56px',
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: '10px',
    padding: '0.65rem 0.8rem',
    color: 'var(--text-primary)',
    fontSize: '0.88rem',
    fontFamily: 'inherit',
    outline: 'none',
  },
  shareBtn: {
    alignSelf: 'flex-start',
    display: 'flex',
    alignItems: 'center',
    gap: '0.45rem',
    backgroundColor: 'rgba(192, 138, 90, 0.12)',
    border: '1px solid rgba(192, 138, 90, 0.3)',
    color: 'var(--accent-gold)',
    padding: '0.6rem 1rem',
    borderRadius: '10px',
    fontWeight: 700,
    fontSize: '0.85rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  sharedRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  sharedText: {
    fontSize: '0.85rem',
    color: 'var(--accent-green)',
    fontWeight: 600,
    textAlign: 'left',
  },
};
