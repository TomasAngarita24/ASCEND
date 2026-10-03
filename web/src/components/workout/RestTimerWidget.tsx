import React from 'react';
import { Timer, Volume2, VolumeX, Play, Pause } from 'lucide-react';

interface RestTimerWidgetProps {
  isRestTimerActive: boolean;
  isRestPaused: boolean;
  restSecondsLeft: number | null;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onResume: () => void;
  onPause: () => void;
  onAdd30s: () => void;
  onDismiss: () => void;
}

export const RestTimerWidget: React.FC<RestTimerWidgetProps> = ({
  isRestTimerActive,
  isRestPaused,
  restSecondsLeft,
  soundEnabled,
  onToggleSound,
  onResume,
  onPause,
  onAdd30s,
  onDismiss,
}) => {
  if (!isRestTimerActive || restSecondsLeft === null) return null;

  return (
    <div style={styles.restBanner}>
      <div style={styles.restLeft}>
        <div style={styles.restIconRing}>
          <Timer size={20} color="var(--accent-teal)" />
        </div>
        <div>
          <div style={styles.restTitle}>
            {isRestPaused ? 'DESCANSO EN PAUSA' : 'TIEMPO DE DESCANSO'}
          </div>
          <div style={styles.restTime}>
            {Math.floor(restSecondsLeft / 60)}:
            {(restSecondsLeft % 60) < 10 ? '0' : ''}
            {restSecondsLeft % 60}
          </div>
        </div>
      </div>
      <div style={styles.restControls}>
        <button
          style={styles.restBtnMute}
          onClick={onToggleSound}
          title={
            soundEnabled
              ? 'Aviso sonoro activado (clic para silenciar)'
              : 'Aviso sonoro silenciado (clic para activar)'
          }
          aria-label={
            soundEnabled
              ? 'Silenciar aviso sonoro de descanso'
              : 'Activar aviso sonoro de descanso'
          }
        >
          {soundEnabled ? (
            <Volume2 size={16} color="var(--accent-teal)" />
          ) : (
            <VolumeX size={16} color="var(--text-muted)" />
          )}
        </button>
        {isRestPaused ? (
          <button
            style={styles.restBtn}
            onClick={onResume}
            title="Reanudar el descanso"
            aria-label="Reanudar el temporizador de descanso"
          >
            <Play size={16} color="var(--accent-teal)" />
            Reanudar
          </button>
        ) : (
          <button
            style={styles.restBtn}
            onClick={onPause}
            title="Pausar el descanso (el chime y la notificación no sonarán hasta que reanudes)"
            aria-label="Pausar el temporizador de descanso"
          >
            <Pause size={16} color="var(--accent-teal)" />
            Pausar
          </button>
        )}
        {!isRestPaused && (
          <button style={styles.restBtn} onClick={onAdd30s}>
            +30s
          </button>
        )}
        <button style={styles.restBtnDismiss} onClick={onDismiss}>
          Omitir
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  restBanner: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-highlight)',
    borderRadius: 'var(--radius-container)',
    padding: '1.1rem 1.75rem',
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
  restIconRing: {
    width: '42px',
    height: '42px',
    borderRadius: 'var(--radius-container)',
    backgroundColor: 'rgba(192, 138, 90, 0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  restTitle: {
    fontSize: '0.72rem',
    fontWeight: 800,
    color: 'var(--accent-teal)',
    letterSpacing: '0.06em',
  },
  restTime: {
    fontSize: '1.4rem',
    fontWeight: 800,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-primary)',
  },
  restControls: {
    display: 'flex',
    gap: '0.65rem',
    flexWrap: 'wrap',
  },
  restBtn: {
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    padding: '0.5rem 0.9rem',
    borderRadius: 'var(--radius-control)',
    fontWeight: 700,
    fontSize: '0.85rem',
  },
  restBtnMute: {
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    padding: '0.45rem 0.65rem',
    borderRadius: 'var(--radius-control)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  restBtnDismiss: {
    backgroundColor: 'transparent',
    color: 'var(--text-muted)',
    padding: '0.5rem 0.9rem',
    borderRadius: 'var(--radius-control)',
    fontWeight: 600,
    fontSize: '0.85rem',
  },
};
