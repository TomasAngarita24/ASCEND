import React, { useEffect, useState } from 'react';
import { Plus, Folder, FileText, Search, Play, Edit3, Trash2, ChevronDown, ChevronUp, ChevronRight, Dumbbell, Copy } from 'lucide-react';
import { api, type RoutineSummary, type RoutineDetail, type Tokens } from '../api/api';
import { MultiExercisePickerModal } from '../components/MultiExercisePickerModal';

interface RoutinesViewProps {
  tokens: Tokens;
  onStartWorkout: (routineId?: string) => Promise<void>;
  onExplore: () => void;
}

interface DraftExercise {
  exerciseId: string;
  name: string;
  targetSets: number;
  targetRepetitionsMin: number;
  targetRepetitionsMax: number;
  targetWeight: number;
  restSeconds: number;
}

function sanitizePositive(val: string, fallback: number = 0): number {
  const num = Number(val);
  if (!Number.isFinite(num) || num < 0) return fallback;
  return num;
}

export const RoutinesView: React.FC<RoutinesViewProps> = ({ tokens, onStartWorkout, onExplore }) => {
  const [routines, setRoutines] = useState<RoutineSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);

  // Routine Groups (persisted in localStorage)
  interface RoutineGroup {
    id: string;
    name: string;
    routineIds: string[];
    isExpanded: boolean;
  }
  
  const [groups, setGroups] = useState<RoutineGroup[]>(() => {
    try {
      const saved = localStorage.getItem('ascend_routine_groups');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed)
        ? parsed.map(g => ({ id: String(g.id), name: String(g.name || 'Grupo'), isExpanded: g.isExpanded ?? true, routineIds: Array.isArray(g.routineIds) ? g.routineIds : [] }))
        : [];
    } catch {
      return [];
    }
  });

  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const saveGroups = (newGroups: RoutineGroup[]) => {
    setGroups(newGroups);
    try {
      localStorage.setItem('ascend_routine_groups', JSON.stringify(newGroups));
    } catch {
      // Ignore
    }
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    const newGroup: RoutineGroup = { id: Date.now().toString(), name: newGroupName.trim(), routineIds: [], isExpanded: true };
    saveGroups([...groups, newGroup]);
    setNewGroupName(''); setIsGroupModalOpen(false);
  };

  const handleDeleteGroup = (groupId: string) => {
    if (!window.confirm('¿Eliminar este grupo? Las rutinas no se eliminarán.')) return;
    saveGroups(groups.filter(g => g.id !== groupId));
  };

  const handleToggleGroup = (groupId: string) => {
    saveGroups(groups.map(g => g.id === groupId ? { ...g, isExpanded: !g.isExpanded } : g));
  };

  const handleMoveToGroup = (routineId: string, groupId: string) => {
    saveGroups(groups.map(g => {
      const currentIds = Array.isArray(g.routineIds) ? g.routineIds : [];
      if (g.id === groupId) return { ...g, routineIds: [...currentIds.filter(id => id !== routineId), routineId] };
      return { ...g, routineIds: currentIds.filter(id => id !== routineId) };
    }));
  };

  const handleRemoveFromGroup = (routineId: string) => {
    saveGroups(groups.map(g => ({ ...g, routineIds: (Array.isArray(g.routineIds) ? g.routineIds : []).filter(id => id !== routineId) })));
  };

  const groupedRoutineIds = new Set(groups.flatMap(g => Array.isArray(g.routineIds) ? g.routineIds : []));
  const ungroupedRoutines = (routines || []).filter(r => r && r.id && !groupedRoutineIds.has(r.id));

  // Editor Modal State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isNewRoutineDraft, setIsNewRoutineDraft] = useState(false);
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [routineName, setRoutineName] = useState('Nueva rutina');
  const [existingDetail, setExistingDetail] = useState<RoutineDetail | null>(null);
  const [draftExercises, setDraftExercises] = useState<DraftExercise[]>([]);
  const [saving, setSaving] = useState(false);

  // Multi-Exercise Picker Modal State
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  useEffect(() => {
    loadRoutines();
  }, [tokens]);

  const loadRoutines = async () => {
    setLoading(true);
    try {
      const data = await api.listRoutines(tokens.accessToken);
      setRoutines(data);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  // Click "Nueva rutina" -> Opens IN-MEMORY DRAFT without calling backend API
  const handleOpenNewRoutineModal = () => {
    setIsNewRoutineDraft(true);
    setEditingRoutineId(null);
    setRoutineName('Nueva rutina');
    setDraftExercises([]);
    setExistingDetail(null);
    setIsEditorOpen(true);
  };

  // Click "Editar rutina" -> Loads existing routine details from backend
  const handleEditRoutine = async (routineId: string) => {
    try {
      const detail = await api.getRoutine(tokens.accessToken, routineId);
      setIsNewRoutineDraft(false);
      setEditingRoutineId(routineId);
      setExistingDetail(detail);
      setRoutineName(detail.name);
      setDraftExercises(
        detail.exercises.map((item) => ({
          exerciseId: item.exercise.id,
          name: item.exercise.name,
          targetSets: item.targetSets ?? 3,
          targetRepetitionsMin: item.targetRepetitionsMin ?? 8,
          targetRepetitionsMax: item.targetRepetitionsMax ?? 12,
          targetWeight: item.targetWeight ?? 0,
          restSeconds: item.restSeconds ?? 90,
        })),
      );
      setIsEditorOpen(true);
    } catch {
      alert('Error al cargar la rutina.');
    }
  };

  const handleDuplicateRoutine = async (routineId: string) => {
    try {
      const detail = await api.getRoutine(tokens.accessToken, routineId);
      const newRoutine = await api.createRoutine(tokens.accessToken, `${detail.name} (Copia)`);

      for (const ex of detail.exercises) {
        const added = await api.addExerciseToRoutine(tokens.accessToken, newRoutine.id, ex.exercise.id);
        await api.updateRoutineExercise(tokens.accessToken, newRoutine.id, added.id, {
          targetSets: ex.targetSets,
          targetRepetitionsMin: ex.targetRepetitionsMin,
          targetRepetitionsMax: ex.targetRepetitionsMax,
          targetWeight: ex.targetWeight,
          restSeconds: ex.restSeconds,
        });
      }

      await loadRoutines();
    } catch {
      alert('No fue posible duplicar la rutina.');
    }
  };

  const handleDeleteRoutine = async (routineId: string, name: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar "${name}"?`)) return;
    try {
      await api.deleteRoutine(tokens.accessToken, routineId);
      setRoutines((prev) => prev.filter((r) => r.id !== routineId));
    } catch {
      alert('No fue posible eliminar la rutina.');
    }
  };

  // Move exercise up or down in draft list
  const handleMoveDraftExercise = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= draftExercises.length) return;

    setDraftExercises(prev => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      return updated;
    });
  };

  // Confirm exercise selection from multi-picker
  const handleConfirmPicker = async (selectedIds: string[]) => {
    const allExercises = await api.listExercises(tokens.accessToken);
    const selectedList = allExercises.filter((ex) => selectedIds.includes(ex.id));

    const newDrafts: DraftExercise[] = selectedList.map((ex) => ({
      exerciseId: ex.id,
      name: ex.name,
      targetSets: 3,
      targetRepetitionsMin: 8,
      targetRepetitionsMax: 12,
      targetWeight: 0,
      restSeconds: 90,
    }));

    setDraftExercises((prev) => [...prev, ...newDrafts]);
    setIsPickerOpen(false);
  };

  // Click "Guardar" in modal -> Persists to Backend API
  const handleSaveRoutine = async () => {
    if (!routineName.trim()) {
      alert('El nombre de la rutina es obligatorio.');
      return;
    }
    setSaving(true);
    try {
      if (isNewRoutineDraft) {
        // Create new routine
        const created = await api.createRoutine(tokens.accessToken, routineName.trim());
        for (const draft of draftExercises) {
          const added = await api.addExerciseToRoutine(tokens.accessToken, created.id, draft.exerciseId);
          await api.updateRoutineExercise(tokens.accessToken, created.id, added.id, {
            targetSets: draft.targetSets,
            targetRepetitionsMin: draft.targetRepetitionsMin,
            targetRepetitionsMax: draft.targetRepetitionsMax,
            targetWeight: draft.targetWeight,
            restSeconds: draft.restSeconds,
          });
        }
      } else if (editingRoutineId && existingDetail) {
        // Update existing routine name
        await api.updateRoutine(tokens.accessToken, editingRoutineId, routineName.trim());

        // Sync exercises
        // 1. Delete removed exercises
        for (const existingItem of existingDetail.exercises) {
          const stillExists = draftExercises.some((d) => d.exerciseId === existingItem.exercise.id);
          if (!stillExists) {
            await api.deleteRoutineExercise(tokens.accessToken, editingRoutineId, existingItem.id);
          }
        }

        // 2. Add new exercises or update existing
        for (const draft of draftExercises) {
          const existingItem = existingDetail.exercises.find((e) => e.exercise.id === draft.exerciseId);
          if (existingItem) {
            await api.updateRoutineExercise(tokens.accessToken, editingRoutineId, existingItem.id, {
              targetSets: draft.targetSets,
              targetRepetitionsMin: draft.targetRepetitionsMin,
              targetRepetitionsMax: draft.targetRepetitionsMax,
              targetWeight: draft.targetWeight,
              restSeconds: draft.restSeconds,
            });
          } else {
            const added = await api.addExerciseToRoutine(tokens.accessToken, editingRoutineId, draft.exerciseId);
            await api.updateRoutineExercise(tokens.accessToken, editingRoutineId, added.id, {
              targetSets: draft.targetSets,
              targetRepetitionsMin: draft.targetRepetitionsMin,
              targetRepetitionsMax: draft.targetRepetitionsMax,
              targetWeight: draft.targetWeight,
              restSeconds: draft.restSeconds,
            });
          }
        }
      }

      await loadRoutines();
      setIsEditorOpen(false);
    } catch {
      alert('Error al guardar la rutina.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateDraftField = (index: number, field: keyof DraftExercise, val: string) => {
    const num = sanitizePositive(val, 0);
    setDraftExercises((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: num } : item)),
    );
  };

  const handleRemoveDraftExercise = (index: number) => {
    setDraftExercises((prev) => prev.filter((_, idx) => idx !== index));
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Entrenamiento</h1>
      </div>

      {/* Start Empty Workout Primary Card */}
      <button style={styles.emptyWorkoutBtn} onClick={() => onStartWorkout()}>
        <Plus size={22} />
        <span>Iniciar rutina vacía</span>
      </button>

      {/* Routines Section Header */}
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>Rutinas</h2>
        <button
          onClick={() => setIsGroupModalOpen(true)}
          title="Crear grupo de rutinas"
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <Folder size={20} color="#22f0c5" />
          <span>Nuevo grupo</span>
        </button>
      </div>

      {/* Quick Action Buttons */}
      <div style={styles.quickRow}>
        <button style={styles.quickBtn} onClick={handleOpenNewRoutineModal}>
          <FileText size={18} />
          <span>Nueva rutina</span>
        </button>
        <button style={styles.quickBtn} onClick={onExplore}>
          <Search size={18} />
          <span>Explorar</span>
        </button>
      </div>

      {/* Routine Groups */}
      {groups.map(group => {
        const ids = Array.isArray(group.routineIds) ? group.routineIds : [];
        const groupRoutines = routines.filter(r => ids.includes(r.id));
        return (
          <div key={group.id} style={{ marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0' }}>
              <button style={styles.accordionHeader} onClick={() => handleToggleGroup(group.id)}>
                {group.isExpanded ? <ChevronDown size={20} color="#22f0c5" /> : <ChevronRight size={20} color="#22f0c5" />}
                <Folder size={18} color="#22f0c5" />
                <span style={styles.accordionTitle}>{group.name} ({groupRoutines.length})</span>
              </button>
              <button onClick={() => handleDeleteGroup(group.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}>
                <Trash2 size={16} color="#ef4444" />
              </button>
            </div>
            {group.isExpanded && (
              <div style={styles.list}>
                {groupRoutines.length === 0 ? (
                  <div style={styles.emptyState}>Arrastra o asigna rutinas a este grupo.</div>
                ) : (
                  groupRoutines.map(routine => (
                    <div key={routine.id} style={styles.routineCard}>
                      <div style={styles.cardTop}>
                        <h3 style={styles.routineName}>{routine.name}</h3>
                        <div style={styles.cardActions}>
                          <button style={styles.iconBtn} onClick={() => handleRemoveFromGroup(routine.id)} title="Quitar del grupo">
                            <Folder size={16} color="var(--text-muted)" />
                          </button>
                          <button style={styles.iconBtn} onClick={() => handleDuplicateRoutine(routine.id)} title="Duplicar rutina">
                            <Copy size={17} color="var(--text-muted)" />
                          </button>
                          <button style={styles.iconBtn} onClick={() => handleEditRoutine(routine.id)} title="Editar rutina">
                            <Edit3 size={18} color="var(--text-muted)" />
                          </button>
                          <button style={styles.iconBtn} onClick={() => handleDeleteRoutine(routine.id, routine.name)} title="Eliminar rutina">
                            <Trash2 size={18} color="#ef4444" />
                          </button>
                        </div>
                      </div>
                      <p style={styles.routineSummary}>
                        {routine.exerciseCount > 0 ? `${routine.exerciseCount} ejercicios registrados` : 'Sin ejercicios asignados todavía'}
                      </p>
                      <button style={styles.startBtn} onClick={() => onStartWorkout(routine.id)}>
                        <Play size={18} /><span>Iniciar rutina</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Accordion Header for ungrouped */}
      <button style={styles.accordionHeader} onClick={() => setIsExpanded(!isExpanded)}>
        {isExpanded ? <ChevronDown size={20} color="#94a3b8" /> : <ChevronRight size={20} color="#94a3b8" />}
        <span style={styles.accordionTitle}>Mis rutinas ({ungroupedRoutines.length})</span>
      </button>

      {/* Ungrouped Routine Cards */}
      {isExpanded && (
        <div style={styles.list}>
          {loading ? (
            <div style={styles.loadingText}>Cargando rutinas...</div>
          ) : ungroupedRoutines.length === 0 ? (
            <div style={styles.emptyState}>Todas las rutinas están en grupos o no tienes rutinas.</div>
          ) : (
            ungroupedRoutines.map((routine) => (
              <div key={routine.id} style={styles.routineCard}>
                <div style={styles.cardTop}>
                  <h3 style={styles.routineName}>{routine.name}</h3>
                  <div style={styles.cardActions}>
                    {groups.length > 0 && (
                      <select
                        style={{ background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-muted)', fontSize: '0.75rem', padding: '0.2rem 0.4rem', cursor: 'pointer' }}
                        value=""
                        onChange={e => { if (e.target.value) handleMoveToGroup(routine.id, e.target.value); }}
                      >
                        <option value="">Mover a grupo...</option>
                        {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                      </select>
                    )}
                    <button style={styles.iconBtn} onClick={() => handleDuplicateRoutine(routine.id)} title="Duplicar rutina">
                      <Copy size={17} color="var(--text-muted)" />
                    </button>
                    <button style={styles.iconBtn} onClick={() => handleEditRoutine(routine.id)} title="Editar rutina">
                      <Edit3 size={18} color="var(--text-muted)" />
                    </button>
                    <button style={styles.iconBtn} onClick={() => handleDeleteRoutine(routine.id, routine.name)} title="Eliminar rutina">
                      <Trash2 size={18} color="#ef4444" />
                    </button>
                  </div>
                </div>
                <p style={styles.routineSummary}>
                  {routine.exerciseCount > 0 ? `${routine.exerciseCount} ejercicios registrados` : 'Sin ejercicios asignados todavía'}
                </p>
                <button style={styles.startBtn} onClick={() => onStartWorkout(routine.id)}>
                  <Play size={18} /><span>Iniciar rutina</span>
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Group Creation Modal */}
      {isGroupModalOpen && (
        <div className="modal-overlay" onClick={() => setIsGroupModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>Nuevo grupo de rutinas</h2>
              <button onClick={() => setIsGroupModalOpen(false)} style={{ padding: '0.25rem', background: 'none', border: 'none', cursor: 'pointer' }}>
                <Trash2 size={18} color="var(--text-muted)" />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Nombre del grupo</label>
                <input
                  type="text"
                  placeholder="Ej. Push/Pull/Legs"
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreateGroup(); }}
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button onClick={() => setIsGroupModalOpen(false)} style={{ padding: '0.65rem 1rem', borderRadius: '10px', color: 'var(--text-muted)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button onClick={handleCreateGroup} disabled={!newGroupName.trim()} style={{ backgroundColor: '#22f0c5', color: '#0b0f19', padding: '0.65rem 1.25rem', borderRadius: '10px', fontWeight: 700, border: 'none', cursor: 'pointer', opacity: newGroupName.trim() ? 1 : 0.5 }}>
                  Crear grupo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit / Create Routine Modal */}
      {isEditorOpen && (
        <div className="modal-overlay" onClick={() => setIsEditorOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={styles.editorHeader}>
              <button style={styles.cancelLink} onClick={() => setIsEditorOpen(false)}>Cancelar</button>
              <h2 style={styles.editorTitle}>{isNewRoutineDraft ? 'Crear rutina' : 'Editar rutina'}</h2>
              <button style={styles.savePill} onClick={handleSaveRoutine} disabled={saving}>
                {saving ? '...' : 'Guardar'}
              </button>
            </div>

            <input
              type="text"
              placeholder="Título de rutina"
              value={routineName}
              onChange={(e) => setRoutineName(e.target.value)}
              style={styles.routineTitleInput}
            />

            {draftExercises.length === 0 ? (
              <div style={styles.emptyEditorState}>
                <Dumbbell size={56} color="#94a3b8" />
                <p style={styles.emptyEditorText}>Comienza añadiendo un ejercicio a tu rutina.</p>
                <button style={styles.addExerciseMainBtn} onClick={() => setIsPickerOpen(true)}>
                  <Plus size={20} />
                  <span>Añadir ejercicio</span>
                </button>
              </div>
            ) : (
              <div style={styles.exerciseListConfig}>
                {draftExercises.map((item, idx) => (
                  <div key={item.exerciseId + idx} style={styles.configItem}>
                    <div style={styles.configTop}>
                      <h4 style={styles.configName}>{idx + 1}. {item.name}</h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <button
                          style={{ ...styles.iconBtn, opacity: idx === 0 ? 0.3 : 1, cursor: idx === 0 ? 'not-allowed' : 'pointer' }}
                          disabled={idx === 0}
                          onClick={() => handleMoveDraftExercise(idx, 'up')}
                          title="Mover arriba"
                        >
                          <ChevronUp size={18} color="var(--text-muted)" />
                        </button>
                        <button
                          style={{ ...styles.iconBtn, opacity: idx === draftExercises.length - 1 ? 0.3 : 1, cursor: idx === draftExercises.length - 1 ? 'not-allowed' : 'pointer' }}
                          disabled={idx === draftExercises.length - 1}
                          onClick={() => handleMoveDraftExercise(idx, 'down')}
                          title="Mover abajo"
                        >
                          <ChevronDown size={18} color="var(--text-muted)" />
                        </button>
                        <button style={styles.deleteExBtn} onClick={() => handleRemoveDraftExercise(idx)} title="Eliminar ejercicio">
                          <Trash2 size={16} color="#ef4444" />
                        </button>
                      </div>
                    </div>

                    <div style={styles.configInputsGrid}>
                      <div>
                        <label style={styles.inputLabel}>Series</label>
                        <input
                          type="number"
                          min="0"
                          value={item.targetSets}
                          onChange={(e) => handleUpdateDraftField(idx, 'targetSets', e.target.value)}
                        />
                      </div>

                      <div>
                        <label style={styles.inputLabel}>Rango de reps (Mín - Máx)</label>
                        <div style={styles.rangeRow}>
                          <input
                            type="number"
                            min="0"
                            placeholder="Mín"
                            value={item.targetRepetitionsMin}
                            style={{ flex: 1, minWidth: 0 }}
                            onChange={(e) => handleUpdateDraftField(idx, 'targetRepetitionsMin', e.target.value)}
                          />
                          <span style={styles.rangeDash}>-</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="Máx"
                            value={item.targetRepetitionsMax}
                            style={{ flex: 1, minWidth: 0 }}
                            onChange={(e) => handleUpdateDraftField(idx, 'targetRepetitionsMax', e.target.value)}
                          />
                        </div>
                      </div>

                      <div>
                        <label style={styles.inputLabel}>Peso (kg)</label>
                        <input
                          type="number"
                          min="0"
                          value={item.targetWeight}
                          onChange={(e) => handleUpdateDraftField(idx, 'targetWeight', e.target.value)}
                        />
                      </div>

                      <div>
                        <label style={styles.inputLabel}>Descanso (seg)</label>
                        <input
                          type="number"
                          min="0"
                          value={item.restSeconds}
                          onChange={(e) => handleUpdateDraftField(idx, 'restSeconds', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button style={styles.addExerciseMainBtn} onClick={() => setIsPickerOpen(true)}>
                  <Plus size={20} />
                  <span>Añadir ejercicio</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Multi-Exercise Picker Modal */}
      <MultiExercisePickerModal
        tokens={tokens}
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onConfirm={handleConfirmPicker}
      />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    padding: '2.5rem 3rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
    boxSizing: 'border-box',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: '2.4rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
  },
  emptyWorkoutBtn: {
    backgroundColor: '#22f0c5',
    border: 'none',
    borderRadius: '16px',
    padding: '1.4rem 2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.85rem',
    color: '#0b0f19',
    fontWeight: 800,
    fontSize: '1.15rem',
    width: '100%',
    boxShadow: '0 4px 20px rgba(34, 240, 197, 0.35)',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '0.5rem',
  },
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  quickRow: {
    display: 'flex',
    gap: '1rem',
    width: '100%',
  },
  quickBtn: {
    flex: 1,
    height: '52px',
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    color: 'var(--text-primary)',
    fontWeight: 600,
    fontSize: '0.95rem',
  },
  accordionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: 'var(--text-muted)',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '0.5rem',
  },
  accordionTitle: {
    color: 'var(--text-muted)',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  loadingText: {
    color: 'var(--text-muted)',
    textAlign: 'center',
    padding: '2rem',
  },
  emptyState: {
    color: 'var(--text-muted)',
    padding: '1rem 0',
  },
  routineCard: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: '16px',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  cardTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  routineName: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  cardActions: {
    display: 'flex',
    gap: '0.5rem',
  },
  iconBtn: {
    padding: '0.35rem',
  },
  routineSummary: {
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
  },
  startBtn: {
    backgroundColor: '#10b981',
    color: '#ffffff',
    padding: '0.75rem',
    borderRadius: '12px',
    fontWeight: 700,
    fontSize: '0.95rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
  },
  editorHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1.5rem',
  },
  cancelLink: {
    color: '#10b981',
    fontWeight: 600,
  },
  editorTitle: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  savePill: {
    backgroundColor: '#10b981',
    color: '#ffffff',
    padding: '0.4rem 1.25rem',
    borderRadius: '999px',
    fontWeight: 700,
  },
  routineTitleInput: {
    fontSize: '1.5rem',
    fontWeight: 700,
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    borderRadius: 0,
    padding: '0.5rem 0',
    marginBottom: '1.5rem',
    width: '100%',
  },
  emptyEditorState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
    padding: '3rem 1rem',
    textAlign: 'center',
  },
  emptyEditorText: {
    color: 'var(--text-muted)',
    fontSize: '0.95rem',
  },
  addExerciseMainBtn: {
    backgroundColor: '#10b981',
    color: '#ffffff',
    padding: '0.85rem',
    borderRadius: '14px',
    fontWeight: 700,
    fontSize: '0.95rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    width: '100%',
    marginTop: '1rem',
  },
  exerciseListConfig: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  configItem: {
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '14px',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  configTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  configName: {
    fontSize: '0.95rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  deleteExBtn: {
    padding: '0.25rem',
  },
  configInputsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 2fr 1fr 1fr',
    gap: '0.75rem',
    alignItems: 'start',
  },
  rangeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    minWidth: 0,
  },
  rangeDash: {
    color: 'var(--text-muted)',
    fontWeight: 700,
  },
  inputLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    display: 'block',
    marginBottom: '0.25rem',
  },
};
