import React from 'react';
import { Plus, Edit2, X, Trash2 } from 'lucide-react';
import type { ExerciseSummary } from '../../api/api';
import { MUSCLE_GROUPS, EQUIPMENT_OPTIONS } from './ExerciseFilters';

interface ExerciseFormModalProps {
  isModalOpen: boolean;
  editingExercise: ExerciseSummary | null;
  formName: string;
  onFormNameChange: (val: string) => void;
  formMuscle: string;
  onFormMuscleChange: (val: string) => void;
  formEquipment: string;
  onFormEquipmentChange: (val: string) => void;
  formDesc: string;
  onFormDescChange: (val: string) => void;
  formInstructions: string;
  onFormInstructionsChange: (val: string) => void;
  formMediaUrl: string;
  onFormMediaUrlChange: (val: string) => void;
  formSubmitting: boolean;
  formError: string | null;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  deletingExercise: ExerciseSummary | null;
  deleting: boolean;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
}

export const ExerciseFormModal: React.FC<ExerciseFormModalProps> = ({
  isModalOpen,
  editingExercise,
  formName,
  onFormNameChange,
  formMuscle,
  onFormMuscleChange,
  formEquipment,
  onFormEquipmentChange,
  formDesc,
  onFormDescChange,
  formInstructions,
  onFormInstructionsChange,
  formMediaUrl,
  onFormMediaUrlChange,
  formSubmitting,
  formError,
  onSubmit,
  onClose,
  deletingExercise,
  deleting,
  onDeleteConfirm,
  onDeleteCancel,
}) => {
  return (
    <>
      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={onClose}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '580px' }}
          >
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                {editingExercise ? (
                  <Edit2 size={22} color="var(--accent-teal)" />
                ) : (
                  <Plus size={22} color="var(--accent-teal)" />
                )}
                <h2 style={styles.modalTitle}>
                  {editingExercise
                    ? 'Modificar ejercicio personalizado'
                    : 'Nuevo ejercicio personalizado'}
                </h2>
              </div>
              <button style={styles.closeBtn} onClick={onClose}>
                <X size={20} color="var(--text-muted)" />
              </button>
            </div>
            <form onSubmit={onSubmit} style={styles.modalForm}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Nombre del ejercicio *</label>
                <input
                  type="text"
                  placeholder="Ej. Press de Banca con Mancuernas en Suelo"
                  value={formName}
                  onChange={(e) => onFormNameChange(e.target.value)}
                  required
                />
              </div>

              <div style={styles.formRow}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Grupo muscular principal</label>
                  <select
                    value={formMuscle}
                    onChange={(e) => onFormMuscleChange(e.target.value)}
                  >
                    {MUSCLE_GROUPS.filter((m) => m !== 'Todos').map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Equipo utilizado</label>
                  <select
                    value={formEquipment}
                    onChange={(e) => onFormEquipmentChange(e.target.value)}
                  >
                    {EQUIPMENT_OPTIONS.filter((eq) => eq !== 'Todos').map((eq) => (
                      <option key={eq} value={eq}>
                        {eq}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  Nombre secundario / Descripción corta (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. Floor Dumbbell Press (variación para hombro sano)"
                  value={formDesc}
                  onChange={(e) => onFormDescChange(e.target.value)}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>URL de Imagen ilustrativa (opcional)</label>
                <input
                  type="url"
                  placeholder="https://ejemplo.com/imagen.jpg"
                  value={formMediaUrl}
                  onChange={(e) => onFormMediaUrlChange(e.target.value)}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Instrucciones de ejecución (opcional)</label>
                <textarea
                  rows={3}
                  placeholder={
                    '1. Acuéstate sobre el suelo con las rodillas flexionadas...\n2. Empuja las mancuernas hacia el techo...'
                  }
                  value={formInstructions}
                  onChange={(e) => onFormInstructionsChange(e.target.value)}
                />
              </div>

              {formError && <div style={styles.errorAlert}>{formError}</div>}

              <div style={styles.modalActions}>
                <button type="button" style={styles.cancelBtn} onClick={onClose}>
                  Cancelar
                </button>
                <button type="submit" disabled={formSubmitting} style={styles.saveBtn}>
                  {formSubmitting
                    ? 'Guardando...'
                    : editingExercise
                    ? 'Guardar cambios'
                    : 'Crear ejercicio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingExercise && (
        <div className="modal-overlay" onClick={onDeleteCancel}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '440px', textAlign: 'center' }}
          >
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: '50%',
                backgroundColor: 'rgba(192, 105, 105, 0.15)',
                color: 'var(--danger-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
              }}
            >
              <Trash2 size={24} />
            </div>
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                marginBottom: '0.5rem',
              }}
            >
              ¿Eliminar ejercicio?
            </h2>
            <p
              style={{
                color: 'var(--text-muted)',
                fontSize: '0.9rem',
                marginBottom: '1.5rem',
              }}
            >
              ¿Estás seguro de que deseas eliminar <strong>"{deletingExercise.name}"</strong>?
              Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                style={styles.cancelBtn}
                onClick={onDeleteCancel}
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                type="button"
                style={{ ...styles.saveBtn, backgroundColor: 'var(--danger-color)' }}
                onClick={onDeleteConfirm}
                disabled={deleting}
              >
                {deleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const styles: Record<string, React.CSSProperties> = {
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1.5rem',
  },
  modalTitle: { fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' },
  closeBtn: { padding: '0.25rem', background: 'none', border: 'none', cursor: 'pointer' },
  modalForm: { display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 },
  label: { fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' },
  formRow: { display: 'flex', gap: '1rem' },
  errorAlert: {
    backgroundColor: 'rgba(192, 105, 105, 0.15)',
    color: 'var(--danger-color)',
    padding: '0.75rem',
    borderRadius: 'var(--radius-control)',
    fontSize: '0.85rem',
  },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' },
  cancelBtn: {
    padding: '0.75rem 1.25rem',
    borderRadius: 'var(--radius-element)',
    color: 'var(--text-muted)',
    fontWeight: 600,
    background: 'none',
    border: '1px solid var(--border-color)',
    cursor: 'pointer',
  },
  saveBtn: {
    backgroundColor: 'var(--primary)',
    color: 'var(--bg-color)',
    padding: '0.75rem 1.25rem',
    borderRadius: 'var(--radius-element)',
    fontWeight: 700,
    border: 'none',
    cursor: 'pointer',
  },
};
