import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Plus,
  Dumbbell,
  ChevronRight,
  X,
  TrendingUp,
  Trophy,
  Zap,
  ArrowLeft,
  Edit2,
  Trash2,
  Sparkles,
  Layers,
  BookOpen,
  Info,
} from 'lucide-react';
import {
  api,
  type ExerciseSummary,
  type Tokens,
  type WorkoutHistoryEntry,
  type WorkoutDetailEntry,
} from '../api/api';

interface ExerciseLibraryViewProps {
  tokens: Tokens;
}

const MUSCLE_GROUPS = [
  'Todos',
  'Pecho',
  'Dorsal',
  'Hombros',
  'Trapecio',
  'Biceps',
  'Triceps',
  'Antebrazo',
  'Abdominales',
  'Espalda baja',
  'Cuadriceps',
  'Femoral',
  'Gluteos',
  'Pantorrillas',
  'Adductor',
  'Cardio',
  'Full body',
  'Otros',
];

const EQUIPMENT_OPTIONS = [
  'Todos',
  'Ninguno',
  'Barra',
  'Mancuernas',
  'Maquinas',
  'Kettlebell',
  'Discos',
  'Bandas de resistencia',
  'Otros',
];

// ─── Brzycki 1RM formula ────────────────────────────────────────────────────
function calc1RM(weight: number, reps: number): number {
  if (reps <= 0 || reps === 1) return weight;
  return Math.round(weight / (1.0278 - 0.0278 * reps));
}

// ─── Minimal SVG line chart ─────────────────────────────────────────────────
interface ChartPoint { date: string; value: number }

const LineChart: React.FC<{ data: ChartPoint[]; color: string; label: string }> = ({ data, color, label }) => {
  const W = 560;
  const H = 180;
  const PAD = { top: 20, right: 20, bottom: 36, left: 50 };

  if (data.length === 0) return (
    <div style={{ height: H, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: '0.9rem' }}>
      Sin datos de historial para este ejercicio
    </div>
  );

  const vals = data.map(d => d.value);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const range = maxV - minV || 1;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const px = (i: number) => PAD.left + (i / (data.length - 1 || 1)) * innerW;
  const py = (v: number) => PAD.top + innerH - ((v - minV) / range) * innerH;

  const pathD = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${px(i).toFixed(1)},${py(d.value).toFixed(1)}`).join(' ');
  const areaD = `${pathD} L${px(data.length - 1).toFixed(1)},${(PAD.top + innerH).toFixed(1)} L${PAD.left},${(PAD.top + innerH).toFixed(1)} Z`;

  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => Math.round(minV + (range / ticks) * i));
  const xStep = Math.max(1, Math.ceil(data.length / 5));

  return (
    <div style={{ width: '100%' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={PAD.left} y1={py(t)} x2={W - PAD.right} y2={py(t)} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <text x={PAD.left - 8} y={py(t) + 4} textAnchor="end" fill="#64748b" fontSize="11">{t}</text>
          </g>
        ))}
        <defs>
          <linearGradient id={`grad-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#grad-${color.replace('#','')})`} />
        <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((d, i) => (
          <circle key={i} cx={px(i)} cy={py(d.value)} r="4" fill={color} stroke="#0b0f19" strokeWidth="2" />
        ))}
        {data.filter((_, i) => i % xStep === 0 || i === data.length - 1).map((d) => {
          const idx = data.indexOf(d);
          return (
            <text key={idx} x={px(idx)} y={H - 6} textAnchor="middle" fill="#64748b" fontSize="10">
              {new Date(d.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
            </text>
          );
        })}
        <text x={12} y={H / 2} fill="#64748b" fontSize="10" transform={`rotate(-90, 12, ${H / 2})`} textAnchor="middle">{label}</text>
      </svg>
    </div>
  );
};

// ─── Image Avatar with Fallback ─────────────────────────────────────────────
const ExerciseAvatar: React.FC<{ url?: string | null; name: string; size?: number }> = ({ url, name, size = 52 }) => {
  const [hasError, setHasError] = useState(false);

  if (!url || hasError) {
    return (
      <div style={{ width: size, height: size, borderRadius: 12, backgroundColor: 'var(--input-bg)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Dumbbell size={size * 0.45} color="#94a3b8" />
      </div>
    );
  }

  return (
    <div style={{ width: size, height: size, borderRadius: 12, overflow: 'hidden', backgroundColor: '#0f172a', border: '1px solid var(--border-color)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <img
        src={url}
        alt={name}
        onError={() => setHasError(true)}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        loading="lazy"
      />
    </div>
  );
};

// ─── Exercise Detail Panel ───────────────────────────────────────────────────
interface ExerciseDetailPanelProps {
  exercise: ExerciseSummary;
  tokens: Tokens;
  history: WorkoutHistoryEntry[];
  onBack: () => void;
  onEdit?: (exercise: ExerciseSummary) => void;
  onDelete?: (exercise: ExerciseSummary) => void;
}

const ExerciseDetailPanel: React.FC<ExerciseDetailPanelProps> = ({ exercise, tokens, history, onBack, onEdit, onDelete }) => {
  const [loadedWorkouts, setLoadedWorkouts] = useState<WorkoutDetailEntry[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(true);

  useEffect(() => {
    setLoadingDetails(true);
    const recent = history.slice(0, 20);
    Promise.all(recent.map(w => api.getWorkout(tokens.accessToken, w.id).catch(() => null)))
      .then(results => setLoadedWorkouts(results.filter(Boolean) as WorkoutDetailEntry[]))
      .finally(() => setLoadingDetails(false));
  }, [exercise.id, tokens, history]);

  const exerciseSets = useMemo(() => {
    const points: { date: string; weight: number; reps: number }[] = [];
    for (const w of loadedWorkouts) {
      const ex = w.exercises.find(e => e.exercise.id === exercise.id);
      if (!ex) continue;
      for (const s of ex.sets) {
        if (s.isCompleted && s.weight && s.repetitions && s.weight > 0) {
          points.push({ date: w.startedAt, weight: s.weight, reps: s.repetitions });
        }
      }
    }
    return points.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [loadedWorkouts, exercise.id]);

  const weightByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of exerciseSets) {
      const day = s.date.slice(0, 10);
      map.set(day, Math.max(map.get(day) ?? 0, s.weight));
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value }));
  }, [exerciseSets]);

  const oneRMByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of exerciseSets) {
      const day = s.date.slice(0, 10);
      const est = calc1RM(s.weight, s.reps);
      map.set(day, Math.max(map.get(day) ?? 0, est));
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value }));
  }, [exerciseSets]);

  const maxWeight = exerciseSets.length > 0 ? Math.max(...exerciseSets.map(s => s.weight)) : null;
  const max1RM = oneRMByDay.length > 0 ? Math.max(...oneRMByDay.map(d => d.value)) : null;
  const [activeChart, setActiveChart] = useState<'weight' | '1rm'>('weight');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.9rem', fontWeight: 600, width: 'fit-content', background: 'none', border: 'none', cursor: 'pointer' }}>
          <ArrowLeft size={18} /> Volver a la biblioteca
        </button>
        {exercise.isCustom && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {onEdit && (
              <button onClick={() => onEdit(exercise)} style={dS.actionEditBtn}>
                <Edit2 size={16} /><span>Editar ejercicio</span>
              </button>
            )}
            {onDelete && (
              <button onClick={() => onDelete(exercise)} style={dS.actionDeleteBtn}>
                <Trash2 size={16} /><span>Eliminar</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Header with Exercise Image */}
      <div style={dS.header}>
        <ExerciseAvatar url={exercise.mediaUrl} name={exercise.name} size={90} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
            <h1 style={dS.title}>{exercise.name}</h1>
            {exercise.isCustom && <span style={dS.customBadge}>Personalizado</span>}
          </div>
          {exercise.description && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.6rem', fontStyle: 'italic' }}>
              {exercise.description}
            </p>
          )}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {exercise.targetMuscleGroups.map(g => <span key={g} style={dS.tagM}>{g}</span>)}
            {exercise.equipment && <span style={dS.tagE}>{exercise.equipment}</span>}
          </div>
        </div>
      </div>

      {/* Instructions if available */}
      {exercise.instructions && (
        <div style={dS.instructionsCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-teal)', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.5rem' }}>
            <BookOpen size={18} />
            <span>Instrucciones de ejecución</span>
          </div>
          <div style={{ color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
            {exercise.instructions}
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem' }}>
        <div style={dS.stat}><Trophy size={20} color="#eab308" /><div style={dS.statV}>{maxWeight !== null ? `${maxWeight} kg` : '—'}</div><div style={dS.statL}>Peso máximo</div></div>
        <div style={dS.stat}><Zap size={20} color="#22f0c5" /><div style={dS.statV}>{max1RM !== null ? `${max1RM} kg` : '—'}</div><div style={dS.statL}>1RM estimado</div></div>
        <div style={dS.stat}><TrendingUp size={20} color="#6366f1" /><div style={dS.statV}>{exerciseSets.length}</div><div style={dS.statL}>Series registradas</div></div>
      </div>

      {/* Chart */}
      <div style={dS.chartCard}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#E6EEF3' }}>Progresión</h2>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {(['weight', '1rm'] as const).map(t => (
              <button key={t} onClick={() => setActiveChart(t)} style={{ padding: '0.35rem 0.85rem', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', ...(activeChart === t ? { backgroundColor: 'rgba(34,240,197,0.12)', color: '#22f0c5', borderColor: 'rgba(34,240,197,0.25)' } : { backgroundColor: 'transparent', color: '#64748b' }) }}>
                {t === 'weight' ? 'Peso máx.' : '1RM est.'}
              </button>
            ))}
          </div>
        </div>
        {loadingDetails ? (
          <div style={{ color: '#64748b', padding: '2rem 0' }}>Cargando datos...</div>
        ) : (
          <LineChart data={activeChart === 'weight' ? weightByDay : oneRMByDay} color={activeChart === 'weight' ? '#22f0c5' : '#6366f1'} label={activeChart === 'weight' ? 'kg' : '1RM kg'} />
        )}
      </div>

      {/* Recent sets */}
      {exerciseSets.length > 0 && (
        <div style={dS.chartCard}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#E6EEF3' }}>Últimas series</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '0.5rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <span>Fecha</span><span>Peso</span><span>Reps</span><span>1RM est.</span>
            </div>
            {[...exerciseSets].reverse().slice(0, 12).map((s, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '0.55rem 0.75rem', borderRadius: '8px', fontSize: '0.85rem', ...(i % 2 === 0 ? { backgroundColor: 'rgba(255,255,255,0.03)' } : {}) }}>
                <span style={{ color: '#94a3b8' }}>{new Date(s.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' })}</span>
                <span style={{ color: '#E6EEF3', fontWeight: 700 }}>{s.weight} kg</span>
                <span style={{ color: '#E6EEF3' }}>{s.reps}</span>
                <span style={{ color: '#22f0c5', fontWeight: 700 }}>{calc1RM(s.weight, s.reps)} kg</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const dS: Record<string, React.CSSProperties> = {
  header: { display: 'flex', alignItems: 'center', gap: '1.5rem', backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '18px', padding: '1.5rem 2rem' },
  title: { fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0' },
  customBadge: { backgroundColor: 'rgba(234, 179, 8, 0.15)', color: '#eab308', border: '1px solid rgba(234, 179, 8, 0.3)', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700 },
  tagM: { backgroundColor: 'rgba(52,211,153,0.15)', color: '#10b981', padding: '0.15rem 0.5rem', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600 },
  tagE: { backgroundColor: 'rgba(96,165,250,0.15)', color: '#3b82f6', padding: '0.15rem 0.5rem', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600 },
  instructionsCard: { backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 16, padding: '1.25rem 1.5rem' },
  stat: { backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 16, padding: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' },
  statV: { fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 },
  statL: { fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 },
  chartCard: { backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 18, padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1rem' },
  actionEditBtn: { display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '0.5rem 0.9rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' },
  actionDeleteBtn: { display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '0.5rem 0.9rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' },
};

// ─── Main View ───────────────────────────────────────────────────────────────
export const ExerciseLibraryView: React.FC<ExerciseLibraryViewProps> = ({ tokens }) => {
  const [exercises, setExercises] = useState<ExerciseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'catalog' | 'custom'>('catalog');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState('Todos');
  const [selectedEquipment, setSelectedEquipment] = useState('Todos');
  const [selectedExercise, setSelectedExercise] = useState<ExerciseSummary | null>(null);
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutHistoryEntry[]>([]);

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

  const fetchExercises = () => {
    setLoading(true);
    Promise.all([
      api.listExercises(tokens.accessToken),
      api.listWorkoutHistory(tokens.accessToken).catch(() => []),
    ])
      .then(([exList, hist]) => {
        setExercises(exList);
        setWorkoutHistory(hist);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchExercises();
  }, [tokens]);

  const customExercises = useMemo(() => {
    return exercises.filter(ex => ex.isCustom === true);
  }, [exercises]);

  const catalogExercises = useMemo(() => {
    return exercises.filter(ex => !ex.isCustom);
  }, [exercises]);

  const currentTabList = activeTab === 'custom' ? customExercises : exercises;

  const filteredExercises = useMemo(() => {
    return currentTabList.filter((ex) => {
      if (searchQuery.trim() && !ex.name.toLowerCase().includes(searchQuery.toLowerCase().trim())) return false;
      if (selectedMuscle !== 'Todos' && !ex.targetMuscleGroups.some(m => m.toLowerCase().trim() === selectedMuscle.toLowerCase().trim())) return false;
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
  }, [currentTabList, searchQuery, selectedMuscle, selectedEquipment]);

  const openCreateModal = () => {
    setEditingExercise(null);
    setFormName('');
    setFormMuscle('Pecho');
    setFormEquipment('Mancuernas');
    setFormDesc('');
    setFormInstructions('');
    setFormMediaUrl('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (ex: ExerciseSummary) => {
    setEditingExercise(ex);
    setFormName(ex.name);
    setFormMuscle(ex.targetMuscleGroups[0] || 'Pecho');
    setFormEquipment(ex.equipment || 'Mancuernas');
    setFormDesc(ex.description || '');
    setFormInstructions(ex.instructions || '');
    setFormMediaUrl(ex.mediaUrl || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    setFormSubmitting(true);
    setFormError(null);

    try {
      if (editingExercise) {
        // Update
        const updated = await api.updateExercise(tokens.accessToken, editingExercise.id, {
          name: formName.trim(),
          targetMuscleGroups: [formMuscle],
          equipment: formEquipment,
          description: formDesc.trim() || null,
          instructions: formInstructions.trim() || null,
          mediaUrl: formMediaUrl.trim() || null,
        });
        setExercises(prev => prev.map(ex => ex.id === editingExercise.id ? { ...ex, ...updated } : ex));
        if (selectedExercise && selectedExercise.id === editingExercise.id) {
          setSelectedExercise(prev => prev ? { ...prev, ...updated } : null);
        }
      } else {
        // Create
        const created = await api.createExercise(tokens.accessToken, {
          name: formName.trim(),
          targetMuscleGroups: [formMuscle],
          equipment: formEquipment,
          description: formDesc.trim() || undefined,
          instructions: formInstructions.trim() || undefined,
          mediaUrl: formMediaUrl.trim() || undefined,
        });
        setExercises(prev => [created, ...prev]);
        setActiveTab('custom');
      }
      setIsModalOpen(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Error al guardar el ejercicio.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteExercise = async () => {
    if (!deletingExercise) return;
    setDeleting(true);
    try {
      await api.deleteExercise(tokens.accessToken, deletingExercise.id);
      setExercises(prev => prev.filter(ex => ex.id !== deletingExercise.id));
      if (selectedExercise && selectedExercise.id === deletingExercise.id) {
        setSelectedExercise(null);
      }
      setDeletingExercise(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al eliminar el ejercicio.');
    } finally {
      setDeleting(false);
    }
  };

  if (selectedExercise) {
    return (
      <div style={styles.container}>
        <ExerciseDetailPanel
          exercise={selectedExercise}
          tokens={tokens}
          history={workoutHistory}
          onBack={() => setSelectedExercise(null)}
          onEdit={openEditModal}
          onDelete={setDeletingExercise}
        />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Biblioteca de Ejercicios</h1>
          <p style={styles.subtitle}>Explora el catálogo ilustrado o gestiona tus propios ejercicios personalizados</p>
        </div>
        <button style={styles.createBtn} onClick={openCreateModal}>
          <Plus size={18} /><span>Crear ejercicio</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div style={styles.tabsContainer}>
        <button
          onClick={() => setActiveTab('catalog')}
          style={{
            ...styles.tabButton,
            ...(activeTab === 'catalog' ? styles.tabButtonActive : {}),
          }}
        >
          <Layers size={18} />
          <span>Catálogo General</span>
          <span style={activeTab === 'catalog' ? styles.tabBadgeActive : styles.tabBadge}>
            {exercises.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('custom')}
          style={{
            ...styles.tabButton,
            ...(activeTab === 'custom' ? styles.tabButtonActive : {}),
          }}
        >
          <Sparkles size={18} />
          <span>Mis Ejercicios Creados</span>
          <span style={activeTab === 'custom' ? styles.tabBadgeActive : styles.tabBadge}>
            {customExercises.length}
          </span>
        </button>
      </div>

      {/* Filter / Search Controls */}
      <div style={styles.controlsCard}>
        <div style={styles.searchWrapper}>
          <Search size={18} color="#94a3b8" style={styles.searchIcon} />
          <input
            type="text"
            placeholder={activeTab === 'custom' ? "Buscar en mis ejercicios..." : "Buscar ejercicio por nombre..."}
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
        <div style={styles.filtersRow}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Músculo:</label>
            <select value={selectedMuscle} onChange={(e) => setSelectedMuscle(e.target.value)} style={styles.select}>
              {MUSCLE_GROUPS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Equipo:</label>
            <select value={selectedEquipment} onChange={(e) => setSelectedEquipment(e.target.value)} style={styles.select}>
              {EQUIPMENT_OPTIONS.map(eq => <option key={eq} value={eq}>{eq}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Section Header */}
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>
          {activeTab === 'custom' ? 'Mis Ejercicios Personalizados' : 'Ejercicios Disponibles'}
        </h2>
        <span style={styles.countBadge}>{filteredExercises.length} resultado(s)</span>
      </div>

      {/* Grid of Exercises */}
      {loading ? (
        <div style={styles.loadingText}>Cargando ejercicios...</div>
      ) : filteredExercises.length === 0 ? (
        activeTab === 'custom' ? (
          <div style={styles.emptyCard}>
            <Sparkles size={40} color="#eab308" style={{ marginBottom: '1rem' }} />
            <h3 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              No tienes ejercicios personalizados aún
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
              Crea tus propios ejercicios para agregarlos a tus rutinas y llevar el seguimiento de su progresión.
            </p>
            <button style={styles.createBtn} onClick={openCreateModal}>
              <Plus size={18} /><span>Crear mi primer ejercicio</span>
            </button>
          </div>
        ) : (
          <div style={styles.emptyCard}>No se encontraron ejercicios con los filtros seleccionados.</div>
        )
      ) : (
        <div style={styles.grid}>
          {filteredExercises.map((ex) => (
            <div
              key={ex.id}
              style={styles.exerciseCard}
              onClick={() => setSelectedExercise(ex)}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(34,240,197,0.35)';
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-color)';
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
              }}
            >
              {/* Exercise Image Thumbnail */}
              <ExerciseAvatar url={ex.mediaUrl} name={ex.name} size={54} />

              <div style={styles.cardInfo}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <h3 style={styles.cardTitle}>{ex.name}</h3>
                  {ex.isCustom && <span style={styles.customBadgeSmall}>Mío</span>}
                </div>
                {ex.description && (
                  <span style={styles.cardSubtitle}>{ex.description}</span>
                )}
                <div style={styles.tagsRow}>
                  {ex.targetMuscleGroups.map(group => <span key={group} style={styles.tagMuscle}>{group}</span>)}
                  {ex.equipment && <span style={styles.tagEquipment}>{ex.equipment}</span>}
                </div>
              </div>

              {/* Action buttons for custom exercises */}
              {ex.isCustom ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }} onClick={e => e.stopPropagation()}>
                  <button
                    title="Editar ejercicio"
                    onClick={(e) => { e.stopPropagation(); openEditModal(ex); }}
                    style={styles.cardActionBtn}
                  >
                    <Edit2 size={16} color="var(--text-muted)" />
                  </button>
                  <button
                    title="Eliminar ejercicio"
                    onClick={(e) => { e.stopPropagation(); setDeletingExercise(ex); }}
                    style={styles.cardActionBtnDelete}
                  >
                    <Trash2 size={16} color="#ef4444" />
                  </button>
                </div>
              ) : (
                <ChevronRight size={20} color="#94a3b8" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px' }}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                {editingExercise ? <Edit2 size={22} color="var(--accent-teal)" /> : <Plus size={22} color="var(--accent-teal)" />}
                <h2 style={styles.modalTitle}>
                  {editingExercise ? 'Modificar ejercicio personalizado' : 'Nuevo ejercicio personalizado'}
                </h2>
              </div>
              <button style={styles.closeBtn} onClick={() => setIsModalOpen(false)}>
                <X size={20} color="#94a3b8" />
              </button>
            </div>
            <form onSubmit={handleFormSubmit} style={styles.modalForm}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Nombre del ejercicio *</label>
                <input
                  type="text"
                  placeholder="Ej. Press de Banca con Mancuernas en Suelo"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  required
                />
              </div>

              <div style={styles.formRow}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Grupo muscular principal</label>
                  <select value={formMuscle} onChange={e => setFormMuscle(e.target.value)}>
                    {MUSCLE_GROUPS.filter(m => m !== 'Todos').map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Equipo utilizado</label>
                  <select value={formEquipment} onChange={e => setFormEquipment(e.target.value)}>
                    {EQUIPMENT_OPTIONS.filter(eq => eq !== 'Todos').map(eq => <option key={eq} value={eq}>{eq}</option>)}
                  </select>
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Nombre secundario / Descripción corta (opcional)</label>
                <input
                  type="text"
                  placeholder="Ej. Floor Dumbbell Press (variación para hombro sano)"
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>URL de Imagen ilustrativa (opcional)</label>
                <input
                  type="url"
                  placeholder="https://ejemplo.com/imagen.jpg"
                  value={formMediaUrl}
                  onChange={e => setFormMediaUrl(e.target.value)}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Instrucciones de ejecución (opcional)</label>
                <textarea
                  rows={3}
                  placeholder="1. Acuéstate sobre el suelo con las rodillas flexionadas...&#10;2. Empuja las mancuernas hacia el techo..."
                  value={formInstructions}
                  onChange={e => setFormInstructions(e.target.value)}
                />
              </div>

              {formError && <div style={styles.errorAlert}>{formError}</div>}

              <div style={styles.modalActions}>
                <button type="button" style={styles.cancelBtn} onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" disabled={formSubmitting} style={styles.saveBtn}>
                  {formSubmitting ? 'Guardando...' : editingExercise ? 'Guardar cambios' : 'Crear ejercicio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingExercise && (
        <div className="modal-overlay" onClick={() => setDeletingExercise(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', textAlign: 'center' }}>
            <div style={{ width: 50, height: 50, borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <Trash2 size={24} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              ¿Eliminar ejercicio?
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              ¿Estás seguro de que deseas eliminar <strong>"{deletingExercise.name}"</strong>? Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                style={styles.cancelBtn}
                onClick={() => setDeletingExercise(null)}
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                type="button"
                style={{ ...styles.saveBtn, backgroundColor: '#dc2626' }}
                onClick={handleDeleteExercise}
                disabled={deleting}
              >
                {deleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: { width: '100%', padding: '2.5rem 3rem', display: 'flex', flexDirection: 'column', gap: '2rem', boxSizing: 'border-box' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' },
  title: { fontSize: '2.4rem', fontWeight: 800, color: 'var(--text-primary)' },
  subtitle: { color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' },
  createBtn: { backgroundColor: '#2563eb', color: '#ffffff', padding: '0.75rem 1.25rem', borderRadius: '12px', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', border: 'none' },
  tabsContainer: { display: 'flex', gap: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' },
  tabButton: { display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.7rem 1.25rem', borderRadius: '12px', backgroundColor: 'transparent', color: 'var(--text-muted)', border: '1px solid transparent', fontSize: '0.92rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s ease' },
  tabButtonActive: { backgroundColor: 'var(--surface-color)', color: 'var(--accent-teal)', borderColor: 'rgba(34, 240, 197, 0.3)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
  tabBadge: { backgroundColor: 'var(--input-bg)', color: 'var(--text-muted)', padding: '0.15rem 0.55rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700 },
  tabBadgeActive: { backgroundColor: 'rgba(34, 240, 197, 0.15)', color: 'var(--accent-teal)', padding: '0.15rem 0.55rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700 },
  controlsCard: { backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' },
  searchWrapper: { position: 'relative', display: 'flex', alignItems: 'center', flex: 1, minWidth: '280px' },
  searchIcon: { position: 'absolute', left: '14px' },
  searchInput: { width: '100%', paddingLeft: '2.75rem', paddingRight: '2.5rem' },
  clearSearch: { position: 'absolute', right: '12px', padding: '4px', background: 'none', border: 'none', cursor: 'pointer' },
  filtersRow: { display: 'flex', gap: '1rem', alignItems: 'center' },
  filterGroup: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  filterLabel: { fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 },
  select: { backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', minWidth: '150px' },
  sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' },
  sectionTitle: { fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' },
  countBadge: { backgroundColor: 'var(--border-color)', color: 'var(--text-muted)', padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' },
  exerciseCard: { backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', transition: 'transform 0.15s ease, border-color 0.15s ease' },
  cardInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: '0.3rem', minWidth: 0 },
  cardTitle: { fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  cardSubtitle: { fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  customBadgeSmall: { backgroundColor: 'rgba(234, 179, 8, 0.15)', color: '#eab308', border: '1px solid rgba(234, 179, 8, 0.3)', padding: '0.1rem 0.4rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 },
  tagsRow: { display: 'flex', gap: '0.4rem', flexWrap: 'wrap' },
  tagMuscle: { backgroundColor: 'rgba(52, 211, 153, 0.15)', color: '#10b981', padding: '0.15rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 },
  tagEquipment: { backgroundColor: 'rgba(96, 165, 250, 0.15)', color: '#3b82f6', padding: '0.15rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 },
  cardActionBtn: { padding: '0.45rem', borderRadius: '8px', backgroundColor: 'var(--input-bg)', border: '1px solid var(--border-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cardActionBtnDelete: { padding: '0.45rem', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  loadingText: { textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' },
  emptyCard: { backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '3.5rem 2rem', textAlign: 'center', color: 'var(--text-muted)' },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' },
  modalTitle: { fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' },
  closeBtn: { padding: '0.25rem', background: 'none', border: 'none', cursor: 'pointer' },
  modalForm: { display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 },
  label: { fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' },
  formRow: { display: 'flex', gap: '1rem' },
  errorAlert: { backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '0.75rem', borderRadius: '10px', fontSize: '0.85rem' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' },
  cancelBtn: { padding: '0.75rem 1.25rem', borderRadius: '10px', color: 'var(--text-muted)', fontWeight: 600, background: 'none', border: '1px solid var(--border-color)', cursor: 'pointer' },
  saveBtn: { backgroundColor: '#2563eb', color: '#ffffff', padding: '0.75rem 1.25rem', borderRadius: '10px', fontWeight: 700, border: 'none', cursor: 'pointer' },
};
