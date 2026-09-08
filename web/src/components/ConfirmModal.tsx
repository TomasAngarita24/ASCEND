import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const accentColor = variant === 'danger' ? 'var(--danger-color)' : 'var(--accent-gold)';
  const accentBg = variant === 'danger' ? 'rgba(192, 105, 105, 0.12)' : 'rgba(192, 138, 90, 0.12)';
  const accentBorder = variant === 'danger' ? 'rgba(192, 105, 105, 0.28)' : 'rgba(192, 138, 90, 0.28)';

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '460px', textAlign: 'center', position: 'relative' }}
      >
        <button
          onClick={onCancel}
          style={{
            position: 'absolute',
            top: '1.1rem',
            right: '1.1rem',
            padding: '0.35rem',
            borderRadius: 'var(--radius-element)',
            backgroundColor: 'transparent',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <X size={18} />
        </button>

        <div
          style={{
            width: '54px',
            height: '54px',
            borderRadius: 'var(--radius-element)',
            backgroundColor: accentBg,
            border: `1px solid ${accentBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.2rem',
          }}
        >
          <AlertTriangle size={24} color={accentColor} />
        </div>

        <h3
          style={{
            fontSize: '1.2rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            marginBottom: '0.55rem',
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </h3>

        <p
          style={{
            color: 'var(--text-muted)',
            fontSize: '0.9rem',
            lineHeight: 1.55,
            marginBottom: '1.75rem',
          }}
        >
          {message}
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '0.7rem 1.4rem',
              borderRadius: 'var(--radius-control)',
              backgroundColor: 'var(--input-bg)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.9rem',
            }}
          >
            {cancelLabel}
          </button>

          <button
            onClick={() => { onConfirm(); }}
            style={{
              padding: '0.7rem 1.4rem',
              borderRadius: 'var(--radius-control)',
              backgroundColor: accentBg,
              border: `1px solid ${accentBorder}`,
              color: accentColor,
              fontWeight: 700,
              fontSize: '0.9rem',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
