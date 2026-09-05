import React, { useEffect, useState } from 'react';
import {
  Home, TrendingUp, Dumbbell, Activity, Calendar, Award, Zap, BarChart2,
  PieChart, Flame, ChevronRight, Play, ArrowUpRight, ShieldCheck, Target, RefreshCw
} from 'lucide-react';
import {
  api, type Tokens, type ProgressStatistics, type ProgressChartData,
  type MuscleGroupStat, type WorkoutHistoryEntry
} from '../api/api';

interface HomeViewProps {
  tokens: Tokens;
  onNavigate: (tab: 'routines' | 'exercises' | 'history' | 'profile' | 'plate-calculator' | 'measurements') => void;
  onStartWorkout: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ tokens, onNavigate, onStartWorkout }) => {
  const [stats, setStats] = useState<ProgressStatistics | null>(null);
  const [volumeChart, setVolumeChart] = useState<ProgressChartData | null>(null);
  const [frequencyChart, setFrequencyChart] = useState<ProgressChartData | null>(null);
  const [muscleStats, setMuscleStats] = useState<MuscleGroupStat[]>([]);
  const [recentWorkouts, setRecentWorkouts] = useState<WorkoutHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartMetric, setChartMetric] = useState<'volume' | 'frequency'>('volume');

  useEffect(() => {
    loadDashboardData();
  }, [tokens]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, volRes, freqRes, muscleRes, historyRes] = await Promise.allSettled([
        api.getStatistics(tokens.accessToken),
        api.getProgressChart(tokens.accessToken, 'volume'),
        api.getProgressChart(tokens.accessToken, 'workout_frequency'),
        api.getMuscleGroupStatistics(tokens.accessToken),
        api.listWorkoutHistory(tokens.accessToken),
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value);
      if (volRes.status === 'fulfilled') setVolumeChart(volRes.value);
      if (freqRes.status === 'fulfilled') setFrequencyChart(freqRes.value);
      if (muscleRes.status === 'fulfilled') setMuscleStats(muscleRes.value);
      if (historyRes.status === 'fulfilled') setRecentWorkouts(historyRes.value.slice(0, 3));
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '¡Buenos días! 🌅';
    if (hour < 19) return '¡Buenas tardes! ⚡';
    return '¡Buenas noches! 🌙';
  };

  const activeChart = chartMetric === 'volume' ? volumeChart : frequencyChart;
  const chartData = activeChart?.data || [];

  // Find max for scaling
  const maxChartVal = chartData.length > 0
    ? Math.max(...chartData.map((d) => d.value), 1)
    : 1;

  // Muscle Groups calculations (FR-MUSC-002)
  const totalMuscleVolume = muscleStats.reduce((sum, m) => sum + m.volume, 0);
  const sortedMuscles = [...muscleStats].sort((a, b) => b.volume - a.volume);

  const muscleColorMap: Record<string, string> = {
    Chest: '#38bdf8',
    Back: '#818cf8',
    Legs: '#34d399',
    Shoulders: '#f472b6',
    Arms: '#fbbf24',
    Core: '#a78bfa',
    Pecho: '#38bdf8',
    Espalda: '#818cf8',
    Piernas: '#34d399',
    Hombros: '#f472b6',
    Brazos: '#fbbf24',
    Abdominales: '#a78bfa',
  };

  const formatWeekDate = (isoDate: string) => {
    try {
      const d = new Date(isoDate);
      return d.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
    } catch {
      return isoDate;
    }
  };

  return (
    <div style={styles.container}>
      {/* Welcome Banner */}
      <div style={styles.welcomeBanner}>
        <div style={styles.welcomeLeft}>
          <div style={styles.badgeRow}>
            <span style={styles.greetingBadge}>{getGreeting()}</span>
          </div>
          <h1 style={styles.welcomeTitle}>Panel Principal</h1>
          <p style={styles.welcomeSubtitle}>
            Aquí tienes el resumen de tu evolución, balance muscular y métricas de rendimiento semanal.
          </p>
        </div>

        <div style={styles.bannerActions}>
          <button style={styles.startWorkoutBtn} onClick={onStartWorkout}>
            <Play size={18} fill="#000000" />
            <span>Iniciar entrenamiento</span>
          </button>
          <button style={styles.secondaryActionBtn} onClick={() => onNavigate('routines')}>
            <Dumbbell size={18} />
            <span>Ver rutinas</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div style={styles.loadingBox}>
          <RefreshCw size={28} className="spinner" style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-teal)' }} />
          <span style={{ color: 'var(--text-muted)' }}>Cargando estadísticas...</span>
        </div>
      ) : (
        <>
          {/* Top Metric Cards */}
          <div style={styles.metricsGrid}>
            <div style={styles.metricCard}>
              <div style={{ ...styles.metricIconWrap, backgroundColor: 'rgba(34, 240, 197, 0.12)' }}>
                <Zap size={22} color="var(--accent-teal)" />
              </div>
              <div style={styles.metricInfo}>
                <span style={styles.metricLabel}>Volumen Total</span>
                <span style={styles.metricValue}>
                  {stats ? `${(stats.totalVolume).toLocaleString()} kg` : '0 kg'}
                </span>
                <span style={styles.metricSub}>Acumulado de todas las sesiones</span>
              </div>
            </div>

            <div style={styles.metricCard}>
              <div style={{ ...styles.metricIconWrap, backgroundColor: 'rgba(56, 189, 248, 0.12)' }}>
                <Activity size={22} color="#38bdf8" />
              </div>
              <div style={styles.metricInfo}>
                <span style={styles.metricLabel}>Frecuencia Semanal</span>
                <span style={styles.metricValue}>
                  {stats ? `${stats.workoutFrequency} ses/sem` : '0'}
                </span>
                <span style={styles.metricSub}>Promedio de entrenamientos</span>
              </div>
            </div>

            <div style={styles.metricCard}>
              <div style={{ ...styles.metricIconWrap, backgroundColor: 'rgba(234, 179, 8, 0.12)' }}>
                <Award size={22} color="#eab308" />
              </div>
              <div style={styles.metricInfo}>
                <span style={styles.metricLabel}>Sesiones Completadas</span>
                <span style={styles.metricValue}>
                  {stats ? stats.totalWorkouts : 0}
                </span>
                <span style={styles.metricSub}>Total de entrenamientos registrados</span>
              </div>
            </div>

            <div style={styles.metricCard}>
              <div style={{ ...styles.metricIconWrap, backgroundColor: 'rgba(168, 85, 247, 0.12)' }}>
                <Target size={22} color="#c084fc" />
              </div>
              <div style={styles.metricInfo}>
                <span style={styles.metricLabel}>Récords Personales (PRs)</span>
                <span style={styles.metricValue}>
                  {stats ? stats.personalRecords : 0}
                </span>
                <span style={styles.metricSub}>Marcas máximas registradas</span>
              </div>
            </div>
          </div>

          {/* Main 2-Column Analytics Section */}
          <div style={styles.analyticsLayout}>
            {/* FR-PROG-003: Weekly Progress Charts */}
            <div style={styles.chartSectionCard}>
              <div style={styles.chartHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={styles.sectionIconBadge}>
                    <BarChart2 size={20} color="var(--accent-teal)" />
                  </div>
                  <div>
                    <h2 style={styles.sectionTitle}>Evolución Semanal</h2>
                    <span style={styles.sectionSubtitle}>
                      {chartMetric === 'volume' ? 'Volumen total levantado por semana' : 'Frecuencia de sesiones por semana'}
                    </span>
                  </div>
                </div>

                {/* Metric Selector Tabs */}
                <div style={styles.metricToggleBar}>
                  <button
                    style={{
                      ...styles.toggleBtn,
                      ...(chartMetric === 'volume' ? styles.toggleBtnActive : {}),
                    }}
                    onClick={() => setChartMetric('volume')}
                  >
                    Volumen (kg)
                  </button>
                  <button
                    style={{
                      ...styles.toggleBtn,
                      ...(chartMetric === 'frequency' ? styles.toggleBtnActive : {}),
                    }}
                    onClick={() => setChartMetric('frequency')}
                  >
                    Frecuencia
                  </button>
                </div>
              </div>

              {chartData.length === 0 ? (
                <div style={styles.emptyChartBox}>
                  <TrendingUp size={40} color="var(--text-muted)" />
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginTop: '0.5rem' }}>
                    Completa entrenamientos para ver tu gráfica de evolución semanal.
                  </p>
                </div>
              ) : (
                <div style={styles.chartStage}>
                  {/* Visual Bar Chart */}
                  <div style={styles.barsContainer}>
                    {chartData.map((d, i) => {
                      const heightPct = Math.max(10, Math.round((d.value / maxChartVal) * 100));
                      return (
                        <div key={d.date || i} style={styles.barColumn}>
                          <div style={styles.barTooltip}>
                            {chartMetric === 'volume' ? `${d.value.toLocaleString()} kg` : `${d.value} ses`}
                          </div>
                          <div style={styles.barTrack}>
                            <div
                              style={{
                                ...styles.barFill,
                                height: `${heightPct}%`,
                                backgroundColor: chartMetric === 'volume' ? 'var(--accent-teal)' : '#38bdf8',
                              }}
                            />
                          </div>
                          <span style={styles.barLabel}>{formatWeekDate(d.date)}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Chart Summary Footnote */}
                  <div style={styles.chartFootnote}>
                    <div style={styles.footnoteItem}>
                      <span style={styles.footnoteLabel}>Semanas registradas:</span>
                      <span style={styles.footnoteVal}>{chartData.length}</span>
                    </div>
                    <div style={styles.footnoteItem}>
                      <span style={styles.footnoteLabel}>Pico máximo:</span>
                      <span style={styles.footnoteVal}>
                        {chartMetric === 'volume' ? `${maxChartVal.toLocaleString()} kg` : `${maxChartVal} sesiones`}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* FR-MUSC-002: Muscle Group Statistics and Balance */}
            <div style={styles.muscleSectionCard}>
              <div style={styles.chartHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{ ...styles.sectionIconBadge, backgroundColor: 'rgba(56, 189, 248, 0.12)' }}>
                    <PieChart size={20} color="#38bdf8" />
                  </div>
                  <div>
                    <h2 style={styles.sectionTitle}>Balance por Grupo Muscular</h2>
                    <span style={styles.sectionSubtitle}>Distribución de volumen y frecuencia</span>
                  </div>
                </div>
              </div>

              {sortedMuscles.length === 0 ? (
                <div style={styles.emptyChartBox}>
                  <Dumbbell size={40} color="var(--text-muted)" />
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginTop: '0.5rem' }}>
                    Registra entrenamientos para ver el balance de trabajo por grupo muscular.
                  </p>
                </div>
              ) : (
                <div style={styles.muscleList}>
                  {sortedMuscles.map((item) => {
                    const pct = totalMuscleVolume > 0
                      ? Math.round((item.volume / totalMuscleVolume) * 100)
                      : 0;
                    const color = muscleColorMap[item.muscleGroup] || 'var(--accent-teal)';

                    return (
                      <div key={item.muscleGroup} style={styles.muscleRow}>
                        <div style={styles.muscleRowTop}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ ...styles.muscleDot, backgroundColor: color }} />
                            <span style={styles.muscleName}>{item.muscleGroup}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={styles.muscleFreqBadge}>{item.trainingFrequency} sesiones</span>
                            <span style={styles.muscleVolumeText}>{item.volume.toLocaleString()} kg ({pct}%)</span>
                          </div>
                        </div>

                        <div style={styles.muscleProgressTrack}>
                          <div
                            style={{
                              ...styles.muscleProgressFill,
                              width: `${pct}%`,
                              backgroundColor: color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Recent Workouts Quick Access */}
          {recentWorkouts.length > 0 && (
            <div style={styles.recentSection}>
              <div style={styles.recentHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Calendar size={20} color="var(--accent-teal)" />
                  <h2 style={styles.sectionTitle}>Entrenamientos Recientes</h2>
                </div>
                <button style={styles.seeAllBtn} onClick={() => onNavigate('history')}>
                  <span>Ver todo el historial</span>
                  <ChevronRight size={16} />
                </button>
              </div>

              <div style={styles.recentGrid}>
                {recentWorkouts.map((w) => (
                  <div key={w.id} style={styles.recentCard} onClick={() => onNavigate('history')}>
                    <div style={styles.recentCardTop}>
                      <span style={styles.recentCardDate}>
                        {new Date(w.startedAt).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </span>
                      <span style={styles.recentDuration}>
                        {Math.floor((w.durationSeconds || 0) / 60)} min
                      </span>
                    </div>

                    <div style={styles.recentStatsRow}>
                      <div>
                        <span style={styles.recentStatLabel}>Ejercicios</span>
                        <span style={styles.recentStatVal}>{w.exerciseCount}</span>
                      </div>
                      <div>
                        <span style={styles.recentStatLabel}>Series</span>
                        <span style={styles.recentStatVal}>{w.setsCompleted}</span>
                      </div>
                      <div>
                        <span style={styles.recentStatLabel}>Volumen</span>
                        <span style={{ ...styles.recentStatVal, color: 'var(--accent-teal)' }}>{w.totalVolume} kg</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
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
  welcomeBanner: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: '24px',
    padding: '2.25rem 2.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '1.5rem',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
  },
  welcomeLeft: {
    maxWidth: '650px',
  },
  badgeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    marginBottom: '0.6rem',
  },
  greetingBadge: {
    backgroundColor: 'rgba(34, 240, 197, 0.12)',
    color: 'var(--accent-teal)',
    border: '1px solid rgba(34, 240, 197, 0.25)',
    padding: '0.25rem 0.75rem',
    borderRadius: '999px',
    fontSize: '0.82rem',
    fontWeight: 700,
  },
  appVersionBadge: {
    backgroundColor: 'var(--input-bg)',
    color: 'var(--text-muted)',
    border: '1px solid var(--border-color)',
    padding: '0.25rem 0.65rem',
    borderRadius: '999px',
    fontSize: '0.78rem',
    fontWeight: 700,
    letterSpacing: '0.5px',
  },
  welcomeTitle: {
    fontSize: '2.2rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    letterSpacing: '-0.5px',
  },
  welcomeSubtitle: {
    color: 'var(--text-muted)',
    fontSize: '0.95rem',
    marginTop: '0.35rem',
    lineHeight: 1.5,
  },
  bannerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  startWorkoutBtn: {
    backgroundColor: 'var(--accent-teal)',
    color: '#000000',
    padding: '0.85rem 1.4rem',
    borderRadius: '14px',
    fontWeight: 800,
    fontSize: '0.95rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    cursor: 'pointer',
    boxShadow: '0 8px 20px rgba(34, 240, 197, 0.25)',
  },
  secondaryActionBtn: {
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    padding: '0.85rem 1.25rem',
    borderRadius: '14px',
    fontWeight: 700,
    fontSize: '0.95rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
  },
  loadingBox: {
    padding: '4rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
    gap: '1.25rem',
  },
  metricCard: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: '18px',
    padding: '1.4rem 1.5rem',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem',
  },
  metricIconWrap: {
    width: '46px',
    height: '46px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  metricInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  metricLabel: {
    fontSize: '0.78rem',
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  metricValue: {
    fontSize: '1.45rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    marginTop: '0.2rem',
  },
  metricSub: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginTop: '0.25rem',
  },
  analyticsLayout: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '1.5rem',
  },
  chartSectionCard: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: '22px',
    padding: '1.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  muscleSectionCard: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: '22px',
    padding: '1.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  chartHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '0.75rem',
  },
  sectionIconBadge: {
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    backgroundColor: 'rgba(34, 240, 197, 0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: '1.2rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
  },
  sectionSubtitle: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
  },
  metricToggleBar: {
    display: 'flex',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '10px',
    padding: '3px',
  },
  toggleBtn: {
    padding: '0.35rem 0.75rem',
    borderRadius: '7px',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    cursor: 'pointer',
    backgroundColor: 'transparent',
  },
  toggleBtnActive: {
    backgroundColor: 'var(--surface-color)',
    color: 'var(--text-primary)',
    fontWeight: 700,
  },
  emptyChartBox: {
    padding: '3rem 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },
  chartStage: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    paddingTop: '0.5rem',
  },
  barsContainer: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: '0.6rem',
    height: '180px',
    padding: '1rem 0.5rem 0',
  },
  barColumn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    height: '100%',
    position: 'relative',
  },
  barTooltip: {
    fontSize: '0.72rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: '0.35rem',
    whiteSpace: 'nowrap',
  },
  barTrack: {
    flex: 1,
    width: '100%',
    maxWidth: '36px',
    backgroundColor: 'var(--input-bg)',
    borderRadius: '8px 8px 0 0',
    display: 'flex',
    alignItems: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: '8px 8px 0 0',
    transition: 'height 0.4s ease',
  },
  barLabel: {
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
    marginTop: '0.5rem',
    fontWeight: 600,
  },
  chartFootnote: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTop: '1px solid var(--border-color)',
    paddingTop: '0.85rem',
  },
  footnoteItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
  },
  footnoteLabel: {
    fontSize: '0.78rem',
    color: 'var(--text-muted)',
  },
  footnoteVal: {
    fontSize: '0.82rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  muscleList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  muscleRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  muscleRowTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  muscleDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  muscleName: {
    fontSize: '0.92rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  muscleFreqBadge: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    padding: '0.15rem 0.5rem',
    borderRadius: '6px',
  },
  muscleVolumeText: {
    fontSize: '0.85rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  muscleProgressTrack: {
    height: '8px',
    backgroundColor: 'var(--input-bg)',
    borderRadius: '999px',
    overflow: 'hidden',
  },
  muscleProgressFill: {
    height: '100%',
    borderRadius: '999px',
    transition: 'width 0.4s ease',
  },
  recentSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  recentHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  seeAllBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    color: 'var(--accent-teal)',
    fontSize: '0.85rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
  recentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem',
  },
  recentCard: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: '16px',
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.85rem',
    cursor: 'pointer',
    transition: 'transform 0.15s ease',
  },
  recentCardTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recentCardDate: {
    fontSize: '0.95rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    textTransform: 'capitalize',
  },
  recentDuration: {
    fontSize: '0.78rem',
    color: 'var(--text-muted)',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    padding: '0.2rem 0.55rem',
    borderRadius: '6px',
    fontWeight: 600,
  },
  recentStatsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.5rem',
    backgroundColor: 'var(--input-bg)',
    padding: '0.65rem',
    borderRadius: '10px',
  },
  recentStatLabel: {
    fontSize: '0.68rem',
    color: 'var(--text-muted)',
    display: 'block',
    textTransform: 'uppercase',
  },
  recentStatVal: {
    fontSize: '0.9rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    display: 'block',
    marginTop: '0.15rem',
  },
};
