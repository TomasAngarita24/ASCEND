import React, { useCallback, useEffect, useState } from 'react';
import {
  ClipboardList,
  Dumbbell,
  Filter,
  Layers,
  Loader2,
  Plus,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  api,
  type RoutineDetail,
  type RoutineTemplateDetail,
  type RoutineTemplateFilters,
  type RoutineTemplateGoal,
  type RoutineTemplateLevel,
  type RoutineTemplateSummary,
  type Tokens,
} from '../api/api';

interface RoutineTemplatesModalProps {
  tokens: Tokens;
  onClose: () => void;
  onAdded: (routine: RoutineDetail) => void;
}

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
};

const GOAL_LABELS: Record<string, string> = {
  strength: 'Fuerza',
  hypertrophy: 'Hipertrofia',
  general: 'General',
};

const EQUIPMENT_LABELS: Record<string, string> = {
  Barra: 'Barra',
  Mancuernas: 'Mancuernas',
  Maquinas: 'Máquinas',
  Ninguno: 'Sin material',
};

export const RoutineTemplatesModal: React.FC<RoutineTemplatesModalProps> = ({ tokens, onClose, onAdded }) => {
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<RoutineTemplateSummary[]>([]);
  const [level, setLevel] = useState<RoutineTemplateLevel | ''>('');
  const [goal, setGoal] = useState<RoutineTemplateGoal | ''>('');
  const [equipment, setEquipment] = useState('');

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, RoutineTemplateDetail>>({});
  const [detailLoading, setDetailLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filters: RoutineTemplateFilters = {};
      if (level) filters.level = level;
      if (goal) filters.goal = goal;
      if (equipment) filters.equipment = equipment;
      const data = await api.listRoutineTemplates(tokens.accessToken, filters);
      setTemplates(data);
    } catch {
      toast.error('No fue posible cargar las plantillas.');
    } finally {
      setLoading(false);
    }
  }, [tokens, level, goal, equipment]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleExpand = async (templateId: string) => {
    if (expandedId === templateId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(templateId);
    if (details[templateId]) return;
    setDetailLoading(true);
    try {
      const detail = await api.getRoutineTemplate(tokens.accessToken, templateId);
      setDetails((prev) => ({ ...prev, [templateId]: detail }));
    } catch {
      toast.error('No fue posible cargar el detalle de la plantilla.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAdd = async (templateId: string) => {
    setAddingId(templateId);
    try {
      const routine = await api.addRoutineTemplate(tokens.accessToken, templateId);
      toast.success('Plantilla añadida a Mis Rutinas');
      onAdded(routine);
      onClose();
    } catch {
      toast.error('No fue posible añadir la plantilla.');
    } finally {
      setAddingId(null);
    }
  };

  const filterChip = (
    label: string,
    active: boolean,
    onClick: () => void,
  ): React.ReactElement => (
    <button
      key={label}
      style={{ ...styles.chip, ...(active ? styles.chipActive : {}) }}
      onClick={onClick}
    >
      {label}
    </button>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '820px', maxHeight: '86vh', display: 'flex', flexDirection: 'column', padding: '2rem' }}
      >
        <div style={styles.modalHeader}>
          <div style={styles.modalHeaderLeft}>
            <ClipboardList size={22} color="var(--accent-teal)" />
            <h2 style={styles.modalTitle}>Plantillas de rutina</h2>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={20} color="var(--text-muted)" />
          </button>
        </div>
        <p style={styles.modalSubtitle}>
          Explora programas predefinidos y añádelos como rutina propia con un clic.
        </p>

        <div style={styles.filtersBox}>
          <div style={styles.filterLabel}>
            <Filter size={13} color="var(--text-muted)" />
            <span>Filtros</span>
          </div>
          <div style={styles.filterRow}>
            {(['', 'beginner', 'intermediate', 'advanced'] as const).map((value) =>
              filterChip(
                value === '' ? 'Todos los niveles' : LEVEL_LABELS[value],
                level === value,
                () => setLevel(value),
              ),
            )}
          </div>
          <div style={styles.filterRow}>
            {(['', 'strength', 'hypertrophy', 'general'] as const).map((value) =>
              filterChip(
                value === '' ? 'Todos los objetivos' : GOAL_LABELS[value],
                goal === value,
                () => setGoal(value),
              ),
            )}
          </div>
          <div style={styles.filterRow}>
            {(['', 'Barra', 'Mancuernas', 'Maquinas', 'Ninguno'] as const).map((value) =>
              filterChip(
                value === '' ? 'Todo el equipo' : EQUIPMENT_LABELS[value],
                equipment === value,
                () => setEquipment(value),
              ),
            )}
          </div>
        </div>

        <div style={styles.list}>
          {loading ? (
            <div style={styles.emptyState}>
              <Loader2 size={26} className="spin" color="var(--accent-teal)" />
              <span>Cargando plantillas...</span>
            </div>
          ) : templates.length === 0 ? (
            <div style={styles.emptyState}>
              <ClipboardList size={26} color="var(--text-dim)" />
              <span>No hay plantillas que coincidan con los filtros.</span>
            </div>
          ) : (
            templates.map((template) => {
              const isExpanded = expandedId === template.id;
              const detail = details[template.id];
              return (
                <div key={template.id} style={styles.templateCard}>
                  <div style={styles.templateCardTop}>
                    <div style={styles.templateIconBadge}>
                      <Dumbbell size={18} color="var(--accent-teal)" />
                    </div>
                    <div style={styles.templateInfo}>
                      <h3 style={styles.templateName}>{template.name}</h3>
                      <p style={styles.templateDescription}>{template.description}</p>
                      <div style={styles.templateMetaRow}>
                        <span style={styles.templatePill}>{LEVEL_LABELS[template.level] ?? template.level}</span>
                        <span style={styles.templatePill}>{GOAL_LABELS[template.goal] ?? template.goal}</span>
                        <span style={styles.templatePill}>{EQUIPMENT_LABELS[template.equipment] ?? template.equipment}</span>
                        <span style={styles.templatePill}>
                          <Layers size={12} color="var(--accent-teal)" />
                          {template.exerciseCount} {template.exerciseCount === 1 ? 'ejercicio' : 'ejercicios'}
                        </span>
                      </div>
                    </div>
                    <div style={styles.templateActions}>
                      <button style={styles.viewBtn} onClick={() => toggleExpand(template.id)}>
                        {isExpanded ? 'Ocultar' : 'Ver ejercicios'}
                      </button>
                      <button style={styles.addBtn} onClick={() => handleAdd(template.id)} disabled={addingId === template.id}>
                        {addingId === template.id ? (
                          <Loader2 size={15} className="spin" />
                        ) : (
                          <Plus size={15} />
                        )}
                        <span>Añadir</span>
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={styles.exerciseList}>
                      {detailLoading && !detail ? (
                        <div style={styles.emptyState}>
                          <Loader2 size={20} className="spin" color="var(--accent-teal)" />
                          <span>Cargando ejercicios...</span>
                        </div>
                      ) : detail ? (
                        detail.exercises.map((ex) => (
                          <div key={ex.id} style={styles.exerciseRow}>
                            <span style={styles.exercisePosition}>{ex.position}</span>
                            <span style={styles.exerciseName}>{ex.exercise.name}</span>
                            <span style={styles.exerciseSetsRow}>
                              {ex.targetSets ?? '-'} x{' '}
                              {ex.targetRepetitionsMin !== null && ex.targetRepetitionsMax !== null
                                ? `${ex.targetRepetitionsMin}-${ex.targetRepetitionsMax}`
                                : '-'}
                              {ex.restSeconds ? (
                                <span style={styles.exerciseRest}>
                                  {Math.round(ex.restSeconds / 60)} min {ex.restSeconds % 60} s
                                </span>
                              ) : null}
                            </span>
                          </div>
                        ))
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })
          )}
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
    gap: '1rem',
  },
  modalHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  modalTitle: {
    fontSize: '1.35rem',
    fontWeight: 700,
    color: 'var(--text-color)',
    margin: 0,
  },
  modalSubtitle: {
    fontSize: '0.9rem',
    color: 'var(--text-muted)',
    margin: '0.35rem 0 1.25rem',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '0.35rem',
    display: 'flex',
    alignItems: 'center',
    borderRadius: '8px',
  },
  filtersBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
    padding: '1rem 1.1rem',
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-container)',
    marginBottom: '1.25rem',
  },
  filterLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    fontSize: '0.72rem',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--text-muted)',
  },
  filterRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.45rem',
  },
  chip: {
    padding: '0.4rem 0.85rem',
    borderRadius: '999px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-color)',
    color: 'var(--text-muted)',
    fontSize: '0.8rem',
    cursor: 'pointer',
    transition: 'background-color 160ms ease, color 160ms ease, border-color 160ms ease',
  },
  chipActive: {
    backgroundColor: 'color-mix(in srgb, var(--accent-teal) 18%, var(--bg-color))',
    borderColor: 'var(--accent-teal)',
    color: 'var(--accent-teal)',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.85rem',
    overflowY: 'auto',
  },
  templateCard: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-container)',
    padding: '1.1rem 1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.85rem',
  },
  templateCardTop: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem',
  },
  templateIconBadge: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    backgroundColor: 'color-mix(in srgb, var(--accent-teal) 14%, transparent)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  templateInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem',
  },
  templateName: {
    fontSize: '1.02rem',
    fontWeight: 700,
    color: 'var(--text-color)',
    margin: 0,
  },
  templateDescription: {
    fontSize: '0.86rem',
    color: 'var(--text-muted)',
    margin: 0,
    lineHeight: 1.45,
  },
  templateMetaRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.4rem',
    marginTop: '0.25rem',
  },
  templatePill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.3rem',
    padding: '0.22rem 0.6rem',
    borderRadius: '999px',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-muted)',
    fontSize: '0.72rem',
  },
  templateActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    flexShrink: 0,
  },
  viewBtn: {
    padding: '0.5rem 0.9rem',
    borderRadius: '10px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'transparent',
    color: 'var(--text-muted)',
    fontSize: '0.8rem',
    cursor: 'pointer',
  },
  addBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.4rem',
    padding: '0.5rem 0.9rem',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: 'var(--accent-teal)',
    color: 'var(--bg-color)',
    fontSize: '0.82rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  exerciseList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
    borderTop: '1px solid var(--border-color)',
    paddingTop: '0.85rem',
  },
  exerciseRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: '0.4rem 0.55rem',
    borderRadius: '8px',
    backgroundColor: 'var(--input-bg)',
  },
  exercisePosition: {
    width: '26px',
    height: '26px',
    borderRadius: '50%',
    backgroundColor: 'color-mix(in srgb, var(--accent-teal) 18%, transparent)',
    color: 'var(--accent-teal)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: 700,
    flexShrink: 0,
  },
  exerciseName: {
    flex: 1,
    fontSize: '0.85rem',
    color: 'var(--text-color)',
  },
  exerciseSetsRow: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
  },
  exerciseRest: {
    marginLeft: '0.5rem',
    color: 'var(--text-dim)',
    fontSize: '0.75rem',
  },
  emptyState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: '0.6rem',
    padding: '2.5rem 1rem',
    color: 'var(--text-dim)',
    fontSize: '0.9rem',
  },
};