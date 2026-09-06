import React from 'react';
import { Trophy, Clock, Dumbbell, Repeat, Flame, ArrowRight, CheckCircle2 } from 'lucide-react';

export interface WorkoutSummaryData {
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
}

export const WorkoutSummaryModal: React.FC<WorkoutSummaryModalProps> = ({
  isOpen,
  data,
  onClose,
}) => {
  if (!isOpen) return null;

  const minutes = Math.floor(data.durationSeconds / 60);
  const seconds = data.durationSeconds % 60;
  const timeFormatted = `${minutes}m ${seconds.toString().padStart(2, '0')}s`;

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
            <CheckCircle2 size={20} color="#22c55e" style={{ marginBottom: '0.35rem' }} />
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

        {/* Primary CTA button */}
        <button style={styles.ctaButton} onClick={onClose}>
          <span>Continuar al Historial</span>
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
    borderRadius: '28px',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    border: '1px solid rgba(245, 158, 11, 0.28)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1.25rem',
    position: 'relative',
    boxShadow: '0 0 32px rgba(245, 158, 11, 0.2)',
  },
  trophyHalo: {
    position: 'absolute',
    inset: -8,
    borderRadius: '32px',
    background: 'radial-gradient(circle, rgba(245, 158, 11, 0.18) 0%, transparent 70%)',
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
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.85rem',
    marginBottom: '1.5rem',
  },
  statCard: {
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '16px',
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
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    border: '1px solid rgba(245, 158, 11, 0.25)',
    borderRadius: '16px',
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
    border: '1px solid rgba(245, 158, 11, 0.15)',
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
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
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
    borderRadius: '14px',
    backgroundColor: 'var(--accent-teal)',
    color: '#000000',
    fontSize: '1rem',
    fontWeight: 800,
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    boxShadow: '0 4px 20px var(--accent-teal-glow)',
    transition: 'all 0.15s ease',
  },
};
