import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Search,
  GripVertical,
  Dumbbell,
  ChevronDown,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { api, type ExerciseSummary, type RoutineDetail, type Tokens } from '../api/api';
import { matchesSearch } from '../utils/text';
import { ConfirmModal } from './ConfirmModal';

export interface ExerciseSetItem {
  id: string;
  setNumber: number;
  weight: number;
  reps: number;
}

export interface RoutineEditorExercise {
  routineExerciseId: string | null;
  exerciseId: string;
  name: string;
  mediaUrl?: string | null;
  targetMuscleGroups: string[];
  equipment: string | null;
  notes: string;
  restSeconds: number;
  sets: ExerciseSetItem[];
}

interface RoutineEditorViewProps {
  tokens: Tokens;
  isNew: boolean;
  routineId: string | null;
  initialName: string;
  initialExercises: any[];
  initialDetail: RoutineDetail | null;
  onClose: () => void;
  onSaved: () => void;
}

const MUSCLE_GROUPS = [
  'Todos los músculos',
  'Pecho',
  'Espalda',
  'Hombros',
  'Bíceps',
  'Tríceps',
  'Cuádriceps',
  'Femoral',
  'Glúteos',
  'Abdominales',
  'Pantorrillas',
  'Cardio',
];

const EQUIPMENT_OPTIONS = [
  'Todo el equipamiento',
  'Barra',
  'Mancuernas',
  'Polea',
  'Máquina',
  'Peso corporal',
  'Banda de resistencia',
  'Kettlebell',
  'Otro',
];

const REST_TIMER_OPTIONS = [
  { value: 0, label: 'Desactivado' },
  { value: 30, label: '30s' },
  { value: 45, label: '45s' },
  { value: 60, label: '1 min (60s)' },
  { value: 90, label: '1 min 30s (90s)' },
  { value: 120, label: '2 min (120s)' },
  { value: 180, label: '3 min (180s)' },
  { value: 300, label: '5 min (300s)' },
];

const ThumbImg: React.FC<{ url: string; name: string }> = ({ url, name }) => {
  const [failed, setFailed] = useState(false);
  if (failed) return <Dumbbell size={16} color="var(--accent-teal)" />;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#fff',
        overflow: 'hidden',
      }}
    >
      <img
        src={url}
        alt={name}
        draggable={false}
        onError={() => setFailed(true)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: '-26% 0%',
          transform: 'translateY(2.5px)',
          display: 'block',
        }}
      />
    </div>
  );
};

export const RoutineEditorView: React.FC<RoutineEditorViewProps> = ({
  tokens,
  isNew,
  routineId,
  initialName,
  initialExercises,
  initialDetail,
  onClose,
  onSaved,
}) => {
  const navigate = useNavigate();
  const [routineName, setRoutineName] = useState(initialName || 'Nueva rutina');
  const [exercises, setExercises] = useState<RoutineEditorExercise[]>(() => {
    if (initialExercises && initialExercises.length > 0) {
      return initialExercises.map((e) => {
        const exId = e.exerciseId || e.exercise?.id || e.id || '';
        const exName = e.name || e.exercise?.name || 'Ejercicio';
        const count = e.targetSets || 3;
        const sets: ExerciseSetItem[] = e.setsData || Array.from({ length: count }, (_, i) => ({
          id: `${exId}_set_${i + 1}`,
          setNumber: i + 1,
          weight: e.targetWeight ?? 0,
          reps: e.targetRepetitionsMax ?? e.targetRepetitionsMin ?? 10,
        }));
        return {
          routineExerciseId: e.id ?? null,
          exerciseId: exId,
          name: exName,
          mediaUrl: e.mediaUrl || e.exercise?.mediaUrl || null,
          targetMuscleGroups: e.targetMuscleGroups || e.exercise?.targetMuscleGroups || [],
          equipment: e.equipment || e.exercise?.equipment || null,
          notes: e.notes || '',
          restSeconds: e.restSeconds ?? 90,
          sets,
        };
      });
    }
    return [];
  });

  const [saving, setSaving] = useState(false);

  // Library sidebar state
  const [catalogExercises, setCatalogExercises] = useState<ExerciseSummary[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState('Todos los músculos');
  const [selectedEquipment, setSelectedEquipment] = useState('Todo el equipamiento');

  // Custom Exercise Modal State inside Editor
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customMuscle, setCustomMuscle] = useState('Pecho');
  const [customEquipment, setCustomEquipment] = useState('Mancuernas');
  const [customCreating, setCustomCreating] = useState(false);

  // Drag and drop state
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Confirmation dialog state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    variant?: 'danger' | 'warning';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showConfirm = (cfg: {
    title: string;
    message: string;
    confirmLabel?: string;
    variant?: 'danger' | 'warning';
    onConfirm: () => void;
  }) => {
    setConfirmModal({ ...cfg, isOpen: true });
  };
  const closeConfirm = () => setConfirmModal((prev) => ({ ...prev, isOpen: false }));

  // Load catalog exercises
  useEffect(() => {
    setLibraryLoading(true);
    api.listExercises(tokens.accessToken)
      .then((data) => setCatalogExercises(data))
      .catch(() => {})
      .finally(() => setLibraryLoading(false));
  }, [tokens]);

  // Backfill thumbnails from the catalog for exercises loaded from a saved routine
  useEffect(() => {
    if (catalogExercises.length === 0) return;
    setExercises((prev) => {
      let changed = false;
      const next = prev.map((ex) => {
        if (ex.mediaUrl) return ex;
        const match = catalogExercises.find((c) => c.id === ex.exerciseId);
        if (match && match.mediaUrl) {
          changed = true;
          return { ...ex, mediaUrl: match.mediaUrl };
        }
        return ex;
      });
      return changed ? next : prev;
    });
  }, [catalogExercises]);

  // Auto-save draft in localStorage if it's a new routine
  useEffect(() => {
    if (isNew) {
      if (exercises.length > 0 || (routineName.trim() && routineName.trim() !== 'Nueva rutina')) {
        try {
          localStorage.setItem(
            'ascend_routine_draft',
            JSON.stringify({
              routineName,
              draftExercises: exercises.map((ex) => ({
                exerciseId: ex.exerciseId,
                name: ex.name,
                targetSets: ex.sets.length,
                targetWeight: ex.sets[0]?.weight ?? 0,
                targetRepetitionsMin: ex.sets[0]?.reps ?? 8,
                targetRepetitionsMax: ex.sets[0]?.reps ?? 10,
                restSeconds: ex.restSeconds,
                notes: ex.notes,
                targetMuscleGroups: ex.targetMuscleGroups,
                equipment: ex.equipment,
                setsData: ex.sets,
              })),
            }),
          );
        } catch {
          // Ignore
        }
      }
    }
  }, [isNew, routineName, exercises]);

  // Check for unsaved changes
  const isDirty = () => {
    if (isNew) {
      return exercises.length > 0 || (routineName.trim() !== '' && routineName.trim() !== 'Nueva rutina');
    }
    if (!initialDetail) return true;
    if (routineName.trim() !== initialDetail.name) return true;
    if (exercises.length !== initialDetail.exercises.length) return true;

    const originalById = new Map(initialDetail.exercises.map((e) => [e.id, e]));
    for (let i = 0; i < exercises.length; i++) {
      const current = exercises[i];
      const original = current.routineExerciseId ? originalById.get(current.routineExerciseId) : undefined;
      if (!original) return true;
      if (original.position !== i + 1) return true;
      if ((original.targetSets ?? 3) !== current.sets.length) return true;
      if (Number(original.targetWeight ?? 0) !== Number(current.sets[0]?.weight ?? 0)) return true;
      if (Number(original.targetRepetitionsMax ?? original.targetRepetitionsMin ?? 10) !== Number(current.sets[0]?.reps ?? 10)) return true;
      if ((original.restSeconds ?? 90) !== current.restSeconds) return true;
      if ((original.notes || '') !== (current.notes || '')) return true;
    }
    return false;
  };

  const handleBack = () => {
    if (isDirty()) {
      showConfirm({
        title: '¿Descartar cambios?',
        message: 'Tienes cambios o ejercicios sin guardar en esta rutina. ¿Seguro que deseas salir?',
        confirmLabel: 'Descartar y salir',
        variant: 'danger',
        onConfirm: () => {
          try {
            localStorage.removeItem('ascend_routine_draft');
          } catch {
            // Ignore
          }
          onClose();
        },
      });
    } else {
      try {
        localStorage.removeItem('ascend_routine_draft');
      } catch {
        // Ignore
      }
      onClose();
    }
  };

  // Add exercise from library
  const handleAddExercise = (catalogItem: ExerciseSummary) => {
    const newSets: ExerciseSetItem[] = [
      { id: `${catalogItem.id}_set_1`, setNumber: 1, weight: 0, reps: 10 },
      { id: `${catalogItem.id}_set_2`, setNumber: 2, weight: 0, reps: 10 },
      { id: `${catalogItem.id}_set_3`, setNumber: 3, weight: 0, reps: 10 },
    ];

    setExercises((prev) => [
      ...prev,
      {
        routineExerciseId: null,
        exerciseId: catalogItem.id,
        name: catalogItem.name,
        mediaUrl: catalogItem.mediaUrl || null,
        targetMuscleGroups: catalogItem.targetMuscleGroups || [],
        equipment: catalogItem.equipment || null,
        notes: '',
        restSeconds: 90,
        sets: newSets,
      },
    ]);
    toast.success(`"${catalogItem.name}" añadido a la rutina.`);
  };

  // Exercise manipulation handlers
  const handleRemoveExercise = (exerciseIdx: number) => {
    setExercises((prev) => prev.filter((_, idx) => idx !== exerciseIdx));
  };

  const handleUpdateNotes = (exerciseIdx: number, notes: string) => {
    setExercises((prev) =>
      prev.map((ex, idx) => (idx === exerciseIdx ? { ...ex, notes } : ex)),
    );
  };

  const handleUpdateRest = (exerciseIdx: number, restSeconds: number) => {
    setExercises((prev) =>
      prev.map((ex, idx) => (idx === exerciseIdx ? { ...ex, restSeconds } : ex)),
    );
  };

  const handleAddSet = (exerciseIdx: number) => {
    setExercises((prev) =>
      prev.map((ex, idx) => {
        if (idx !== exerciseIdx) return ex;
        const lastSet = ex.sets[ex.sets.length - 1];
        const newSet: ExerciseSetItem = {
          id: `${ex.exerciseId}_set_${Date.now()}`,
          setNumber: ex.sets.length + 1,
          weight: lastSet ? lastSet.weight : 0,
          reps: lastSet ? lastSet.reps : 10,
        };
        return {
          ...ex,
          sets: [...ex.sets, newSet],
        };
      }),
    );
  };

  const handleUpdateSet = (
    exerciseIdx: number,
    setIdx: number,
    field: 'weight' | 'reps',
    val: string,
  ) => {
    const num = Math.max(0, Number(val) || 0);
    setExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== exerciseIdx) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s, si) => (si === setIdx ? { ...s, [field]: num } : s)),
        };
      }),
    );
  };

  const handleDeleteSet = (exerciseIdx: number, setIdx: number) => {
    setExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== exerciseIdx) return ex;
        if (ex.sets.length <= 1) {
          toast.error('El ejercicio debe tener al menos una serie.');
          return ex;
        }
        const updatedSets = ex.sets
          .filter((_, si) => si !== setIdx)
          .map((s, idx) => ({ ...s, setNumber: idx + 1 }));
        return { ...ex, sets: updatedSets };
      }),
    );
  };

  // Reorder exercises
  const handleMoveExercise = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= exercises.length) return;
    setExercises((prev) => {
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
  };

  const handleDragStart = (idx: number) => {
    setDraggedIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragOverIdx !== idx) {
      setDragOverIdx(idx);
    }
  };

  const handleDrop = (targetIdx: number) => {
    if (draggedIdx === null || draggedIdx === targetIdx) {
      setDraggedIdx(null);
      setDragOverIdx(null);
      return;
    }
    setExercises((prev) => {
      const updated = [...prev];
      const [draggedItem] = updated.splice(draggedIdx, 1);
      updated.splice(targetIdx, 0, draggedItem);
      return updated;
    });
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  // Filter library exercises
  const filteredLibrary = useMemo(() => {
    return catalogExercises.filter((item) => {
      if (searchQuery.trim() && !matchesSearch(item.name, searchQuery)) return false;
      if (
        selectedMuscle !== 'Todos los músculos' &&
        !item.targetMuscleGroups?.some((m) => matchesSearch(m, selectedMuscle))
      )
        return false;
      if (selectedEquipment !== 'Todo el equipamiento') {
        if (!item.equipment || !matchesSearch(item.equipment, selectedEquipment)) return false;
      }
      return true;
    });
  }, [catalogExercises, searchQuery, selectedMuscle, selectedEquipment]);

  // Calculate summary metrics
  const totalSetsCount = useMemo(() => {
    return exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  }, [exercises]);

  const uniqueMuscleGroups = useMemo(() => {
    const set = new Set<string>();
    exercises.forEach((ex) => {
      ex.targetMuscleGroups?.forEach((m) => set.add(m));
    });
    return Array.from(set);
  }, [exercises]);

  // Create custom exercise modal handler
  const handleCreateCustomExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;
    setCustomCreating(true);
    try {
      const created = await api.createExercise(tokens.accessToken, {
        name: customName.trim(),
        targetMuscleGroups: [customMuscle],
        equipment: customEquipment,
      });
      setCatalogExercises((prev) => [created, ...prev]);
      handleAddExercise(created);
      setIsCustomModalOpen(false);
      setCustomName('');
      toast.success('Ejercicio creado y añadido.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al crear ejercicio.');
    } finally {
      setCustomCreating(false);
    }
  };

  // Save routine
  const handleSaveRoutine = async () => {
    if (!routineName.trim()) {
      toast.error('El nombre de la rutina es obligatorio.');
      return;
    }
    if (exercises.length === 0) {
      toast.error('Agrega al menos un ejercicio a la rutina.');
      return;
    }

    setSaving(true);
    try {
      await api.saveRoutine(tokens.accessToken, {
        id: isNew ? undefined : (routineId ?? undefined),
        name: routineName.trim(),
        exercises: exercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          targetSets: ex.sets.length,
          targetWeight: ex.sets[0]?.weight ?? 0,
          targetRepetitionsMin: Math.max(1, ex.sets[0]?.reps ?? 8),
          targetRepetitionsMax: Math.max(1, ex.sets[0]?.reps ?? 10),
          restSeconds: ex.restSeconds,
          notes: ex.notes?.trim() ? ex.notes.trim() : undefined,
        })),
      });

      try {
        localStorage.removeItem('ascend_routine_draft');
      } catch {
        // Ignore
      }

      toast.success('Rutina guardada con éxito.');
      onSaved();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? `Error al guardar la rutina: ${err.message}`
          : 'Error al guardar la rutina.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.workspace}>
      {/* Top Header Bar */}
      <header style={styles.topBar}>
        <div style={styles.topLeft}>
          <button
            type="button"
            onClick={handleBack}
            style={styles.backBtn}
            title="Volver"
            aria-label="Volver a la lista de rutinas"
          >
            <ArrowLeft size={22} />
          </button>
          <h1 style={styles.pageTitle}>
            {isNew ? 'Crear rutina' : 'Editar rutina'}
          </h1>
        </div>

        <div style={styles.topRight}>
          <button
            type="button"
            style={{
              ...styles.saveRoutineBtn,
              opacity: saving || !routineName.trim() || exercises.length === 0 ? 0.6 : 1,
            }}
            onClick={handleSaveRoutine}
            disabled={saving || !routineName.trim() || exercises.length === 0}
          >
            {saving ? 'Guardando...' : 'Guardar rutina'}
          </button>
        </div>
      </header>

      {/* Main Two-Column Layout */}
      <div className="routine-editor-grid" style={styles.gridContainer}>
        {/* LEFT COLUMN: Routine Builder Form */}
        <main style={styles.leftColumn}>
          {/* Routine Title Field */}
          <div style={styles.titleCard}>
            <label style={styles.fieldLabel}>Título de la rutina</label>
            <input
              type="text"
              placeholder="Título de la rutina de entrenamiento"
              value={routineName}
              onChange={(e) => setRoutineName(e.target.value)}
              style={styles.titleInput}
            />
          </div>

          {/* Exercise Cards List */}
          {exercises.length === 0 ? (
            <div style={styles.emptyBuilderState}>
              <div style={styles.emptyIconCircle}>
                <Dumbbell size={32} color="var(--accent-teal)" />
              </div>
              <h3 style={styles.emptyTitle}>Tu rutina está vacía</h3>
              <p style={styles.emptyDesc}>
                Explora la biblioteca en el panel derecho y haz clic en el botón (+) para agregar ejercicios a tu sesión.
              </p>
            </div>
          ) : (
            <div style={styles.exerciseCardsList}>
              {exercises.map((ex, exIdx) => {
                const isDragging = draggedIdx === exIdx;
                const isOver = dragOverIdx === exIdx && draggedIdx !== exIdx;
                return (
                  <div
                    key={`${ex.exerciseId}_${exIdx}`}
                    draggable
                    onDragStart={() => handleDragStart(exIdx)}
                    onDragOver={(e) => handleDragOver(e, exIdx)}
                    onDrop={() => handleDrop(exIdx)}
                    onDragEnd={handleDragEnd}
                    style={{
                      ...styles.exerciseCard,
                      opacity: isDragging ? 0.45 : 1,
                      transform: isDragging ? 'scale(0.98)' : 'none',
                      borderTop: isOver && draggedIdx !== null && draggedIdx > exIdx ? '2px solid var(--accent-teal)' : undefined,
                      borderBottom: isOver && draggedIdx !== null && draggedIdx < exIdx ? '2px solid var(--accent-teal)' : undefined,
                      transition: 'border-color 0.15s ease, opacity 0.15s ease, transform 0.15s ease',
                    }}
                  >
                    {/* Card Header */}
                    <div style={styles.cardHeader}>
                      <div style={styles.cardHeaderLeft}>
                        <div
                          style={{
                            ...styles.dragHandle,
                            cursor: 'grab',
                          }}
                          title="Arrastra para reordenar"
                        >
                          <GripVertical size={18} color="var(--accent-teal)" />
                        </div>
<div
                          style={styles.exerciseLink}
                          onClick={() => navigate(`/exercises/${ex.exerciseId}`)}
                          title="Ver ejercicio en la biblioteca"
                        >
                          <div style={styles.exerciseThumbBadge}>
                            {ex.mediaUrl ? (
                              <ThumbImg url={ex.mediaUrl} name={ex.name} />
                            ) : (
                              <Dumbbell size={18} color="var(--accent-teal)" />
                            )}
                          </div>
                          <span style={styles.exerciseCardTitle}>{ex.name}</span>
                        </div>
                      </div>

                    <div style={styles.cardHeaderActions}>
                      {exIdx > 0 && (
                        <button
                          type="button"
                          style={styles.cardMiniBtn}
                          onClick={() => handleMoveExercise(exIdx, 'up')}
                          title="Subir posición"
                        >
                          ↑
                        </button>
                      )}
                      {exIdx < exercises.length - 1 && (
                        <button
                          type="button"
                          style={styles.cardMiniBtn}
                          onClick={() => handleMoveExercise(exIdx, 'down')}
                          title="Bajar posición"
                        >
                          ↓
                        </button>
                      )}
                      <button
                        type="button"
                        style={styles.cardDeleteBtn}
                        onClick={() => handleRemoveExercise(exIdx)}
                        title="Eliminar ejercicio"
                      >
                        <Trash2 size={16} color="var(--danger-color)" />
                      </button>
                    </div>
                  </div>

                  {/* Note Input */}
                  <div style={styles.fieldBlock}>
                    <label style={styles.fieldSubLabel}>Nota</label>
                    <input
                      type="text"
                      placeholder="Añadir nota fijada"
                      value={ex.notes}
                      onChange={(e) => handleUpdateNotes(exIdx, e.target.value)}
                      style={styles.noteInput}
                    />
                  </div>

                  {/* Rest Timer Dropdown */}
                  <div style={styles.fieldBlock}>
                    <label style={styles.fieldSubLabel}>Temporizador de descanso:</label>
                    <div style={styles.selectWrapper}>
                      <select
                        value={ex.restSeconds}
                        onChange={(e) => handleUpdateRest(exIdx, Number(e.target.value))}
                        style={styles.restSelect}
                      >
                        {REST_TIMER_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={16} color="var(--text-muted)" style={styles.selectArrow} />
                    </div>
                  </div>

                  {/* Sets Table */}
                  <div style={styles.setsTableWrapper}>
                    <div style={styles.setsTableHeader}>
                      <span style={styles.colHeaderSerie}>SERIE</span>
                      <span style={styles.colHeaderKg}>KG</span>
                      <span style={styles.colHeaderReps}>REPETICIONES ▾</span>
                      <span style={styles.colHeaderAction}></span>
                    </div>

                    <div style={styles.setsRowsList}>
                      {ex.sets.map((s, sIdx) => (
                        <div key={s.id || sIdx} style={styles.setRow}>
                          <div style={styles.setNumberBadge}>{s.setNumber}</div>
                          <div style={styles.setKgCol}>
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={s.weight === 0 ? '' : s.weight}
                              placeholder="0"
                              onChange={(e) => handleUpdateSet(exIdx, sIdx, 'weight', e.target.value)}
                              style={styles.setInput}
                            />
                          </div>
                          <div style={styles.setRepsCol}>
                            <input
                              type="number"
                              min="1"
                              value={s.reps === 0 ? '' : s.reps}
                              placeholder="10"
                              onChange={(e) => handleUpdateSet(exIdx, sIdx, 'reps', e.target.value)}
                              style={styles.setInput}
                            />
                          </div>
                          <div style={styles.setActionCol}>
                            <button
                              type="button"
                              onClick={() => handleDeleteSet(exIdx, sIdx)}
                              style={styles.deleteSetRowBtn}
                              title="Eliminar serie"
                            >
                              <X size={15} color="var(--text-muted)" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* + Agregar Serie button */}
                    <button
                      type="button"
                      style={styles.addSetBtn}
                      onClick={() => handleAddSet(exIdx)}
                    >
                      <Plus size={16} />
                      <span>Agregar Serie</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </main>

        {/* RIGHT COLUMN: Sticky Sidebar (Resumen + Biblioteca) */}
        <aside className="routine-editor-aside" style={styles.rightColumn}>
          {/* Card 1: Resumen */}
          <div style={styles.summaryCard}>
            <div style={styles.summaryHeader}>
              <h3 style={styles.sidebarSectionTitle}>Resumen</h3>
            </div>

            <div style={styles.summaryContentRow}>
              <div style={styles.summaryStatsBox}>
                <div style={styles.summaryStatItem}>
                  <span style={styles.summaryStatLabel}>Ejercicios</span>
                  <span style={styles.summaryStatVal}>{exercises.length}</span>
                </div>
                <div style={styles.summaryStatItem}>
                  <span style={styles.summaryStatLabel}>Series totales</span>
                  <span style={styles.summaryStatVal}>{totalSetsCount}</span>
                </div>
              </div>
            </div>

            {/* Target Muscles Chips */}
            {uniqueMuscleGroups.length > 0 && (
              <div style={styles.muscleChipsList}>
                {uniqueMuscleGroups.map((m) => (
                  <span key={m} style={styles.muscleChip}>
                    {m}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Card 2: Biblioteca */}
          <div style={styles.libraryCard}>
            <div style={styles.libraryHeader}>
              <h3 style={styles.sidebarSectionTitle}>Biblioteca</h3>
              <button
                type="button"
                style={styles.customExerciseBtn}
                onClick={() => setIsCustomModalOpen(true)}
              >
                <Plus size={15} />
                <span>Ejercicio personalizado</span>
              </button>
            </div>

            {/* Filter 1: Equipment Dropdown */}
            <div style={styles.filterGroup}>
              <div style={styles.selectWrapper}>
                <select
                  value={selectedEquipment}
                  onChange={(e) => setSelectedEquipment(e.target.value)}
                  style={styles.filterSelect}
                >
                  {EQUIPMENT_OPTIONS.map((eq) => (
                    <option key={eq} value={eq}>
                      {eq}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} color="var(--text-muted)" style={styles.selectArrow} />
              </div>
            </div>

            {/* Filter 2: Muscle Dropdown */}
            <div style={styles.filterGroup}>
              <div style={styles.selectWrapper}>
                <select
                  value={selectedMuscle}
                  onChange={(e) => setSelectedMuscle(e.target.value)}
                  style={styles.filterSelect}
                >
                  {MUSCLE_GROUPS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} color="var(--text-muted)" style={styles.selectArrow} />
              </div>
            </div>

            {/* Filter 3: Search Input */}
            <div style={styles.searchWrapper}>
              <Search size={17} color="var(--text-muted)" style={styles.searchIcon} />
              <input
                type="text"
                placeholder="Buscar ejercicios..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.searchInput}
              />
              {searchQuery && (
                <button
                  type="button"
                  style={styles.clearSearchBtn}
                  onClick={() => setSearchQuery('')}
                >
                  <X size={15} color="var(--text-muted)" />
                </button>
              )}
            </div>

            {/* Exercises List */}
            <div style={styles.libraryListScroll}>
              {libraryLoading ? (
                <div style={styles.libraryEmptyText}>Cargando ejercicios...</div>
              ) : filteredLibrary.length === 0 ? (
                <div style={styles.libraryEmptyText}>No se encontraron ejercicios.</div>
              ) : (
                filteredLibrary.map((item) => {
                  const isAdded = exercises.some((e) => e.exerciseId === item.id);
                  return (
                    <div
                      key={item.id}
                      style={styles.libraryItem}
                      onClick={() => handleAddExercise(item)}
                    >
                      <button
                        type="button"
                        style={{
                          ...styles.addItemBtn,
                          ...(isAdded ? styles.addItemBtnActive : {}),
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddExercise(item);
                        }}
                        title={isAdded ? 'Agregar otra vez' : 'Agregar a la rutina'}
                      >
                        <Plus size={16} color="var(--bg-color)" />
                      </button>

                      <div style={styles.libraryItemThumb}>
                        {item.mediaUrl ? (
                          <ThumbImg url={item.mediaUrl} name={item.name} />
                        ) : (
                          <Dumbbell size={16} color="var(--accent-teal)" />
                        )}
                      </div>

                      <div style={styles.libraryItemInfo}>
                        <h4 style={styles.libraryItemTitle}>{item.name}</h4>
                        <span style={styles.libraryItemSub}>
                          {item.targetMuscleGroups?.[0] || 'General'}
                          {item.equipment ? ` · ${item.equipment}` : ''}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Modal for creating custom exercise */}
      {isCustomModalOpen && (
        <div
          className="modal-overlay"
          style={{ zIndex: 1200 }}
          onClick={() => setIsCustomModalOpen(false)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '460px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Nuevo ejercicio personalizado
              </h3>
              <button
                type="button"
                onClick={() => setIsCustomModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={18} color="var(--text-muted)" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomExercise} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={styles.fieldSubLabel}>Nombre *</label>
                <input
                  type="text"
                  placeholder="Ej. Press Militar Sentado"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  style={styles.noteInput}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label style={styles.fieldSubLabel}>Músculo principal</label>
                <div style={styles.selectWrapper}>
                  <select
                    value={customMuscle}
                    onChange={(e) => setCustomMuscle(e.target.value)}
                    style={styles.restSelect}
                  >
                    {MUSCLE_GROUPS.filter((m) => m !== 'Todos los músculos').map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} color="var(--text-muted)" style={styles.selectArrow} />
                </div>
              </div>

              <div>
                <label style={styles.fieldSubLabel}>Equipamiento</label>
                <div style={styles.selectWrapper}>
                  <select
                    value={customEquipment}
                    onChange={(e) => setCustomEquipment(e.target.value)}
                    style={styles.restSelect}
                  >
                    {EQUIPMENT_OPTIONS.filter((eq) => eq !== 'Todo el equipamiento').map((eq) => (
                      <option key={eq} value={eq}>{eq}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} color="var(--text-muted)" style={styles.selectArrow} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsCustomModalOpen(false)}
                  style={styles.cancelBtn}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={customCreating || !customName.trim()}
                  style={styles.saveRoutineBtn}
                >
                  {customCreating ? 'Creando...' : 'Crear y añadir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        variant={confirmModal.variant}
        onConfirm={() => {
          confirmModal.onConfirm();
          closeConfirm();
        }}
        onCancel={closeConfirm}
      />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  workspace: {
    padding: 'clamp(1.5rem, 4vw, 2.5rem) clamp(1rem, 5vw, 3rem)',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.75rem',
    maxWidth: '1440px',
    margin: '0 auto',
    boxSizing: 'border-box',
    width: '100%',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: '1rem',
    borderBottom: '1px solid var(--border-color)',
    gap: '1rem',
  },
  topLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    borderRadius: 'var(--radius-container)',
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  pageTitle: {
    fontSize: '1.8rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
  },
  topRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  saveRoutineBtn: {
    backgroundColor: 'var(--accent-teal)',
    color: 'var(--bg-color)',
    padding: '0.75rem 1.6rem',
    borderRadius: 'var(--radius-container)',
    fontWeight: 800,
    fontSize: '0.95rem',
    cursor: 'pointer',
    border: 'none',
    
    transition: 'all 0.15s ease',
  },
  cancelBtn: {
    padding: '0.7rem 1.25rem',
    borderRadius: 'var(--radius-control)',
    backgroundColor: 'var(--input-bg)',
    color: 'var(--text-muted)',
    fontWeight: 600,
    border: '1px solid var(--border-color)',
    cursor: 'pointer',
  },
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr 380px',
    gap: '2rem',
    alignItems: 'flex-start',
  },
  leftColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    minWidth: 0,
  },
  titleCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.45rem',
  },
  fieldLabel: {
    fontSize: '0.85rem',
    fontWeight: 700,
    color: 'var(--text-secondary)',
    letterSpacing: '0.01em',
  },
  fieldSubLabel: {
    fontSize: '0.8rem',
    fontWeight: 700,
    color: 'var(--text-muted)',
    display: 'block',
    marginBottom: '0.35rem',
  },
  titleInput: {
    width: '100%',
    padding: '0.95rem 1.15rem',
    fontSize: '1.1rem',
    fontWeight: 700,
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-container)',
    color: 'var(--text-primary)',
    outline: 'none',
    boxSizing: 'border-box',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
  },
  emptyBuilderState: {
    backgroundColor: 'var(--surface-color)',
    border: '1px dashed var(--border-color)',
    borderRadius: 'var(--radius-container)',
    padding: '4rem 2rem',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
  },
  emptyIconCircle: {
    width: '64px',
    height: '64px',
    borderRadius: 'var(--radius-container)',
    backgroundColor: 'rgba(192, 138, 90, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: '1.25rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
  },
  emptyDesc: {
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
    maxWidth: '420px',
    lineHeight: 1.5,
  },
  exerciseCardsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  exerciseCard: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-container)',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.2rem',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: '0.5rem',
  },
  cardHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  dragHandle: {
    cursor: 'grab',
    display: 'flex',
    alignItems: 'center',
  },
  exerciseLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    cursor: 'pointer',
    flex: 1,
    minWidth: 0,
    transition: 'opacity 0.15s ease',
  },
  exerciseThumbBadge: {
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    overflow: 'hidden',
    backgroundColor: 'rgba(192, 138, 90, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  exerciseCardTitle: {
    fontSize: '1.15rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    letterSpacing: '-0.01em',
  },
  cardHeaderActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
  },
  cardMiniBtn: {
    padding: '0.35rem 0.6rem',
    borderRadius: 'var(--radius-element)',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
  cardDeleteBtn: {
    padding: '0.45rem',
    borderRadius: 'var(--radius-element)',
    backgroundColor: 'rgba(192, 105, 105, 0.1)',
    border: '1px solid rgba(192, 105, 105, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  fieldBlock: {
    display: 'flex',
    flexDirection: 'column',
  },
  noteInput: {
    width: '100%',
    padding: '0.75rem 1rem',
    fontSize: '0.92rem',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-container)',
    color: 'var(--text-primary)',
    boxSizing: 'border-box',
    outline: 'none',
  },
  selectWrapper: {
    position: 'relative',
    width: '100%',
  },
  restSelect: {
    width: '100%',
    padding: '0.7rem 2.2rem 0.7rem 1rem',
    fontSize: '0.9rem',
    fontWeight: 600,
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-container)',
    color: 'var(--text-primary)',
    appearance: 'none',
    cursor: 'pointer',
    outline: 'none',
  },
  selectArrow: {
    position: 'absolute',
    right: '0.9rem',
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
  },
  setsTableWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.65rem',
    backgroundColor: 'var(--input-bg)',
    padding: '1rem',
    borderRadius: 'var(--radius-container)',
    border: '1px solid var(--border-color)',
  },
  setsTableHeader: {
    display: 'grid',
    gridTemplateColumns: '48px 1fr 1fr 36px',
    gap: '0.75rem',
    padding: '0.2rem 0.4rem',
    fontSize: '0.72rem',
    fontWeight: 800,
    color: 'var(--text-muted)',
    letterSpacing: '0.06em',
  },
  colHeaderSerie: {
    textAlign: 'center',
  },
  colHeaderKg: {
    textAlign: 'center',
  },
  colHeaderReps: {
    textAlign: 'center',
  },
  colHeaderAction: {},
  setsRowsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  setRow: {
    display: 'grid',
    gridTemplateColumns: '48px 1fr 1fr 36px',
    gap: '0.75rem',
    alignItems: 'center',
  },
  setNumberBadge: {
    width: '32px',
    height: '32px',
    borderRadius: 'var(--radius-element)',
    backgroundColor: 'var(--surface-color)',
    color: 'var(--text-primary)',
    fontSize: '0.85rem',
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto',
    border: '1px solid var(--border-color)',
  },
  setKgCol: {
    display: 'flex',
  },
  setRepsCol: {
    display: 'flex',
  },
  setInput: {
    width: '100%',
    padding: '0.6rem',
    fontSize: '0.92rem',
    fontWeight: 700,
    textAlign: 'center',
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-control)',
    color: 'var(--text-primary)',
    outline: 'none',
  },
  setActionCol: {
    display: 'flex',
    justifyContent: 'center',
  },
  deleteSetRowBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '0.35rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSetBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.4rem',
    padding: '0.75rem',
    borderRadius: 'var(--radius-container)',
    backgroundColor: 'var(--surface-color)',
    border: '1px dashed var(--border-color)',
    color: 'var(--text-primary)',
    fontSize: '0.88rem',
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: '0.25rem',
    transition: 'all 0.15s ease',
  },
  rightColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  summaryCard: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-container)',
    padding: '1.35rem 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
  },
  summaryHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sidebarSectionTitle: {
    fontSize: '1.15rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
  },
  summaryContentRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  summaryStatsBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    backgroundColor: 'var(--input-bg)',
    borderRadius: 'var(--radius-container)',
    padding: '1rem',
    border: '1px solid var(--border-color)',
  },
  summaryStatItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.2rem',
  },
  summaryStatLabel: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
  },
  summaryStatVal: {
    fontSize: '1.4rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
  },
  muscleChipsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.35rem',
    paddingTop: '0.25rem',
    borderTop: '1px solid var(--border-color)',
  },
  muscleChip: {
    fontSize: '0.72rem',
    fontWeight: 700,
    padding: '0.2rem 0.55rem',
    borderRadius: '6px',
    backgroundColor: 'rgba(192, 138, 90, 0.1)',
    color: 'var(--accent-teal)',
    border: '1px solid rgba(192, 138, 90, 0.2)',
  },
  libraryCard: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-container)',
    padding: '1.35rem 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
  },
  libraryHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.5rem',
  },
  customExerciseBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    fontSize: '0.8rem',
    fontWeight: 700,
    color: 'var(--accent-teal)',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
  },
  filterGroup: {
    width: '100%',
  },
  filterSelect: {
    width: '100%',
    padding: '0.65rem 2.2rem 0.65rem 0.85rem',
    fontSize: '0.85rem',
    fontWeight: 600,
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-control)',
    color: 'var(--text-primary)',
    appearance: 'none',
    cursor: 'pointer',
    outline: 'none',
  },
  searchWrapper: {
    position: 'relative',
    width: '100%',
  },
  searchIcon: {
    position: 'absolute',
    left: '0.85rem',
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    padding: '0.65rem 2rem 0.65rem 2.3rem',
    fontSize: '0.85rem',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-control)',
    color: 'var(--text-primary)',
    outline: 'none',
    boxSizing: 'border-box',
  },
  clearSearchBtn: {
    position: 'absolute',
    right: '0.65rem',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    padding: '0.2rem',
  },
  libraryListScroll: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    maxHeight: '440px',
    overflowY: 'auto',
    paddingRight: '0.2rem',
  },
  libraryEmptyText: {
    padding: '2rem 1rem',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
  },
  libraryItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.65rem 0.75rem',
    borderRadius: 'var(--radius-container)',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    cursor: 'pointer',
    transition: 'all 0.12s ease',
  },
  addItemBtn: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent-teal)',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'transform 0.15s ease',
  },
  addItemBtnActive: {
    backgroundColor: 'var(--accent-blue)',
  },
  libraryItemThumb: {
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    overflow: 'hidden',
    backgroundColor: 'var(--surface-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  libraryItemInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.15rem',
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  libraryItemTitle: {
    fontSize: '0.88rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  libraryItemSub: {
    fontSize: '0.74rem',
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
};
