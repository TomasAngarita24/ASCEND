import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { matchesSearch } from '../utils/text';
import {
  api,
  OfflineQueuedError,
  type ExerciseSummary,
  type WorkoutHistoryEntry,
} from '../api/api';
import { CHIP_DEFS, type SortKey } from '../components/exercise/ExerciseFilters';

const FAVORITES_KEY = 'ascend_exercise_favorites';

function readLegacyFavoriteIds(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export const useExerciseLibrary = (urlExerciseId?: string) => {
  const [exercises, setExercises] = useState<ExerciseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'custom' | 'favorites'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState('Todos');
  const [selectedEquipment, setSelectedEquipment] = useState('Todos');
  const [activeChip, setActiveChip] = useState('Todos');
  const [sortBy, setSortBy] = useState<SortKey>('default');
  const [selectedExercise, setSelectedExercise] = useState<ExerciseSummary | null>(null);
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutHistoryEntry[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(readLegacyFavoriteIds);

  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favoriteIds));
    } catch {
      // Storage unavailable
    }
  }, [favoriteIds]);

  // Create / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<ExerciseSummary | null>(null);
  const [formName, setFormName] = useState('');
  const [formMuscle, setFormMuscle] = useState('Pecho');
  const [formEquipment, setFormEquipment] = useState('Mancuernas');
  const [formDesc, setFormDesc] = useState('');
  const [formInstructions, setFormInstructions] = useState('');
  const [formMediaUrl, setFormMediaUrl] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete modal state
  const [deletingExercise, setDeletingExercise] = useState<ExerciseSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchExercises = () => {
      setLoading(true);
      Promise.all([api.listExercises(), api.listWorkoutHistory().catch(() => [])])
        .then(async ([exList, hist]) => {
          setExercises(exList);
          setWorkoutHistory(hist);

          const validIds = new Set(exList.map((ex) => ex.id));
          let serverIds: string[] = [];
          let serverOk = false;
          try {
            serverIds = await api.listFavorites();
            serverOk = true;
          } catch {
            // offline
          }

          const legacyIds = readLegacyFavoriteIds().filter((id) => validIds.has(id));
          const merged = serverOk
            ? Array.from(new Set([...serverIds, ...legacyIds]))
            : legacyIds;

          if (serverOk && legacyIds.length > 0) {
            const missing = legacyIds.filter((id) => !serverIds.includes(id));
            missing.forEach((id) => api.addExerciseFavorite(id).catch(() => {}));
          }

          setFavoriteIds(merged);
        })
        .catch(() => toast.error('Error al cargar la biblioteca de ejercicios.'))
        .finally(() => setLoading(false));
    };

    fetchExercises();
  }, []);

  useEffect(() => {
    if (!urlExerciseId) {
      setSelectedExercise(null);
      return;
    }
    const target = exercises.find((ex) => ex.id === urlExerciseId);
    if (target) setSelectedExercise(target);
  }, [urlExerciseId, exercises]);

  const customExercises = useMemo(() => {
    return exercises.filter((ex) => ex.isCustom === true);
  }, [exercises]);

  const favoriteExercises = useMemo(() => {
    return exercises.filter((ex) => favoriteIds.includes(ex.id));
  }, [exercises, favoriteIds]);

  const toggleFavorite = useCallback(
    async (id: string) => {
      const adding = !favoriteIds.includes(id);
      setFavoriteIds((prev) => (adding ? [...prev, id] : prev.filter((x) => x !== id)));
      try {
        if (adding) {
          await api.addExerciseFavorite(id);
        } else {
          await api.removeExerciseFavorite(id);
        }
      } catch (err: unknown) {
        if (err instanceof OfflineQueuedError) {
          toast.info('Guardado. Se sincronizará cuando recuperes la conexión.');
          return;
        }
        setFavoriteIds((prev) => (adding ? prev.filter((x) => x !== id) : [...prev, id]));
        toast.error('No se pudo actualizar el favorito.');
      }
    },
    [favoriteIds]
  );

  const baseList =
    activeTab === 'custom'
      ? customExercises
      : activeTab === 'favorites'
      ? favoriteExercises
      : exercises;

  const filteredExercises = useMemo(() => {
    return baseList.filter((ex) => {
      if (searchQuery.trim() && !matchesSearch(ex.name, searchQuery)) return false;

      if (activeChip !== 'Todos') {
        const def = CHIP_DEFS.find((d) => d.label === activeChip);
        const syns = def ? def.muscles : [];
        if (
          syns.length > 0 &&
          !ex.targetMuscleGroups.some((g) => syns.some((s) => matchesSearch(g, s)))
        )
          return false;
      } else if (
        selectedMuscle !== 'Todos' &&
        !ex.targetMuscleGroups.some((m) => matchesSearch(m, selectedMuscle))
      ) {
        return false;
      }

      if (selectedEquipment !== 'Todos') {
        const t = selectedEquipment.toLowerCase().trim();
        if (t === 'ninguno') {
          if (ex.equipment && ex.equipment.toLowerCase().trim() !== 'ninguno') return false;
        } else if (!ex.equipment || ex.equipment.toLowerCase().trim() !== t) {
          return false;
        }
      }
      return true;
    });
  }, [baseList, searchQuery, activeChip, selectedMuscle, selectedEquipment]);

  const sortedExercises = useMemo(() => {
    const arr = [...filteredExercises];
    if (sortBy === 'az') arr.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    else if (sortBy === 'za') arr.sort((a, b) => b.name.localeCompare(a.name, 'es'));
    return arr;
  }, [filteredExercises, sortBy]);

  const selectChip = useCallback((label: string) => {
    setActiveChip(label);
    const def = CHIP_DEFS.find((d) => d.label === label);
    setSelectedMuscle(def && def.muscles.length > 0 ? def.muscles[0] : 'Todos');
  }, []);

  const chipForMuscle = useCallback((m: string) => {
    if (m === 'Todos') return 'Todos';
    const def = CHIP_DEFS.find(
      (d) => d.label !== 'Todos' && d.muscles.some((s) => matchesSearch(m, s))
    );
    return def ? def.label : 'Todos';
  }, []);

  const onMuscleFilterChange = useCallback(
    (m: string) => {
      setSelectedMuscle(m);
      setActiveChip(chipForMuscle(m));
    },
    [chipForMuscle]
  );

  const clearFilters = useCallback(() => {
    setActiveChip('Todos');
    setSelectedMuscle('Todos');
    setSelectedEquipment('Todos');
  }, []);

  const openCreateModal = useCallback(() => {
    setEditingExercise(null);
    setFormName('');
    setFormMuscle('Pecho');
    setFormEquipment('Mancuernas');
    setFormDesc('');
    setFormInstructions('');
    setFormMediaUrl('');
    setFormError(null);
    setIsModalOpen(true);
  }, []);

  const openEditModal = useCallback((ex: ExerciseSummary) => {
    setEditingExercise(ex);
    setFormName(ex.name);
    setFormMuscle(ex.targetMuscleGroups[0] || 'Pecho');
    setFormEquipment(ex.equipment || 'Mancuernas');
    setFormDesc(ex.description || '');
    setFormInstructions(ex.instructions || '');
    setFormMediaUrl(ex.mediaUrl || '');
    setFormError(null);
    setIsModalOpen(true);
  }, []);

  const handleFormSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formName.trim()) return;
      setFormSubmitting(true);
      setFormError(null);

      try {
        if (editingExercise) {
          const updated = await api.updateExercise(editingExercise.id, {
            name: formName.trim(),
            targetMuscleGroups: [formMuscle],
            equipment: formEquipment,
            description: formDesc.trim() || undefined,
            instructions: formInstructions.trim() || undefined,
            mediaUrl: formMediaUrl.trim() || undefined,
          });
          setExercises((prev) =>
            prev.map((ex) => (ex.id === editingExercise.id ? { ...ex, ...updated } : ex))
          );
          if (selectedExercise && selectedExercise.id === editingExercise.id) {
            setSelectedExercise((prev) => (prev ? { ...prev, ...updated } : null));
          }
        } else {
          const created = await api.createExercise({
            name: formName.trim(),
            targetMuscleGroups: [formMuscle],
            equipment: formEquipment,
            description: formDesc.trim() || undefined,
            instructions: formInstructions.trim() || undefined,
            mediaUrl: formMediaUrl.trim() || undefined,
          });
          setExercises((prev) => [created, ...prev]);
          setActiveTab('custom');
        }
        setIsModalOpen(false);
      } catch (err: unknown) {
        setFormError(err instanceof Error ? err.message : 'Error al guardar el ejercicio.');
      } finally {
        setFormSubmitting(false);
      }
    },
    [editingExercise, formDesc, formEquipment, formInstructions, formMediaUrl, formMuscle, formName, selectedExercise]
  );

  const handleDeleteExercise = useCallback(async () => {
    if (!deletingExercise) return;
    setDeleting(true);
    try {
      await api.deleteExercise(deletingExercise.id);
      setExercises((prev) => prev.filter((ex) => ex.id !== deletingExercise.id));
      setFavoriteIds((prev) => prev.filter((id) => id !== deletingExercise.id));
      if (selectedExercise && selectedExercise.id === deletingExercise.id) {
        setSelectedExercise(null);
      }
      setDeletingExercise(null);
      toast.success('Ejercicio eliminado.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar el ejercicio.');
    } finally {
      setDeleting(false);
    }
  }, [deletingExercise, selectedExercise]);

  return {
    exercises,
    customExercises,
    favoriteExercises,
    sortedExercises,
    loading,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    selectedMuscle,
    onMuscleFilterChange,
    selectedEquipment,
    setSelectedEquipment,
    activeChip,
    selectChip,
    sortBy,
    setSortBy,
    clearFilters,
    favoriteIds,
    toggleFavorite,
    selectedExercise,
    setSelectedExercise,
    workoutHistory,
    isModalOpen,
    setIsModalOpen,
    editingExercise,
    formName,
    setFormName,
    formMuscle,
    setFormMuscle,
    formEquipment,
    setFormEquipment,
    formDesc,
    setFormDesc,
    formInstructions,
    setFormInstructions,
    formMediaUrl,
    setFormMediaUrl,
    formSubmitting,
    formError,
    openCreateModal,
    openEditModal,
    handleFormSubmit,
    deletingExercise,
    setDeletingExercise,
    deleting,
    handleDeleteExercise,
  };
};
