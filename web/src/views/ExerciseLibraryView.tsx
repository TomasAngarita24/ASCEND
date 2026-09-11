import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Plus,
  Dumbbell,
  X,
  Heart,
  Play,
  SlidersHorizontal,
  ChevronDown,
  ArrowUpDown,
  Check,
  TrendingUp,
  Trophy,
  Zap,
  ArrowLeft,
  Edit2,
  Trash2,
  Sparkles,
  Layers,
  Maximize2,
  BookOpen,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { matchesSearch } from '../utils/text';
import { roundOneRepMax } from '../utils/oneRepMax';
import {
  api,
  type ExerciseSummary,
  type Tokens,
  type WorkoutHistoryEntry,
  type WorkoutDetailEntry,
  type ExerciseProgressionPoint,
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

const CHIP_DEFS: { label: string; muscles: string[] }[] = [
  { label: 'Todos', muscles: [] },
  { label: 'Pecho', muscles: ['Pecho'] },
  { label: 'Espalda', muscles: ['Dorsal', 'Espalda baja', 'Trapecio'] },
  { label: 'Piernas', muscles: ['Cuadriceps', 'Femoral', 'Pantorrillas', 'Adductor'] },
  { label: 'Glúteos', muscles: ['Gluteos'] },
  { label: 'Hombros', muscles: ['Hombros'] },
  { label: 'Bíceps', muscles: ['Biceps'] },
  { label: 'Tríceps', muscles: ['Triceps'] },
  { label: 'Abdomen', muscles: ['Abdominales'] },
  { label: 'Cardio', muscles: ['Cardio'] },
];

const SORT_OPTIONS = [
  { key: 'default', label: 'Relevancia' },
  { key: 'az', label: 'Nombre A → Z' },
  { key: 'za', label: 'Nombre Z → A' },
] as const;

type SortKey = typeof SORT_OPTIONS[number]['key'];

const FAVORITES_KEY = 'ascend_exercise_favorites';

// ─── 1RM estimate (Epley, same as backend) ─────────────────────────────────
function calc1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return weight;
  return roundOneRepMax(weight, reps);
}

// ─── Interactive SVG line chart ──────────────────────────────────────────────
interface ChartPoint { date: string; value: number }

const LineChart: React.FC<{ data: ChartPoint[]; color: string; label: string }> = ({ data, color, label }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const W = 560;
  const H = 190;
  const PAD = { top: 25, right: 25, bottom: 36, left: 55 };

  if (data.length === 0) return (
    <div style={{ height: H, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
      Sin datos de historial para este ejercicio
    </div>
  );

  const vals = data.map(d => d.value);
  const rawMin = Math.min(...vals);
  const rawMax = Math.max(...vals);
  const spread = rawMax - rawMin;
  const padY = spread > 0 ? spread * 0.18 : Math.max(Math.abs(rawMax) * 0.12, 1);
  const minV = rawMin - padY;
  const maxV = rawMax + padY;
  const range = maxV - minV;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const px = (i: number) => PAD.left + (i / (data.length - 1 || 1)) * innerW;
  const py = (v: number) => PAD.top + innerH - ((v - minV) / range) * innerH;

  const pathD = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${px(i).toFixed(1)},${py(d.value).toFixed(1)}`).join(' ');
  const areaD = `${pathD} L${px(data.length - 1).toFixed(1)},${(PAD.top + innerH).toFixed(1)} L${PAD.left},${(PAD.top + innerH).toFixed(1)} Z`;

  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => Math.round(minV + (range / ticks) * i));
  const xStep = Math.max(1, Math.ceil(data.length / 5));

  const hoveredPoint = hoveredIdx !== null && data[hoveredIdx] ? data[hoveredIdx] : null;

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      {hoveredPoint && (
        <div style={{
          position: 'absolute',
          top: 0,
          right: '1rem',
          backgroundColor: 'var(--surface-color)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-element)',
          padding: '0.35rem 0.65rem',
          fontSize: '0.78rem',
          color: 'var(--text-primary)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          pointerEvents: 'none',
          zIndex: 5,
        }}>
          <span style={{ color: 'var(--text-muted)' }}>
            {new Date(hoveredPoint.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}:
          </span>
          <span style={{ fontWeight: 800, color }}>
            {hoveredPoint.value.toLocaleString()} {label}
          </span>
        </div>
      )}

      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', overflow: 'visible' }}
        onMouseLeave={() => setHoveredIdx(null)}
      >
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={PAD.left} y1={py(t)} x2={W - PAD.right} y2={py(t)} stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="3 6" />
            <text x={PAD.left - 8} y={py(t) + 4} textAnchor="end" fill="var(--text-dim)" fontSize="11">{t.toLocaleString()}</text>
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
        {data.map((d, i) => {
          const isHovered = hoveredIdx === i;
          return (
            <g key={i} onMouseEnter={() => setHoveredIdx(i)} style={{ cursor: 'pointer' }}>
              <circle
                cx={px(i)}
                cy={py(d.value)}
                r={isHovered ? 7 : 4}
                fill={color}
                stroke="var(--bg-color)"
                strokeWidth={isHovered ? 3 : 2}
                style={{ transition: 'r 0.15s ease' }}
              />
              <circle cx={px(i)} cy={py(d.value)} r={14} fill="transparent" />
            </g>
          );
        })}
        {data.filter((_, i) => i % xStep === 0 || i === data.length - 1).map((d) => {
          const idx = data.indexOf(d);
          return (
            <g key={idx}>
              <line x1={px(idx)} y1={PAD.top} x2={px(idx)} y2={PAD.top + innerH} stroke="rgba(255,255,255,0.035)" strokeWidth="1" strokeDasharray="2 5" />
              <text x={px(idx)} y={H - 8} textAnchor="middle" fill="var(--text-dim)" fontSize="10">
                {new Date(d.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
              </text>
            </g>
          );
        })}
        <text x={14} y={H / 2} fill="var(--text-dim)" fontSize="10" transform={`rotate(-90, 14, ${H / 2})`} textAnchor="middle">{label}</text>
      </svg>
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
  const [progressionData, setProgressionData] = useState<ExerciseProgressionPoint[]>([]);
  const [loadedWorkouts, setLoadedWorkouts] = useState<WorkoutDetailEntry[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [activeChart, setActiveChart] = useState<'1rm' | 'weight' | 'volume' | 'reps'>('1rm');
  const [zoomOpen, setZoomOpen] = useState(false);

  useEffect(() => {
    if (!zoomOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setZoomOpen(false); };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [zoomOpen]);

  useEffect(() => {
    setLoadingDetails(true);
    const recent = history.slice(0, 8);
    Promise.all([
      api.getExerciseProgression(tokens.accessToken, exercise.id).catch(() => null),
      Promise.all(recent.map(w => api.getWorkout(tokens.accessToken, w.id).catch(() => null))),
    ])
      .then(([progRes, workoutsRes]) => {
        if (progRes?.data) {
          setProgressionData(progRes.data);
        }
        setLoadedWorkouts((workoutsRes || []).filter(Boolean) as WorkoutDetailEntry[]);
      })
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

  const chartData = useMemo(() => {
    if (activeChart === '1rm') {
      return progressionData
        .filter((p) => p.estimatedOneRepMax !== null && p.estimatedOneRepMax > 0)
        .map((p) => ({ date: p.date, value: p.estimatedOneRepMax! }));
    }
    if (activeChart === 'weight') {
      return progressionData
        .filter((p) => p.weight !== null && p.weight > 0)
        .map((p) => ({ date: p.date, value: p.weight! }));
    }
    if (activeChart === 'volume') {
      return progressionData
        .filter((p) => p.volume > 0)
        .map((p) => ({ date: p.date, value: p.volume }));
    }
    return progressionData
      .filter((p) => p.repetitions > 0)
      .map((p) => ({ date: p.date, value: p.repetitions }));
  }, [progressionData, activeChart]);

  const maxWeight = useMemo(() => {
    const weights = progressionData.map((p) => p.weight).filter((w): w is number => w !== null && w > 0);
    return weights.length > 0 ? Math.max(...weights) : null;
  }, [progressionData]);

  const max1RM = useMemo(() => {
    const ones = progressionData.map((p) => p.estimatedOneRepMax).filter((w): w is number => w !== null && w > 0);
    return ones.length > 0 ? Math.max(...ones) : null;
  }, [progressionData]);

  const totalVolumeLifetime = useMemo(() => {
    return progressionData.reduce((sum, p) => sum + (p.volume || 0), 0);
  }, [progressionData]);

  const chartConfig = {
    '1rm': { label: '1RM (kg)', color: '#C8A45D' },
    'weight': { label: 'Peso máx. (kg)', color: '#E1C27A' },
    'volume': { label: 'Volumen (kg)', color: '#B6914F' },
    'reps': { label: 'Reps totales', color: '#92959A' },
  }[activeChart];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600, width: 'fit-content', background: 'none', border: 'none', cursor: 'pointer' }}>
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

      {/* Two-column layout: illustration left, info right */}
      <div style={dS.detailGrid}>
        {/* Left column — full illustration (object-fit contain, no crop) */}
        <div
          onClick={() => exercise.mediaUrl && setZoomOpen(true)}
          style={{ ...dS.heroMedia, ...(exercise.mediaUrl ? {} : { cursor: 'default' }) }}
          role={exercise.mediaUrl ? 'button' : undefined}
          aria-label={exercise.mediaUrl ? 'Ampliar imagen' : undefined}
        >
          {exercise.mediaUrl ? (
            <img src={exercise.mediaUrl} alt={exercise.name} style={dS.heroImg} />
          ) : (
            <div style={dS.heroFallback}><Dumbbell size={76} strokeWidth={1.2} /></div>
          )}
          {exercise.mediaUrl && (
            <div style={dS.heroHint}><Maximize2 size={15} /><span>Click para ampliar</span></div>
          )}
        </div>

        {/* Right column — exercise info */}
        <div style={dS.detailLeft}>
          {/* Header with Exercise Info */}
          <div style={dS.header}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
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

          {/* Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1rem' }}>
            <div style={dS.stat}>
              <Trophy size={20} color="var(--accent-gold)" />
              <div style={dS.statV}>{maxWeight !== null ? `${maxWeight} kg` : '—'}</div>
              <div style={dS.statL}>Peso máximo histórico</div>
            </div>
            <div style={dS.stat}>
              <Zap size={20} color="var(--accent-teal)" />
              <div style={dS.statV}>{max1RM !== null ? `${max1RM} kg` : '—'}</div>
              <div style={dS.statL}>1RM estimado máx.</div>
            </div>
            <div style={dS.stat}>
              <TrendingUp size={20} color="var(--accent-gold)" />
              <div style={dS.statV}>{totalVolumeLifetime > 0 ? `${totalVolumeLifetime.toLocaleString()} kg` : '—'}</div>
              <div style={dS.statL}>Volumen total acumulado</div>
            </div>
            <div style={dS.stat}>
              <Layers size={20} color="var(--accent-gold)" />
              <div style={dS.statV}>{progressionData.length}</div>
              <div style={dS.statL}>Sesiones registradas</div>
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
        </div>
      </div>

      {/* Interactive Chart */}
      <div style={dS.chartCard}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Evolución y Progresión</h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Pasa el cursor sobre los puntos para ver el detalle de cada sesión</p>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {([
              { key: '1rm', label: '1RM est.' },
              { key: 'weight', label: 'Peso máx.' },
              { key: 'volume', label: 'Volumen' },
              { key: 'reps', label: 'Reps' },
            ] as const).map(t => (
              <button
                key={t.key}
                onClick={() => setActiveChart(t.key)}
                style={{
                  padding: '0.35rem 0.85rem',
                  borderRadius: 'var(--radius-element)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease, transform 0.15s ease',
                  ...(activeChart === t.key
                    ? { backgroundColor: 'rgba(192,138,90,0.15)', color: 'var(--accent-teal)', borderColor: 'rgba(192,138,90,0.35)' }
                    : { backgroundColor: 'transparent', color: 'var(--text-muted)' }),
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {loadingDetails ? (
          <div style={{ color: 'var(--text-muted)', padding: '3rem 0', textAlign: 'center' }}>Cargando analítica del ejercicio...</div>
        ) : (
          <LineChart data={chartData} color={chartConfig.color} label={chartConfig.label} />
        )}
      </div>

      {/* Recent sets */}
      {exerciseSets.length > 0 && (
        <div style={dS.chartCard}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Últimas series</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '0.5rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <span>Fecha</span><span>Peso</span><span>Reps</span><span>1RM est.</span>
            </div>
            {[...exerciseSets].reverse().slice(0, 12).map((s, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-element)', fontSize: '0.85rem', ...(i % 2 === 0 ? { backgroundColor: 'rgba(255,255,255,0.03)' } : {}) }}>
                <span style={{ color: 'var(--text-muted)' }}>{new Date(s.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' })}</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{s.weight} kg</span>
                <span style={{ color: 'var(--text-primary)' }}>{s.reps}</span>
                <span style={{ color: 'var(--accent-teal)', fontWeight: 700 }}>{calc1RM(s.weight, s.reps)} kg</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox Zoom */}
      {zoomOpen && exercise.mediaUrl && (
        <div className="modal-overlay" onClick={() => setZoomOpen(false)}>
          <div style={dS.lightbox} onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setZoomOpen(false)}
              style={dS.lightboxClose}
              aria-label="Cerrar imagen"
            >
              <X size={22} color="var(--text-primary)" />
            </button>
            <img src={exercise.mediaUrl} alt={exercise.name} style={dS.lightboxImg} />
            <div style={dS.lightboxCaption}>{exercise.name}</div>
          </div>
        </div>
      )}
    </div>
  );
};

const dS: Record<string, React.CSSProperties> = {
  header: { display: 'flex', alignItems: 'center', gap: '1.5rem', backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-container)', padding: '1.5rem 2rem' },
  title: { fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0' },
  customBadge: { backgroundColor: 'rgba(192, 138, 90, 0.15)', color: 'var(--accent-gold)', border: '1px solid rgba(192, 138, 90, 0.3)', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 700 },
  tagM: { backgroundColor: 'rgba(192, 138, 90, 0.15)', color: 'var(--accent-gold)', border: '1px solid rgba(192, 138, 90, 0.28)', padding: '0.15rem 0.5rem', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600 },
  tagE: { backgroundColor: 'rgba(255, 255, 255, 0.06)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', padding: '0.15rem 0.5rem', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600 },
  instructionsCard: { backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-container)', padding: '1.25rem 1.5rem' },
  stat: { backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-container)', padding: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' },
  statV: { fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 },
  statL: { fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
    gap: '1.5rem',
    alignItems: 'stretch',
  },
  detailLeft: { display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 },
  heroMedia: {
    position: 'relative',
    width: '100%',
    minHeight: '440px',
    borderRadius: 'var(--radius-container)',
    border: '1px solid var(--border-color)',
    overflow: 'hidden',
    cursor: 'zoom-in',
    backgroundColor: 'var(--surface-color)',
    background: 'radial-gradient(120% 90% at 20% 0%, rgba(192, 138, 90, 0.1), transparent 60%), linear-gradient(160deg, var(--surface-elevated), var(--surface-color))',
  },
  heroImg: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', display: 'block', padding: '1.5rem' },
  heroFallback: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'rgba(192, 138, 90, 0.28)',
  },
  heroHint: {
    position: 'absolute',
    left: '1rem',
    bottom: '1rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.45rem',
    padding: '0.5rem 0.95rem',
    borderRadius: 'var(--radius-pill)',
    backgroundColor: 'rgba(9, 10, 11, 0.6)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.16)',
    color: '#f4f4f2',
    fontSize: '0.78rem',
    fontWeight: 700,
    pointerEvents: 'none',
  },
  lightbox: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.75rem',
    width: 'fit-content',
    maxWidth: '100%',
    maxHeight: '88vh',
  },
  lightboxImg: {
    display: 'block',
    width: 'auto',
    height: 'auto',
    maxWidth: 'calc(100vw - 3.5rem)',
    maxHeight: '78vh',
    objectFit: 'contain',
    borderRadius: 'var(--radius-container)',
    border: '1px solid var(--border-color)',
    boxShadow: '0 30px 80px -20px rgba(0, 0, 0, 0.7)',
  },
  lightboxClose: {
    position: 'absolute',
    top: '0.75rem',
    right: '0.75rem',
    width: '44px',
    height: '44px',
    borderRadius: 'var(--radius-full)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(18, 20, 22, 0.9)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: '1px solid var(--border-color)',
    cursor: 'pointer',
    zIndex: 10,
  },
  lightboxCaption: { fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)' },
  chartCard: { backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-container)', padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1rem' },
  actionEditBtn: { display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '0.5rem 0.9rem', borderRadius: 'var(--radius-element)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' },
  actionDeleteBtn: { display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: 'rgba(192, 105, 105, 0.12)', color: 'var(--danger-color)', border: '1px solid rgba(192, 105, 105, 0.25)', padding: '0.5rem 0.9rem', borderRadius: 'var(--radius-element)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' },
};

// ─── Card Image (media with fallback) ────────────────────────────────────────
const CardImage: React.FC<{ url?: string | null; name: string }> = ({ url, name }) => {
  const [hasError, setHasError] = useState(false);

  if (!url || hasError) {
    return <div className="exercise-fallback-icon"><Dumbbell size={44} strokeWidth={1.5} /></div>;
  }

  return (
    <img
      src={url}
      alt={name}
      onError={() => setHasError(true)}
      loading="lazy"
    />
  );
};

// ─── Main View ───────────────────────────────────────────────────────────────
export const ExerciseLibraryView: React.FC<ExerciseLibraryViewProps> = ({ tokens }) => {
  const [exercises, setExercises] = useState<ExerciseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'custom' | 'favorites'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState('Todos');
  const [selectedEquipment, setSelectedEquipment] = useState('Todos');
  const [activeChip, setActiveChip] = useState('Todos');
  const [sortBy, setSortBy] = useState<SortKey>('default');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseSummary | null>(null);
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutHistoryEntry[]>([]);

  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
      return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : [];
    } catch {
      return [];
    }
  });

  const filtersRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favoriteIds));
    } catch {
      // storage unavailable — favorites remain session-only
    }
  }, [favoriteIds]);

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) setFiltersOpen(false);
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

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

  const navigate = useNavigate();
  const { exerciseId } = useParams<{ exerciseId?: string }>();

  useEffect(() => {
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

    fetchExercises();
  }, [tokens]);

  // The URL is the source of truth: /exercises shows the grid, /exercises/:id shows that exercise's detail
  useEffect(() => {
    if (!exerciseId) {
      setSelectedExercise(null);
      return;
    }
    const target = exercises.find((ex) => ex.id === exerciseId);
    if (target) setSelectedExercise(target);
  }, [exerciseId, exercises]);

  const customExercises = useMemo(() => {
    return exercises.filter(ex => ex.isCustom === true);
  }, [exercises]);

  const favoriteExercises = useMemo(() => {
    return exercises.filter(ex => favoriteIds.includes(ex.id));
  }, [exercises, favoriteIds]);

  const toggleFavorite = (id: string) => {
    setFavoriteIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const baseList = activeTab === 'custom'
    ? customExercises
    : activeTab === 'favorites'
      ? favoriteExercises
      : exercises;

  const filteredExercises = useMemo(() => {
    return baseList.filter((ex) => {
      if (searchQuery.trim() && !matchesSearch(ex.name, searchQuery)) return false;

      if (activeChip !== 'Todos') {
        const def = CHIP_DEFS.find(d => d.label === activeChip);
        const syns = def ? def.muscles : [];
        if (syns.length > 0 && !ex.targetMuscleGroups.some(g => syns.some(s => matchesSearch(g, s)))) return false;
      } else if (selectedMuscle !== 'Todos' && !ex.targetMuscleGroups.some(m => matchesSearch(m, selectedMuscle))) {
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

  const activeFilterCount = (activeChip !== 'Todos' ? 1 : 0) + (selectedEquipment !== 'Todos' ? 1 : 0);

  const selectChip = (label: string) => {
    setActiveChip(label);
    const def = CHIP_DEFS.find(d => d.label === label);
    setSelectedMuscle(def && def.muscles.length > 0 ? def.muscles[0] : 'Todos');
  };

  const chipForMuscle = (m: string) => {
    if (m === 'Todos') return 'Todos';
    const def = CHIP_DEFS.find(d => d.label !== 'Todos' && d.muscles.some(s => matchesSearch(m, s)));
    return def ? def.label : 'Todos';
  };

  const onMuscleFilterChange = (m: string) => {
    setSelectedMuscle(m);
    setActiveChip(chipForMuscle(m));
  };

  const clearFilters = () => {
    setActiveChip('Todos');
    setSelectedMuscle('Todos');
    setSelectedEquipment('Todos');
  };

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
        const updated = await api.updateExercise(tokens.accessToken, editingExercise.id, {
          name: formName.trim(),
          targetMuscleGroups: [formMuscle],
          equipment: formEquipment,
          description: formDesc.trim() || undefined,
          instructions: formInstructions.trim() || undefined,
          mediaUrl: formMediaUrl.trim() || undefined,
        });
        setExercises(prev => prev.map(ex => ex.id === editingExercise.id ? { ...ex, ...updated } : ex));
        if (selectedExercise && selectedExercise.id === editingExercise.id) {
          setSelectedExercise(prev => prev ? { ...prev, ...updated } : null);
        }
      } else {
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
      setFavoriteIds(prev => prev.filter(id => id !== deletingExercise.id));
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
  };

  if (selectedExercise) {
    return (
      <div style={styles.container}>
        <ExerciseDetailPanel
          exercise={selectedExercise}
          tokens={tokens}
          history={workoutHistory}
          onBack={() => navigate('/exercises')}
          onEdit={openEditModal}
          onDelete={setDeletingExercise}
        />
      </div>
    );
  }

  const tabs = [
    { key: 'all' as const, label: 'Todos', count: exercises.length },
    { key: 'custom' as const, label: 'Mis ejercicios', count: customExercises.length },
    { key: 'favorites' as const, label: 'Favoritos', count: favoriteExercises.length },
  ];

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Ejercicios</h1>
          <p style={styles.subtitle}>
            {exercises.length} ejercicios · Explora, filtra y encuentra tu próximo movimiento
          </p>
        </div>
        <button style={styles.createBtn} onClick={openCreateModal}>
          <Plus size={18} /><span>Crear ejercicio</span>
        </button>
      </div>

      {/* Text tabs */}
      <div style={styles.tabsRow}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              ...styles.tabButton,
              ...(activeTab === t.key ? styles.tabButtonActive : {}),
            }}
          >
            <span>{t.label}</span>
            <span style={activeTab === t.key ? styles.tabCountActive : styles.tabCount}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* Quick category chips */}
      <div className="exercise-chip-row">
        {CHIP_DEFS.map(chip => (
          <button
            key={chip.label}
            onClick={() => selectChip(chip.label)}
            className={`exercise-chip${activeChip === chip.label ? ' is-active' : ''}`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Search + filters + sort */}
      <div style={styles.searchBar}>
        <div style={styles.searchInputWrap}>
          <Search size={17} color="var(--text-muted)" style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Buscar ejercicios..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
          {searchQuery && (
            <button style={styles.clearSearch} onClick={() => setSearchQuery('')}>
              <X size={15} color="var(--text-muted)" />
            </button>
          )}
        </div>

        <div ref={filtersRef} style={styles.dropdownWrap}>
          <button
            onClick={() => setFiltersOpen(o => !o)}
            style={{
              ...styles.dropdownBtn,
              ...(activeFilterCount > 0 ? styles.dropdownBtnActive : {}),
            }}
          >
            <SlidersHorizontal size={16} />
            <span>Filtros{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}</span>
            <ChevronDown size={15} style={{ transform: filtersOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
          </button>
          {filtersOpen && (
            <div style={styles.popover}>
              <div style={styles.popoverLabel}>Músculo</div>
              <select value={selectedMuscle} onChange={(e) => onMuscleFilterChange(e.target.value)} style={styles.popoverSelect}>
                {MUSCLE_GROUPS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <div style={styles.popoverLabel}>Equipamiento</div>
              <select value={selectedEquipment} onChange={(e) => setSelectedEquipment(e.target.value)} style={styles.popoverSelect}>
                {EQUIPMENT_OPTIONS.map(eq => <option key={eq} value={eq}>{eq}</option>)}
              </select>
              {activeFilterCount > 0 && (
                <button style={styles.popoverClear} onClick={clearFilters}>
                  Limpiar filtros
                </button>
              )}
            </div>
          )}
        </div>

        <div ref={sortRef} style={styles.dropdownWrap}>
          <button
            onClick={() => setSortOpen(o => !o)}
            style={{ ...styles.dropdownBtn, ...(sortBy !== 'default' ? styles.dropdownBtnActive : {}) }}
          >
            <ArrowUpDown size={16} />
            <span>Ordenar</span>
            <ChevronDown size={15} style={{ transform: sortOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
          </button>
          {sortOpen && (
            <div style={styles.sortMenu}>
              {SORT_OPTIONS.map(o => (
                <button
                  key={o.key}
                  onClick={() => { setSortBy(o.key); setSortOpen(false); }}
                  style={{ ...styles.sortItem, ...(sortBy === o.key ? styles.sortItemActive : {}) }}
                >
                  <span>{o.label}</span>
                  {sortBy === o.key && <Check size={15} />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Results meta */}
      {!loading && (
        <div style={styles.resultsLine}>
          <span>
            {sortedExercises.length} {sortedExercises.length === 1 ? 'ejercicio' : 'ejercicios'}
          </span>
          {searchQuery.trim() && <span style={styles.resultsMeta}>{` · búsqueda "${searchQuery.trim()}"`}</span>}
        </div>
      )}

      {/* Grid of Exercises */}
      {loading ? (
        <div style={styles.loadingText}>Cargando ejercicios...</div>
      ) : sortedExercises.length === 0 ? (
        activeTab === 'favorites' ? (
          <div style={styles.emptyCard}>
            <div style={styles.emptyIcon}>
              <Heart size={36} fill="var(--accent-gold)" color="var(--accent-gold)" />
            </div>
            <h3 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Sin favoritos todavía
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto' }}>
              Toca el corazón en cualquier ejercicio para guardarlo aquí y tenerlo siempre a mano.
            </p>
          </div>
        ) : activeTab === 'custom' ? (
          <div style={styles.emptyCard}>
            <Sparkles size={40} color="var(--accent-gold)" style={{ marginBottom: '1rem' }} />
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
          <div style={styles.emptyCard}>
            <Search size={36} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Sin resultados
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto' }}>
              No se encontraron ejercicios con los filtros seleccionados. Prueba con otros términos o limpia los filtros.
            </p>
          </div>
        )
      ) : (
        <div className="exercise-grid">
          {sortedExercises.map((ex) => (
            <div
              key={ex.id}
              className="exercise-card"
              onClick={() => {
                setSelectedExercise(ex);
                navigate(`/exercises/${ex.id}`);
              }}
            >
              {/* Media */}
              <div className="exercise-card-media">
                <CardImage url={ex.mediaUrl} name={ex.name} />
                <div className="exercise-overlay">
                  <span className="exercise-play">
                    <Play size={16} fill="currentColor" /> Ver ejercicio
                  </span>
                </div>
                <button
                  className={`exercise-fav${favoriteIds.includes(ex.id) ? ' is-active' : ''}`}
                  title={favoriteIds.includes(ex.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(ex.id); }}
                >
                  <Heart size={17} fill={favoriteIds.includes(ex.id) ? 'currentColor' : 'none'} />
                </button>
              </div>

              {/* Info */}
              <div className="exercise-card-body">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
                  <h3 style={styles.cardTitle}>{ex.name}</h3>
                  {ex.isCustom && <span style={styles.customBadgeSmall}>Mío</span>}
                </div>
                {ex.description && (
                  <span style={styles.cardSubtitle}>{ex.description}</span>
                )}
                <div className="exercise-tags">
                  {ex.targetMuscleGroups.slice(0, 2).map(group => <span key={group} style={styles.tagMuscle}>{group}</span>)}
                  {ex.equipment && <span style={styles.tagEquipment}>{ex.equipment}</span>}
                </div>
                {ex.isCustom && (
                  <div style={styles.cardTools} onClick={e => e.stopPropagation()}>
                    <button
                      title="Editar ejercicio"
                      onClick={(e) => { e.stopPropagation(); openEditModal(ex); }}
                      style={styles.cardToolBtn}
                    >
                      <Edit2 size={14} color="var(--text-muted)" />
                    </button>
                    <button
                      title="Eliminar ejercicio"
                      onClick={(e) => { e.stopPropagation(); setDeletingExercise(ex); }}
                      style={styles.cardToolBtnDelete}
                    >
                      <Trash2 size={14} color="var(--danger-color)" />
                    </button>
                  </div>
                )}
              </div>
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
                <X size={20} color="var(--text-muted)" />
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
            <div style={{ width: 50, height: 50, borderRadius: '50%', backgroundColor: 'rgba(192, 105, 105, 0.15)', color: 'var(--danger-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
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
                style={{ ...styles.saveBtn, backgroundColor: 'var(--danger-color)' }}
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
  container: { width: '100%', padding: 'clamp(1.5rem, 4vw, 2.5rem) clamp(1rem, 5vw, 3rem)', display: 'flex', flexDirection: 'column', gap: '1.75rem', boxSizing: 'border-box' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' },
  title: { fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0 },
  subtitle: { color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.35rem' },
  createBtn: { backgroundColor: 'var(--primary)', color: 'var(--bg-color)', padding: '0.7rem 1.2rem', borderRadius: 'var(--radius-element)', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', border: 'none' },
  tabsRow: { display: 'flex', gap: '1.5rem', borderBottom: '1px solid var(--border-color)' },
  tabButton: { background: 'none', border: 'none', padding: '0.4rem 0 0.65rem', fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '2px solid transparent', marginBottom: '-1px', transition: 'color 0.15s ease, border-color 0.15s ease' },
  tabButtonActive: { color: 'var(--primary)', borderBottomColor: 'var(--primary)', fontWeight: 700 },
  tabCount: { fontSize: '0.72rem', backgroundColor: 'var(--input-bg)', color: 'var(--text-muted)', padding: '0.1rem 0.5rem', borderRadius: 'var(--radius-full)', fontWeight: 600 },
  tabCountActive: { fontSize: '0.72rem', backgroundColor: 'rgba(192, 138, 90, 0.16)', color: 'var(--primary)', padding: '0.1rem 0.5rem', borderRadius: 'var(--radius-full)', fontWeight: 700 },
  searchBar: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.15rem', backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-control)', padding: '0.35rem 0.5rem', boxShadow: '0 2px 10px rgba(0,0,0,0.08)' },
  searchInputWrap: { position: 'relative', flex: 1, display: 'flex', alignItems: 'center', minWidth: '220px' },
  searchIcon: { position: 'absolute', left: '12px' },
  searchInput: { width: '100%', padding: '0.7rem 2.5rem 0.7rem 2.75rem', backgroundColor: 'transparent', border: 'none', outline: 'none', fontSize: '0.92rem', color: 'var(--text-primary)' },
  clearSearch: { position: 'absolute', right: '10px', padding: '4px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  dropdownWrap: { position: 'relative' },
  dropdownBtn: { display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.6rem 0.9rem', borderRadius: 'var(--radius-element)', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'color 0.15s ease, background-color 0.15s ease' },
  dropdownBtnActive: { color: 'var(--primary)', backgroundColor: 'rgba(192, 138, 90, 0.12)' },
  popover: { position: 'absolute', top: 'calc(100% + 8px)', right: 0, minWidth: '240px', backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-control)', padding: '1rem', boxShadow: '0 18px 45px -12px rgba(0,0,0,0.45)', zIndex: 30, display: 'flex', flexDirection: 'column', gap: '0.5rem', animation: 'fadeIn 0.18s ease' },
  popoverLabel: { fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginTop: '0.35rem' },
  popoverSelect: { width: '100%', backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-element)', padding: '0.55rem 0.75rem', fontSize: '0.88rem', outline: 'none' },
  popoverClear: { marginTop: '0.5rem', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-element)', background: 'rgba(192, 105, 105, 0.1)', color: 'var(--danger-color)', border: '1px solid rgba(192, 105, 105, 0.2)', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' },
  sortMenu: { position: 'absolute', top: 'calc(100% + 8px)', right: 0, minWidth: '200px', backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-control)', padding: '0.4rem', boxShadow: '0 18px 45px -12px rgba(0,0,0,0.45)', zIndex: 30, animation: 'fadeIn 0.18s ease', display: 'flex', flexDirection: 'column' },
  sortItem: { width: '100%', textAlign: 'left', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-element)', border: 'none', background: 'none', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'background-color 0.15s ease' },
  sortItemActive: { backgroundColor: 'rgba(192, 138, 90, 0.1)', color: 'var(--primary)' },
  resultsLine: { fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 },
  resultsMeta: { color: 'var(--text-dim)' },
  cardTitle: { fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 },
  cardSubtitle: { fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  customBadgeSmall: { backgroundColor: 'rgba(192, 138, 90, 0.15)', color: 'var(--accent-gold)', border: '1px solid rgba(192, 138, 90, 0.3)', padding: '0.1rem 0.4rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 },
  tagMuscle: { backgroundColor: 'rgba(192, 138, 90, 0.15)', color: 'var(--accent-gold)', border: '1px solid rgba(192, 138, 90, 0.28)', padding: '0.15rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 },
  tagEquipment: { backgroundColor: 'rgba(255, 255, 255, 0.06)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', padding: '0.15rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 },
  cardTools: { display: 'flex', gap: '0.4rem', marginTop: '0.15rem' },
  cardToolBtn: { padding: '0.4rem', borderRadius: 'var(--radius-element)', backgroundColor: 'var(--input-bg)', border: '1px solid var(--border-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cardToolBtnDelete: { padding: '0.4rem', borderRadius: 'var(--radius-element)', backgroundColor: 'rgba(192, 105, 105, 0.12)', border: '1px solid rgba(192, 105, 105, 0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  loadingText: { textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' },
  emptyCard: { backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-container)', padding: '3.5rem 2rem', textAlign: 'center', color: 'var(--text-muted)' },
  emptyIcon: { width: 64, height: 64, borderRadius: '50%', backgroundColor: 'rgba(192, 138, 90, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' },
  modalTitle: { fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' },
  closeBtn: { padding: '0.25rem', background: 'none', border: 'none', cursor: 'pointer' },
  modalForm: { display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 },
  label: { fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' },
  formRow: { display: 'flex', gap: '1rem' },
  errorAlert: { backgroundColor: 'rgba(192, 105, 105, 0.15)', color: 'var(--danger-color)', padding: '0.75rem', borderRadius: 'var(--radius-control)', fontSize: '0.85rem' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' },
  cancelBtn: { padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-element)', color: 'var(--text-muted)', fontWeight: 600, background: 'none', border: '1px solid var(--border-color)', cursor: 'pointer' },
  saveBtn: { backgroundColor: 'var(--primary)', color: 'var(--bg-color)', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-element)', fontWeight: 700, border: 'none', cursor: 'pointer' },
};