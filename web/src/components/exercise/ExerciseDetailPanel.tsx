import React, { useEffect, useId, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Dumbbell,
  Maximize2,
  Trophy,
  Zap,
  TrendingUp,
  Layers,
  BookOpen,
  X,
} from 'lucide-react';
import {
  api,
  type ExerciseSummary,
  type WorkoutHistoryEntry,
  type WorkoutDetailEntry,
  type ExerciseProgressionPoint,
} from '../../api/api';
import { roundOneRepMax } from '../../utils/oneRepMax';

function calc1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return weight;
  return roundOneRepMax(weight, reps);
}

interface ChartPoint {
  date: string;
  value: number;
}

const LineChart: React.FC<{ data: ChartPoint[]; color: string; label: string }> = ({
  data,
  color,
  label,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const gradId = useId();
  const W = 560;
  const H = 190;
  const PAD = { top: 25, right: 25, bottom: 36, left: 55 };

  if (data.length === 0)
    return (
      <div
        style={{
          height: H,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-dim)',
          fontSize: '0.9rem',
        }}
      >
        Sin datos de historial para este ejercicio
      </div>
    );

  const vals = data.map((d) => d.value);
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

  const pathD = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${px(i).toFixed(1)},${py(d.value).toFixed(1)}`)
    .join(' ');
  const areaD = `${pathD} L${px(data.length - 1).toFixed(1)},${(PAD.top + innerH).toFixed(
    1
  )} L${PAD.left},${(PAD.top + innerH).toFixed(1)} Z`;

  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) =>
    Math.round(minV + (range / ticks) * i)
  );
  const xStep = Math.max(1, Math.ceil(data.length / 5));

  const hoveredPoint = hoveredIdx !== null && data[hoveredIdx] ? data[hoveredIdx] : null;

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      {hoveredPoint && (
        <div
          style={{
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
          }}
        >
          <span style={{ color: 'var(--text-muted)' }}>
            {new Date(hoveredPoint.date).toLocaleDateString('es-ES', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
            :
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
            <line
              x1={PAD.left}
              y1={py(t)}
              x2={W - PAD.right}
              y2={py(t)}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="1"
              strokeDasharray="3 6"
            />
            <text
              x={PAD.left - 8}
              y={py(t) + 4}
              textAnchor="end"
              fill="var(--text-dim)"
              fontSize="11"
            >
              {t.toLocaleString()}
            </text>
          </g>
        ))}
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#${gradId})`} />
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
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
        {data
          .filter((_, i) => i % xStep === 0 || i === data.length - 1)
          .map((d) => {
            const idx = data.indexOf(d);
            return (
              <g key={idx}>
                <line
                  x1={px(idx)}
                  y1={PAD.top}
                  x2={px(idx)}
                  y2={PAD.top + innerH}
                  stroke="rgba(255,255,255,0.035)"
                  strokeWidth="1"
                  strokeDasharray="2 5"
                />
                <text
                  x={px(idx)}
                  y={H - 8}
                  textAnchor="middle"
                  fill="var(--text-dim)"
                  fontSize="10"
                >
                  {new Date(d.date).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </text>
              </g>
            );
          })}
        <text
          x={14}
          y={H / 2}
          fill="var(--text-dim)"
          fontSize="10"
          transform={`rotate(-90, 14, ${H / 2})`}
          textAnchor="middle"
        >
          {label}
        </text>
      </svg>
    </div>
  );
};

export interface ExerciseDetailPanelProps {
  exercise: ExerciseSummary;
  history: WorkoutHistoryEntry[];
  onBack: () => void;
  onEdit?: (exercise: ExerciseSummary) => void;
  onDelete?: (exercise: ExerciseSummary) => void;
}

export const ExerciseDetailPanel: React.FC<ExerciseDetailPanelProps> = ({
  exercise,
  history,
  onBack,
  onEdit,
  onDelete,
}) => {
  const [progressionData, setProgressionData] = useState<ExerciseProgressionPoint[]>([]);
  const [loadedWorkouts, setLoadedWorkouts] = useState<WorkoutDetailEntry[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [activeChart, setActiveChart] = useState<'1rm' | 'weight' | 'volume' | 'reps'>('1rm');
  const [zoomOpen, setZoomOpen] = useState(false);

  useEffect(() => {
    if (!zoomOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoomOpen(false);
    };
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
      api.getExerciseProgression(exercise.id).catch(() => null),
      Promise.all(recent.map((w) => api.getWorkout(w.id).catch(() => null))),
    ])
      .then(([progRes, workoutsRes]) => {
        if (progRes?.data) {
          setProgressionData(progRes.data);
        }
        setLoadedWorkouts((workoutsRes || []).filter(Boolean) as WorkoutDetailEntry[]);
      })
      .finally(() => setLoadingDetails(false));
  }, [exercise.id, history]);

  const exerciseSets = useMemo(() => {
    const points: { date: string; weight: number; reps: number }[] = [];
    for (const w of loadedWorkouts) {
      const ex = w.exercises.find((e) => e.exercise.id === exercise.id);
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
    const weights = progressionData
      .map((p) => p.weight)
      .filter((w): w is number => w !== null && w > 0);
    return weights.length > 0 ? Math.max(...weights) : null;
  }, [progressionData]);

  const max1RM = useMemo(() => {
    const ones = progressionData
      .map((p) => p.estimatedOneRepMax)
      .filter((w): w is number => w !== null && w > 0);
    return ones.length > 0 ? Math.max(...ones) : null;
  }, [progressionData]);

  const totalVolumeLifetime = useMemo(() => {
    return progressionData.reduce((sum, p) => sum + (p.volume || 0), 0);
  }, [progressionData]);

  const chartConfig = {
    '1rm': { label: '1RM (kg)', color: '#C8A45D' },
    weight: { label: 'Peso máx. (kg)', color: '#E1C27A' },
    volume: { label: 'Volumen (kg)', color: '#B6914F' },
    reps: { label: 'Reps totales', color: '#92959A' },
  }[activeChart];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--text-muted)',
            fontSize: '0.9rem',
            fontWeight: 600,
            width: 'fit-content',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={18} /> Volver a la biblioteca
        </button>
        {exercise.isCustom && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {onEdit && (
              <button onClick={() => onEdit(exercise)} style={dS.actionEditBtn}>
                <Edit2 size={16} />
                <span>Editar ejercicio</span>
              </button>
            )}
            {onDelete && (
              <button onClick={() => onDelete(exercise)} style={dS.actionDeleteBtn}>
                <Trash2 size={16} />
                <span>Eliminar</span>
              </button>
            )}
          </div>
        )}
      </div>

      <div style={dS.detailGrid}>
        <div
          onClick={() => exercise.mediaUrl && setZoomOpen(true)}
          style={{ ...dS.heroMedia, ...(exercise.mediaUrl ? {} : { cursor: 'default' }) }}
          role={exercise.mediaUrl ? 'button' : undefined}
          aria-label={exercise.mediaUrl ? 'Ampliar imagen' : undefined}
        >
          {exercise.mediaUrl ? (
            <img src={exercise.mediaUrl} alt={exercise.name} style={dS.heroImg} />
          ) : (
            <div style={dS.heroFallback}>
              <Dumbbell size={76} strokeWidth={1.2} />
            </div>
          )}
          {exercise.mediaUrl && (
            <div style={dS.heroHint}>
              <Maximize2 size={15} />
              <span>Click para ampliar</span>
            </div>
          )}
        </div>

        <div style={dS.detailLeft}>
          <div style={dS.header}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  marginBottom: '0.25rem',
                  flexWrap: 'wrap',
                }}
              >
                <h1 style={dS.title}>{exercise.name}</h1>
                {exercise.isCustom && <span style={dS.customBadge}>Personalizado</span>}
              </div>
              {exercise.description && (
                <p
                  style={{
                    color: 'var(--text-muted)',
                    fontSize: '0.9rem',
                    marginBottom: '0.6rem',
                    fontStyle: 'italic',
                  }}
                >
                  {exercise.description}
                </p>
              )}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {exercise.targetMuscleGroups.map((g) => (
                  <span key={g} style={dS.tagM}>
                    {g}
                  </span>
                ))}
                {exercise.equipment && <span style={dS.tagE}>{exercise.equipment}</span>}
              </div>
            </div>
          </div>

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
              <div style={dS.statV}>
                {totalVolumeLifetime > 0 ? `${totalVolumeLifetime.toLocaleString()} kg` : '—'}
              </div>
              <div style={dS.statL}>Volumen total acumulado</div>
            </div>
            <div style={dS.stat}>
              <Layers size={20} color="var(--accent-gold)" />
              <div style={dS.statV}>{progressionData.length}</div>
              <div style={dS.statL}>Sesiones registradas</div>
            </div>
          </div>

          {exercise.instructions && (
            <div style={dS.instructionsCard}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: 'var(--accent-teal)',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  marginBottom: '0.5rem',
                }}
              >
                <BookOpen size={18} />
                <span>Instrucciones de ejecución</span>
              </div>
              <div
                style={{
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-line',
                }}
              >
                {exercise.instructions}
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={dS.chartCard}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Evolución y Progresión
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
              Pasa el cursor sobre los puntos para ver el detalle de cada sesión
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {(
              [
                { key: '1rm', label: '1RM est.' },
                { key: 'weight', label: 'Peso máx.' },
                { key: 'volume', label: 'Volumen' },
                { key: 'reps', label: 'Reps' },
              ] as const
            ).map((t) => (
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
                    ? {
                        backgroundColor: 'rgba(192,138,90,0.15)',
                        color: 'var(--accent-teal)',
                        borderColor: 'rgba(192,138,90,0.35)',
                      }
                    : { backgroundColor: 'transparent', color: 'var(--text-muted)' }),
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {loadingDetails ? (
          <div style={{ color: 'var(--text-muted)', padding: '3rem 0', textAlign: 'center' }}>
            Cargando analítica del ejercicio...
          </div>
        ) : (
          <LineChart data={chartData} color={chartConfig.color} label={chartConfig.label} />
        )}
      </div>

      {exerciseSets.length > 0 && (
        <div style={dS.chartCard}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Últimas series
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 1fr',
                padding: '0.5rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              <span>Fecha</span>
              <span>Peso</span>
              <span>Reps</span>
              <span>1RM est.</span>
            </div>
            {[...exerciseSets]
              .reverse()
              .slice(0, 12)
              .map((s, i) => (
                <div
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 1fr',
                    padding: '0.55rem 0.75rem',
                    borderRadius: 'var(--radius-element)',
                    fontSize: '0.85rem',
                    ...(i % 2 === 0 ? { backgroundColor: 'rgba(255,255,255,0.03)' } : {}),
                  }}
                >
                  <span style={{ color: 'var(--text-muted)' }}>
                    {new Date(s.date).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'short',
                      year: '2-digit',
                    })}
                  </span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                    {s.weight} kg
                  </span>
                  <span style={{ color: 'var(--text-primary)' }}>{s.reps}</span>
                  <span style={{ color: 'var(--accent-teal)', fontWeight: 700 }}>
                    {calc1RM(s.weight, s.reps)} kg
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {zoomOpen && exercise.mediaUrl && (
        <div className="modal-overlay" onClick={() => setZoomOpen(false)}>
          <div style={dS.lightbox} onClick={(e) => e.stopPropagation()}>
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
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-container)',
    padding: '1.5rem 2rem',
  },
  title: { fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0' },
  customBadge: {
    backgroundColor: 'rgba(192, 138, 90, 0.15)',
    color: 'var(--accent-gold)',
    border: '1px solid rgba(192, 138, 90, 0.3)',
    padding: '0.2rem 0.6rem',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.75rem',
    fontWeight: 700,
  },
  tagM: {
    backgroundColor: 'rgba(192, 138, 90, 0.15)',
    color: 'var(--accent-gold)',
    border: '1px solid rgba(192, 138, 90, 0.28)',
    padding: '0.15rem 0.5rem',
    borderRadius: 6,
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  tagE: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-subtle)',
    padding: '0.15rem 0.5rem',
    borderRadius: 6,
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  instructionsCard: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-container)',
    padding: '1.25rem 1.5rem',
  },
  stat: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-container)',
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.4rem',
  },
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
    background:
      'radial-gradient(120% 90% at 20% 0%, rgba(192, 138, 90, 0.1), transparent 60%), linear-gradient(160deg, var(--surface-elevated), var(--surface-color))',
  },
  heroImg: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    display: 'block',
    padding: '1.5rem',
  },
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
  chartCard: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-container)',
    padding: '1.5rem 2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  actionEditBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    backgroundColor: 'var(--input-bg)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-color)',
    padding: '0.5rem 0.9rem',
    borderRadius: 'var(--radius-element)',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  actionDeleteBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    backgroundColor: 'rgba(192, 105, 105, 0.12)',
    color: 'var(--danger-color)',
    border: '1px solid rgba(192, 105, 105, 0.25)',
    padding: '0.5rem 0.9rem',
    borderRadius: 'var(--radius-element)',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
};
