import React, { useEffect, useMemo, useState } from 'react';
import { Search, Plus, X, CheckCircle, Circle } from 'lucide-react';
import { api, type ExerciseSummary, type Tokens } from '../api/api';
import { matchesSearch } from '../utils/text';

interface MultiExercisePickerModalProps {
  tokens: Tokens;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedExerciseIds: string[]) => Promise<void>;
}

const MUSCLE_GROUPS = [
  'Todos',
  'Pecho',
  'Abdominales',
  'Biceps',
  'Triceps',
  'Hombros',
  'Dorsal',
  'Espalda alta',
  'Espalda baja',
  'Antebrazo',
  'Trapecio',
  'Cuadriceps',
  'Femoral',
  'Gluteos',
  'Pantorrillas',
  'Abductor',
  'Adductor',
  'Cardio',
  'Full body',
];

const EQUIPMENT_OPTIONS = [
  'Todos',
  'Ninguno',
  'Barra',
  'Mancuernas',
  'Kettlebell',
  'Maquinas',
  'Discos',
  'Bandas de resistencia',
  'Otros',
];

export const MultiExercisePickerModal: React.FC<MultiExercisePickerModalProps> = ({
  tokens,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [exercises, setExercises] = useState<ExerciseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState('Todos');
  const [selectedEquipment, setSelectedEquipment] = useState('Todos');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Inline custom exercise form inside picker
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMuscle, setNewMuscle] = useState('Pecho');
  const [newEquipment, setNewEquipment] = useState('Mancuernas');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedIds([]);
      setSearchQuery('');
      setSelectedMuscle('Todos');
      setSelectedEquipment('Todos');
      setIsCreatingCustom(false);
      api.listExercises(tokens.accessToken)
        .then(setExercises)
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [isOpen, tokens]);

  const filteredExercises = useMemo(() => {
    return exercises.filter((ex) => {
      if (searchQuery.trim()) {
        if (!matchesSearch(ex.name, searchQuery)) return false;
      }
      if (selectedMuscle !== 'Todos') {
        const hasGroup = ex.targetMuscleGroups.some((m) => matchesSearch(m, selectedMuscle));
        if (!hasGroup) return false;
      }
      if (selectedEquipment !== 'Todos') {
        const target = selectedEquipment.toLowerCase().trim();
        if (target === 'ninguno') {
          if (ex.equipment && ex.equipment.toLowerCase().trim() !== 'ninguno') return false;
        } else if (!ex.equipment || ex.equipment.toLowerCase().trim() !== target) {
          return false;
        }
      }
      return true;
    });
  }, [exercises, searchQuery, selectedMuscle, selectedEquipment]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleConfirm = async () => {
    if (selectedIds.length === 0) return;
    setSubmitting(true);
    try {
      await onConfirm(selectedIds);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const created = await api.createExercise(tokens.accessToken, {
        name: newName.trim(),
        targetMuscleGroups: [newMuscle],
        equipment: newEquipment,
      });
      setExercises((prev) => [created, ...prev]);
      setSelectedIds((prev) => [...prev, created.id]);
      setIsCreatingCustom(false);
      setNewName('');
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'No fue posible crear el ejercicio.');
    } finally {
      setCreating(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      if (selectedIds.length > 0) {
        return;
      }
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={handleOverlayClick}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={styles.modalContent}>
        {/* Top Bar with Cancel Link */}
        <div style={styles.header}>
          <button style={styles.cancelBtn} onClick={onClose}>Cancelar</button>
          <h2 style={styles.title}>Seleccionar ejercicios</h2>
          <button style={styles.customBtn} onClick={() => setIsCreatingCustom(!isCreatingCustom)}>
            <Plus size={16} />
            <span>Crear</span>
          </button>
        </div>

        {/* Custom Exercise Creator — full panel like the library */}
        {isCreatingCustom && (
          <form onSubmit={handleCreateCustom} style={styles.customPanel}>
            <div style={styles.customPanelHeader}>
              <h3 style={styles.customTitle}>Nuevo ejercicio personalizado</h3>
              <button type="button" onClick={() => setIsCreatingCustom(false)} style={styles.customCloseBtn}>
                <X size={18} color="#94a3b8" />
              </button>
            </div>

            <div style={styles.customFieldGroup}>
              <label style={styles.customLabel}>Nombre del ejercicio *</label>
              <input
                type="text"
                placeholder="Ej. Press de Banca con Mancuernas"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div style={styles.formRow}>
              <div style={styles.customFieldGroup}>
                <label style={styles.customLabel}>Grupo muscular</label>
                <select value={newMuscle} onChange={(e) => setNewMuscle(e.target.value)}>
                  {MUSCLE_GROUPS.filter((m) => m !== 'Todos').map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div style={styles.customFieldGroup}>
                <label style={styles.customLabel}>Equipo</label>
                <select value={newEquipment} onChange={(e) => setNewEquipment(e.target.value)}>
                  {EQUIPMENT_OPTIONS.filter((eq) => eq !== 'Todos').map((eq) => (
                    <option key={eq} value={eq}>{eq}</option>
                  ))}
                </select>
              </div>
            </div>

            {createError && <div style={styles.errorText}>{createError}</div>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" onClick={() => setIsCreatingCustom(false)} style={styles.cancelCustomBtn}>
                Cancelar
              </button>
              <button type="submit" disabled={creating} style={styles.addCustomBtn}>
                {creating ? 'Creando...' : 'Crear y seleccionar'}
              </button>
            </div>
          </form>
        )}

        {/* Search & Filters */}
        <div style={styles.controlsRow}>
          <div style={styles.searchWrapper}>
            <Search size={18} color="#94a3b8" style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Buscar ejercicio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
            {searchQuery && (
              <button style={styles.clearSearch} onClick={() => setSearchQuery('')}>
                <X size={16} color="#94a3b8" />
              </button>
            )}
          </div>

          <div style={styles.filterDropdowns}>
            <select value={selectedMuscle} onChange={(e) => setSelectedMuscle(e.target.value)}>
              {MUSCLE_GROUPS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            <select value={selectedEquipment} onChange={(e) => setSelectedEquipment(e.target.value)}>
              {EQUIPMENT_OPTIONS.map((eq) => (
                <option key={eq} value={eq}>{eq}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Exercises List */}
        {loading ? (
          <div style={styles.loadingText}>Cargando ejercicios...</div>
        ) : (
          <div style={styles.list}>
            {filteredExercises.map((ex) => {
              const isSelected = selectedIds.includes(ex.id);
              return (
                <div
                  key={ex.id}
                  style={{
                    ...styles.row,
                    ...(isSelected ? styles.rowSelected : {}),
                  }}
                  onClick={() => toggleSelect(ex.id)}
                >
                  <div style={styles.rowLeft}>
                    {isSelected ? <CheckCircle size={22} color="#2563eb" /> : <Circle size={22} color="#94a3b8" />}
                    <div>
                      <div style={styles.exName}>{ex.name}</div>
                      <div style={styles.exMuscle}>{ex.targetMuscleGroups.join(', ')}</div>
                    </div>
                  </div>
                  {ex.equipment && <span style={styles.exEquip}>{ex.equipment}</span>}
                </div>
              );
            })}
          </div>
        )}

        {/* Sticky Confirm Bar */}
        {selectedIds.length > 0 && (
          <div style={styles.bottomBar}>
            <button style={styles.confirmBtn} onClick={handleConfirm} disabled={submitting}>
              {submitting
                ? 'Añadiendo...'
                : `Añadir ${selectedIds.length} ${selectedIds.length === 1 ? 'ejercicio' : 'ejercicios'}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  modalContent: {
    maxWidth: '680px',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cancelBtn: {
    color: '#10b981',
    fontWeight: 600,
    fontSize: '0.95rem',
  },
  title: {
    fontSize: '1.15rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  customBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    color: '#10b981',
    padding: '0.4rem 0.75rem',
    borderRadius: '8px',
    fontWeight: 600,
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
  },
  customPanel: {
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '14px',
    padding: '1.25rem 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  customPanelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  customTitle: {
    fontSize: '1rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  customCloseBtn: {
    padding: '0.25rem',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  customFieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
    flex: 1,
  },
  customLabel: {
    fontSize: '0.82rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
  },
  formRow: {
    display: 'flex',
    gap: '0.75rem',
  },
  addCustomBtn: {
    backgroundColor: 'var(--accent-teal)',
    color: '#0b0f19',
    padding: '0.65rem 1.25rem',
    borderRadius: '10px',
    fontWeight: 700,
    fontSize: '0.9rem',
    border: 'none',
    cursor: 'pointer',
  },
  cancelCustomBtn: {
    padding: '0.65rem 1rem',
    borderRadius: '10px',
    color: 'var(--text-muted)',
    fontWeight: 600,
    background: 'none',
    border: '1px solid var(--border-color)',
    cursor: 'pointer',
  },
  errorText: {
    color: 'var(--danger-color)',
    fontSize: '0.8rem',
  },
  controlsRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  searchWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: '100%',
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
  },
  searchInput: {
    width: '100%',
    paddingLeft: '2.5rem',
    paddingRight: '2.5rem',
  },
  clearSearch: {
    position: 'absolute',
    right: '12px',
    padding: '4px',
  },
  filterDropdowns: {
    display: 'flex',
    gap: '0.75rem',
  },
  loadingText: {
    color: 'var(--text-muted)',
    textAlign: 'center',
    padding: '2rem',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    maxHeight: '380px',
    overflowY: 'auto',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'var(--input-bg)',
    padding: '0.85rem 1rem',
    borderRadius: '12px',
    cursor: 'pointer',
    border: '1px solid var(--border-color)',
  },
  rowSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10b981',
  },
  rowLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  exName: {
    fontWeight: 600,
    fontSize: '0.9rem',
    color: 'var(--text-primary)',
  },
  exMuscle: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
  },
  exEquip: {
    fontSize: '0.75rem',
    color: '#10b981',
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    padding: '0.2rem 0.5rem',
    borderRadius: '6px',
  },
  bottomBar: {
    marginTop: '0.5rem',
    paddingTop: '0.75rem',
    borderTop: '1px solid var(--border-color)',
  },
  confirmBtn: {
    backgroundColor: '#10b981',
    color: '#ffffff',
    padding: '0.85rem',
    borderRadius: '12px',
    fontWeight: 700,
    fontSize: '0.95rem',
    width: '100%',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
  },
};
