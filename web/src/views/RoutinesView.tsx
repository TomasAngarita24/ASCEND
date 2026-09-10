import React, { useCallback, useEffect, useState } from 'react';
import {
  Plus,
  Folder,
  Play,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronRight,
  Dumbbell,
  Copy,
  Layers,
  X,
  ClipboardList,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, type RoutineSummary, type RoutineDetail, type Tokens } from '../api/api';
import { ConfirmModal } from '../components/ConfirmModal';
import { RoutineTemplatesModal } from '../components/RoutineTemplatesModal';

interface RoutinesViewProps {
  tokens: Tokens;
  onStartWorkout: (routineId?: string) => Promise<void>;
  onExplore: () => void;
  onOpenEditor: (opts: { isNew: boolean; routineId: string | null; name: string; detail: RoutineDetail | null }) => void;
}

interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  variant: 'danger' | 'warning';
  onConfirm: () => void;
}

const MUSCLE_COLOR_MAP: Record<string, string> = {
  Pecho: '#E1C27A',
  Chest: '#E1C27A',
  Pectoral: '#E1C27A',
  Espalda: '#C8A45D',
  Dorsal: '#C8A45D',
  Back: '#C8A45D',
  Cuádriceps: '#4CAF7D',
  Cuadriceps: '#4CAF7D',
  Femoral: '#6FC79B',
  Isquiotibiales: '#6FC79B',
  Piernas: '#4CAF7D',
  Pierna: '#4CAF7D',
  Hombros: '#B8914D',
  Shoulders: '#B8914D',
  Deltoides: '#B8914D',
  Bíceps: '#C0C2C6',
  Biceps: '#C0C2C6',
  Tríceps: '#8A8D93',
  Triceps: '#8A8D93',
  Abdominales: '#B5754F',
  Core: '#B5754F',
  Glúteos: '#3D8F66',
  Gluteos: '#3D8F66',
  Pantorrillas: '#7A9E87',
  Gemelos: '#7A9E87',
  Antebrazos: '#5F6268',
  Trapecio: '#A67B4A',
};

export const RoutinesView: React.FC<RoutinesViewProps> = ({ tokens, onStartWorkout, onExplore: _onExplore, onOpenEditor }) => {
  const [routines, setRoutines] = useState<RoutineSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Confirm modal state
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'Confirmar',
    variant: 'danger',
    onConfirm: () => {},
  });
  const showConfirm = (cfg: Omit<ConfirmState, 'isOpen'>) => setConfirmState({ ...cfg, isOpen: true });
  const closeConfirm = () => setConfirmState((s) => ({ ...s, isOpen: false }));

  // Routine Groups (persisted in DB via backend API, with automatic migration)
  interface RoutineGroup {
    id: string;
    name: string;
    routineIds: string[];
    isExpanded: boolean;
  }

  const [groups, setGroups] = useState<RoutineGroup[]>([]);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      const folder = await api.createFolder(tokens.accessToken, newGroupName.trim());
      setGroups(prev => [...prev, { id: folder.id, name: folder.name, routineIds: [], isExpanded: true }]);
      setNewGroupName('');
      setIsGroupModalOpen(false);
      toast.success('Carpeta creada');
    } catch {
      toast.error('Error al crear la carpeta');
    }
  };

  const handleDeleteGroup = (groupId: string) => {
    showConfirm({
      title: 'Eliminar carpeta',
      message: '¿Eliminar esta carpeta? Las rutinas no se eliminarán.',
      confirmLabel: 'Eliminar',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await api.deleteFolder(tokens.accessToken, groupId);
          setGroups(prev => prev.filter(g => g.id !== groupId));
          setRoutines(prev => prev.map(r => r.folderId === groupId ? { ...r, folderId: null } : r));
          toast.success('Carpeta eliminada');
        } catch {
          toast.error('Error al eliminar la carpeta');
        }
      },
    });
  };

  const handleToggleGroup = (groupId: string) => {
    setGroups(groups.map(g => g.id === groupId ? { ...g, isExpanded: !g.isExpanded } : g));
  };

  const handleMoveToGroup = async (routineId: string, groupId: string) => {
    try {
      await api.setRoutineFolder(tokens.accessToken, routineId, groupId);
      setGroups(prev => prev.map(g => {
        const ids = Array.isArray(g.routineIds) ? g.routineIds : [];
        if (g.id === groupId) return { ...g, routineIds: [...ids.filter(id => id !== routineId), routineId] };
        return { ...g, routineIds: ids.filter(id => id !== routineId) };
      }));
      setRoutines(prev => prev.map(r => r.id === routineId ? { ...r, folderId: groupId } : r));
      toast.success('Rutina asignada a la carpeta');
    } catch {
      toast.error('Error al mover la rutina');
    }
  };

  const handleRemoveFromGroup = async (routineId: string) => {
    try {
      await api.setRoutineFolder(tokens.accessToken, routineId, null);
      setGroups(prev => prev.map(g => ({
        ...g,
        routineIds: (Array.isArray(g.routineIds) ? g.routineIds : []).filter(id => id !== routineId),
      })));
      setRoutines(prev => prev.map(r => r.id === routineId ? { ...r, folderId: null } : r));
      toast.success('Rutina retirada de la carpeta');
    } catch {
      toast.error('Error al desasignar la rutina');
    }
  };

  const groupedRoutineIds = new Set(groups.flatMap(g => Array.isArray(g.routineIds) ? g.routineIds : []));
  const ungroupedRoutines = (routines || []).filter(r => r && r.id && !groupedRoutineIds.has(r.id));

  const loadRoutinesAndFolders = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Check if localStorage has old groups that need migration
      const saved = localStorage.getItem('ascend_routine_groups');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            for (const localGroup of parsed) {
              if (localGroup && localGroup.name) {
                const created = await api.createFolder(tokens.accessToken, String(localGroup.name));
                if (Array.isArray(localGroup.routineIds)) {
                  for (const rId of localGroup.routineIds) {
                    try {
                      await api.setRoutineFolder(tokens.accessToken, String(rId), created.id);
                    } catch {
                      // ignore if routine doesn't exist anymore
                    }
                  }
                }
              }
            }
          }
          localStorage.removeItem('ascend_routine_groups');
        } catch (e) {
          console.error('Error migrating local routine groups:', e);
        }
      }

      // 2. Fetch routines and folders from backend
      const [routinesData, foldersData] = await Promise.all([
        api.listRoutines(tokens.accessToken),
        api.listFolders(tokens.accessToken),
      ]);

      setRoutines(routinesData);
      setGroups((prevGroups) => {
        const expandedMap = new Map(prevGroups.map(g => [g.id, g.isExpanded]));
        return foldersData.map(f => ({
          id: f.id,
          name: f.name,
          routineIds: f.routineIds || [],
          isExpanded: expandedMap.has(f.id) ? expandedMap.get(f.id)! : true,
        }));
      });
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, [tokens]);

  useEffect(() => {
    loadRoutinesAndFolders();
  }, [loadRoutinesAndFolders]);

  const handleOpenNewRoutineModal = () => {
    onOpenEditor({ isNew: true, routineId: null, name: 'Nueva rutina', detail: null });
  };

  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);

  const handleTemplateAdded = async () => {
    await loadRoutinesAndFolders();
  };

  const handleEditRoutine = async (routineId: string) => {
    try {
      const detail = await api.getRoutine(tokens.accessToken, routineId);
      onOpenEditor({ isNew: false, routineId, name: detail.name, detail });
    } catch {
      toast.error('Error al cargar la rutina.');
    }
  };

  const handleDuplicateRoutine = async (routineId: string) => {
    try {
      const detail = await api.getRoutine(tokens.accessToken, routineId);
      await api.saveRoutine(tokens.accessToken, {
        name: `${detail.name} (Copia)`,
        exercises: detail.exercises.map((ex) => ({
          exerciseId: ex.exercise.id,
          targetSets: ex.targetSets ?? undefined,
          targetWeight: ex.targetWeight ?? undefined,
          targetRepetitionsMin: ex.targetRepetitionsMin ?? undefined,
          targetRepetitionsMax: ex.targetRepetitionsMax ?? undefined,
          restSeconds: ex.restSeconds ?? undefined,
          notes: ex.notes ?? undefined,
        })),
      });

      await loadRoutinesAndFolders();
      toast.success('Rutina duplicada con éxito.');
    } catch {
      toast.error('No fue posible duplicar la rutina.');
    }
  };

  const handleDeleteRoutine = (routineId: string, name: string) => {
    showConfirm({
      title: 'Eliminar rutina',
      message: `¿Estás seguro de que deseas eliminar "${name}"?`,
      confirmLabel: 'Eliminar',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await api.deleteRoutine(tokens.accessToken, routineId);
          setRoutines((prev) => prev.filter((r) => r.id !== routineId));
          setGroups((prev) => prev.map((g) => ({
            ...g,
            routineIds: g.routineIds.filter((id) => id !== routineId),
          })));
          toast.success('Rutina eliminada.');
        } catch {
          toast.error('No fue posible eliminar la rutina.');
        }
      },
    });
  };


  const renderRoutineCard = (routine: RoutineSummary) => (
    <div key={routine.id} style={styles.routineCard}>
      <div style={styles.cardTopRow}>
        <div style={styles.routineIconBadge}>
          <Dumbbell size={20} color="var(--accent-teal)" />
        </div>
        <div style={styles.cardActionsRow}>
          <button
            style={styles.iconActionBtn}
            onClick={() => handleDuplicateRoutine(routine.id)}
            title="Duplicar rutina"
          >
            <Copy size={16} color="var(--text-muted)" />
          </button>
          <button
            style={styles.iconActionBtn}
            onClick={() => handleEditRoutine(routine.id)}
            title="Editar plantilla"
          >
            <Edit3 size={16} color="var(--text-muted)" />
          </button>
          <button
            style={styles.iconActionBtnDelete}
            onClick={() => handleDeleteRoutine(routine.id, routine.name)}
            title="Eliminar rutina"
          >
            <Trash2 size={16} color="var(--danger-color)" />
          </button>
        </div>
      </div>

      <div style={styles.cardMain}>
        <h3 style={styles.routineCardTitle}>{routine.name}</h3>
        <div style={styles.routineMetaRow}>
          <div style={styles.routineMetaPill}>
            <Layers size={13} color="var(--accent-teal)" />
            <span>{routine.exerciseCount} {routine.exerciseCount === 1 ? 'ejercicio' : 'ejercicios'} programados</span>
          </div>
          <div style={styles.routineMetaPill}>
            <Dumbbell size={13} color="var(--accent-teal)" />
            <span>{routine.totalSets ?? 0} {(routine.totalSets ?? 0) === 1 ? 'serie total' : 'series totales'}</span>
          </div>
        </div>
      </div>

      <div style={styles.cardFooter}>
        <button
          style={styles.startRoutineBtn}
          onClick={() => onStartWorkout(routine.id)}
        >
          <Play size={14} fill="var(--bg-color)" color="var(--bg-color)" style={{ marginLeft: '2px' }} />
          <span>Iniciar rutina</span>
        </button>

        {groups.length > 0 && (
          <select
            style={styles.groupSelectDropdown}
            onChange={(e) => {
              if (e.target.value === '__none') handleRemoveFromGroup(routine.id);
              else if (e.target.value) handleMoveToGroup(routine.id, e.target.value);
            }}
            defaultValue=""
          >
            <option value="" disabled>Mover a carpeta...</option>
            <option value="__none">Sin carpeta</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      {/* Top Header Hero */}
      <div style={styles.headerHero}>
        <div>
          <h1 style={styles.title}>Mis Rutinas</h1>
          <p style={styles.subtitle}>Crea plantillas personalizadas, organízalas en carpetas y comienza a entrenar con un solo clic.</p>
        </div>

        <div style={styles.headerActions}>
          <button style={styles.createRoutineBtn} onClick={handleOpenNewRoutineModal}>
            <Plus size={18} />
            <span>Nueva rutina</span>
          </button>
          <button style={styles.newGroupBtn} onClick={() => setIsTemplatesModalOpen(true)}>
            <ClipboardList size={17} color="var(--accent-teal)" />
            <span>Plantillas</span>
          </button>
          <button style={styles.newGroupBtn} onClick={() => setIsGroupModalOpen(true)}>
            <Folder size={17} color="var(--accent-teal)" />
            <span>Nueva carpeta</span>
          </button>
        </div>
      </div>

      {/* Primary Empty Workout Quick Bar */}
      <div style={styles.quickStartCard} onClick={() => onStartWorkout()}>
        <div style={styles.quickStartLeft}>
          <div style={styles.quickStartIcon}>
            <Play size={20} fill="var(--accent-teal)" color="var(--accent-teal)" style={{ marginLeft: '2px' }} />
          </div>
          <div>
            <h3 style={styles.quickStartTitle}>Entrenamiento Libre (Sesión Vacía)</h3>
            <p style={styles.quickStartSub}>Comienza a registrar series directamente sin una plantilla previa</p>
          </div>
        </div>
        <button style={styles.quickStartActionBtn}>
          <span>Comenzar</span>
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Routine Groups Accordions */}
      {groups.length > 0 && (
        <div style={styles.groupsContainer}>
          {groups.map((group) => {
            const ids = Array.isArray(group.routineIds) ? group.routineIds : [];
            const groupRoutines = routines.filter(r => ids.includes(r.id));

            const folderMuscleMap = new Map<string, number>();
            let folderTotalSets = 0;

            for (const r of groupRoutines) {
              folderTotalSets += r.totalSets ?? 0;
              if (r.muscleSets) {
                for (const ms of r.muscleSets) {
                  folderMuscleMap.set(ms.muscleGroup, (folderMuscleMap.get(ms.muscleGroup) ?? 0) + ms.sets);
                }
              }
            }

            const folderMuscleStats = Array.from(folderMuscleMap.entries())
              .map(([muscleGroup, sets]) => ({ muscleGroup, sets }))
              .sort((a, b) => b.sets - a.sets);

            return (
              <div key={group.id} style={styles.groupAccordionBox}>
                <div style={styles.groupHeaderRow}>
                  <button style={styles.groupHeaderBtn} onClick={() => handleToggleGroup(group.id)}>
                    {group.isExpanded ? <ChevronDown size={20} color="var(--accent-teal)" /> : <ChevronRight size={20} color="var(--accent-teal)" />}
                    <Folder size={18} color="var(--accent-teal)" />
                    <span style={styles.groupTitleText}>{group.name}</span>
                    <span style={styles.groupBadgeCount}>{groupRoutines.length} {groupRoutines.length === 1 ? 'rutina' : 'rutinas'}</span>
                    {folderTotalSets > 0 && (
                      <span style={styles.groupSetsCountBadge}>{folderTotalSets} series</span>
                    )}
                  </button>

                  <button
                    style={styles.deleteGroupBtn}
                    onClick={() => handleDeleteGroup(group.id)}
                    title="Eliminar carpeta"
                  >
                    <Trash2 size={16} color="var(--text-dim)" />
                  </button>
                </div>

                {group.isExpanded && (
                  <div style={styles.groupExpandedContent}>
                    {groupRoutines.length > 0 && (
                      <div style={styles.folderVolumeBox}>
                        <div style={styles.folderVolumeHeader}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <div style={styles.folderVolumeIconBadge}>
                              <Layers size={16} color="var(--accent-teal)" />
                            </div>
                            <div>
                              <div style={styles.folderVolumeEyebrow}>VOLUMEN SEMANAL DE LA CARPETA</div>
                              <h4 style={styles.folderVolumeTitle}>Series Semanales por Grupo Muscular</h4>
                            </div>
                          </div>
                          <div style={styles.folderVolumeTotalBadge}>
                            <Dumbbell size={14} color="var(--accent-teal)" />
                            <span>{folderTotalSets} {folderTotalSets === 1 ? 'serie semanal total' : 'series semanales totales'}</span>
                          </div>
                        </div>

                        {folderMuscleStats.length === 0 ? (
                          <div style={styles.folderVolumeEmptyNotice}>
                            No hay series configuradas en los ejercicios de las rutinas de esta carpeta.
                          </div>
                        ) : (
                          <div style={styles.folderMuscleGrid}>
                            {folderMuscleStats.map((item) => {
                              const color = MUSCLE_COLOR_MAP[item.muscleGroup] || 'var(--accent-teal)';
                              let badgeText = 'Mantenimiento';
                              let badgeStyle = styles.badgeMaintenance;

                              if (item.sets >= 10 && item.sets <= 20) {
                                badgeText = 'Óptimo';
                                badgeStyle = styles.badgeOptimal;
                              } else if (item.sets > 20) {
                                badgeText = 'Volumen Alto';
                                badgeStyle = styles.badgeHigh;
                              }

                              return (
                                <div key={item.muscleGroup} style={styles.folderMuscleCard}>
                                  <div style={styles.folderMuscleCardHeader}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                      <span style={{ ...styles.muscleDot, backgroundColor: color }} />
                                      <span style={styles.folderMuscleName}>{item.muscleGroup}</span>
                                    </div>
                                    <span style={{ ...styles.statusBadgeSmall, ...badgeStyle }}>
                                      {badgeText}
                                    </span>
                                  </div>
                                  <div style={styles.folderMuscleSetsRow}>
                                    <span style={styles.folderMuscleSetsValue}>{item.sets}</span>
                                    <span style={styles.folderMuscleSetsUnit}>series/sem</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    <div style={styles.routinesGrid}>
                      {groupRoutines.length === 0 ? (
                        <div style={styles.groupEmptyState}>
                          Carpeta vacía. Mueve rutinas usando el selector en cada tarjeta.
                        </div>
                      ) : (
                        groupRoutines.map(renderRoutineCard)
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Ungrouped Routines Section */}
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>
          {groups.length > 0 ? 'Rutinas Generales' : 'Todas las Rutinas'}
        </h2>
        <span style={styles.totalBadge}>{ungroupedRoutines.length} disponibles</span>
      </div>

      {loading ? (
        <div style={styles.loadingBox}>Cargando rutinas...</div>
      ) : ungroupedRoutines.length === 0 && groups.length === 0 ? (
        <div style={styles.emptyState}>
          <Dumbbell size={40} color="var(--accent-teal)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
            No tienes rutinas creadas
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
            Crea tu primera rutina con tus ejercicios favoritos para entrenar con mayor rapidez.
          </p>
          <button style={styles.createRoutineBtn} onClick={handleOpenNewRoutineModal}>
            <Plus size={18} />
            <span>Crear mi primera rutina</span>
          </button>
        </div>
      ) : (
        <div style={styles.routinesGrid}>
          {ungroupedRoutines.map(renderRoutineCard)}
        </div>
      )}

      {/* Create Group Modal */}
      {isGroupModalOpen && (
        <div className="modal-overlay" onClick={() => setIsGroupModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Nueva Carpeta</h2>
              <button style={styles.closeBtn} onClick={() => setIsGroupModalOpen(false)}>
                <X size={20} color="var(--text-muted)" />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={styles.inputLabel}>Nombre de la carpeta</label>
                <input
                  type="text"
                  placeholder="Ej. Torso / Pierna, Push Pull Legs..."
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  style={{ width: '100%', marginTop: '0.4rem' }}
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button style={styles.cancelBtn} onClick={() => setIsGroupModalOpen(false)}>
                  Cancelar
                </button>
                <button style={styles.saveBtn} onClick={handleCreateGroup}>
                  Crear carpeta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Confirm Modal (replaces window.confirm) */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        variant={confirmState.variant}
        onConfirm={() => {
          confirmState.onConfirm();
          closeConfirm();
        }}
        onCancel={closeConfirm}
      />

      {/* Routine Templates Modal */}
      {isTemplatesModalOpen && (
        <RoutineTemplatesModal
          tokens={tokens}
          onClose={() => setIsTemplatesModalOpen(false)}
          onAdded={handleTemplateAdded}
        />
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: 'clamp(1.5rem, 4vw, 2.5rem) clamp(1rem, 5vw, 3rem)',
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
    maxWidth: '1280px',
    margin: '0 auto',
    boxSizing: 'border-box',
  },
  headerHero: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-container)',
    padding: '2rem 2.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '1.5rem',
  },
  title: {
    fontSize: '2.2rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    letterSpacing: '-0.03em',
  },
  subtitle: {
    color: 'var(--text-muted)',
    fontSize: '0.95rem',
    marginTop: '0.25rem',
  },
  headerActions: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  createRoutineBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: 'var(--accent-teal)',
    color: 'var(--bg-color)',
    padding: '0.75rem 1.25rem',
    borderRadius: 'var(--radius-container)',
    fontWeight: 800,
    fontSize: '0.92rem',
    
  },
  newGroupBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    padding: '0.75rem 1.15rem',
    borderRadius: 'var(--radius-container)',
    fontWeight: 700,
    fontSize: '0.9rem',
  },
  quickStartCard: {
    backgroundColor: 'var(--card-color)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-container)',
    padding: '1.25rem 1.75rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  quickStartLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  quickStartIcon: {
    width: '44px',
    height: '44px',
    borderRadius: 'var(--radius-control)',
    backgroundColor: 'rgba(192, 138, 90, 0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickStartTitle: {
    fontSize: '1.05rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
  },
  quickStartSub: {
    fontSize: '0.82rem',
    color: 'var(--text-muted)',
  },
  quickStartActionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    color: 'var(--accent-teal)',
    fontWeight: 700,
    fontSize: '0.9rem',
  },
  groupsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  groupAccordionBox: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-container)',
    padding: '1.25rem 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  groupHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groupHeaderBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    cursor: 'pointer',
  },
  groupTitleText: {
    fontSize: '1.15rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
  },
  groupBadgeCount: {
    backgroundColor: 'var(--input-bg)',
    color: 'var(--accent-teal)',
    fontSize: '0.75rem',
    fontWeight: 800,
    padding: '0.15rem 0.55rem',
    borderRadius: 'var(--radius-full)',
  },
  groupSetsCountBadge: {
    backgroundColor: 'rgba(192, 138, 90, 0.12)',
    color: 'var(--accent-teal)',
    border: '1px solid rgba(192, 138, 90, 0.25)',
    fontSize: '0.72rem',
    fontWeight: 700,
    padding: '0.15rem 0.55rem',
    borderRadius: 'var(--radius-full)',
  },
  deleteGroupBtn: {
    padding: '0.4rem',
    borderRadius: 'var(--radius-element)',
  },
  groupEmptyState: {
    padding: '2rem',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '0.88rem',
    backgroundColor: 'var(--input-bg)',
    borderRadius: 'var(--radius-container)',
    width: '100%',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '0.5rem',
  },
  sectionTitle: {
    fontSize: '1.3rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
  },
  totalBadge: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-muted)',
    padding: '0.25rem 0.75rem',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.8rem',
    fontWeight: 700,
  },
  routinesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '1.25rem',
  },
  routineCard: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-container)',
    padding: '1.35rem 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
    transition: 'all 0.15s ease',
  },
  cardTopRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  routineIconBadge: {
    width: '38px',
    height: '38px',
    borderRadius: 'var(--radius-control)',
    backgroundColor: 'rgba(192, 138, 90, 0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardActionsRow: {
    display: 'flex',
    gap: '0.35rem',
  },
  iconActionBtn: {
    padding: '0.45rem',
    borderRadius: 'var(--radius-element)',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconActionBtnDelete: {
    padding: '0.45rem',
    borderRadius: 'var(--radius-element)',
    backgroundColor: 'rgba(192, 105, 105, 0.1)',
    border: '1px solid rgba(192, 105, 105, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMain: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.45rem',
  },
  routineCardTitle: {
    fontSize: '1.15rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
  },
  routineMetaRow: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '0.65rem',
  },
  routineMetaPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    fontWeight: 600,
  },
  cardFooter: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.65rem',
    marginTop: 'auto',
    paddingTop: '0.5rem',
  },
  startRoutineBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    backgroundColor: 'var(--accent-teal)',
    color: 'var(--bg-color)',
    padding: '0.65rem',
    borderRadius: 'var(--radius-container)',
    fontWeight: 800,
    fontSize: '0.88rem',
    
  },
  groupSelectDropdown: {
    fontSize: '0.78rem',
    padding: '0.4rem 0.65rem',
    borderRadius: 'var(--radius-element)',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-muted)',
    fontWeight: 600,
  },
  loadingBox: {
    padding: '4rem',
    textAlign: 'center',
    color: 'var(--text-muted)',
  },
  emptyState: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-container)',
    padding: '4rem 2rem',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1.25rem',
  },
  modalTitle: {
    fontSize: '1.35rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
  },
  closeBtn: {
    padding: '0.35rem',
  },
  inputLabel: {
    fontSize: '0.85rem',
    fontWeight: 700,
    color: 'var(--text-secondary)',
  },


  cancelBtn: {
    padding: '0.7rem 1.25rem',
    borderRadius: 'var(--radius-control)',
    color: 'var(--text-muted)',
    fontWeight: 600,
    border: '1px solid var(--border-color)',
  },
  saveBtn: {
    backgroundColor: 'var(--accent-teal)',
    color: 'var(--bg-color)',
    padding: '0.7rem 1.35rem',
    borderRadius: 'var(--radius-control)',
    fontWeight: 800,
    fontSize: '0.9rem',
    
  },
  groupExpandedContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
    width: '100%',
  },
  folderVolumeBox: {
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-container)',
    padding: '1.15rem 1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  folderVolumeHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '0.75rem',
  },
  folderVolumeIconBadge: {
    width: '34px',
    height: '34px',
    borderRadius: 'var(--radius-control)',
    backgroundColor: 'rgba(192, 138, 90, 0.12)',
    border: '1px solid rgba(192, 138, 90, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  folderVolumeEyebrow: {
    fontSize: '0.68rem',
    fontWeight: 800,
    letterSpacing: '0.08em',
    color: 'var(--accent-teal)',
    textTransform: 'uppercase',
  },
  folderVolumeTitle: {
    fontSize: '0.98rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    margin: 0,
  },
  folderVolumeTotalBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.45rem',
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    fontSize: '0.8rem',
    fontWeight: 700,
    padding: '0.35rem 0.75rem',
    borderRadius: 'var(--radius-full)',
  },
  folderVolumeEmptyNotice: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
  },
  folderMuscleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
    gap: '0.75rem',
  },
  folderMuscleCard: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-container)',
    padding: '0.75rem 0.85rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    transition: 'all 0.15s ease',
  },
  folderMuscleCardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.4rem',
    minWidth: 0,
  },
  folderMuscleName: {
    fontSize: '0.82rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    flex: '1 1 auto',
    minWidth: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  folderMuscleSetsRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '0.35rem',
  },
  folderMuscleSetsValue: {
    fontSize: '1.25rem',
    fontWeight: 900,
    color: 'var(--text-primary)',
    lineHeight: 1,
  },
  folderMuscleSetsUnit: {
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
    fontWeight: 600,
  },
  muscleDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    display: 'inline-block',
    flexShrink: 0,
  },
  statusBadgeSmall: {
    fontSize: '0.62rem',
    fontWeight: 700,
    padding: '0.15rem 0.4rem',
    borderRadius: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  badgeOptimal: {
    backgroundColor: 'rgba(76, 175, 125, 0.15)',
    color: 'var(--accent-green)',
    border: '1px solid rgba(76, 175, 125, 0.3)',
  },
  badgeHigh: {
    backgroundColor: 'rgba(192, 138, 90, 0.15)',
    color: 'var(--accent-gold)',
    border: '1px solid rgba(192, 138, 90, 0.3)',
  },
  badgeMaintenance: {
    backgroundColor: 'rgba(192, 194, 198, 0.14)',
    color: '#C0C2C6',
    border: '1px solid rgba(192, 194, 198, 0.3)',
  },
};
