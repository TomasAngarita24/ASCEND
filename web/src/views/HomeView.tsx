import React, { useEffect, useState } from 'react';
import {
  Dumbbell,
  Activity,
  Calendar,
  Zap,
  PieChart,
  ChevronRight,
  Play,
  ArrowUpRight,
  Target,
  RefreshCw,
  Trophy,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  api,
  type Tokens,
  type ProgressStatistics,
  type MuscleGroupStat,
  type WorkoutHistoryEntry,
  type WeeklyMuscleSetStat,
} from '../api/api';

interface HomeViewProps {
  tokens: Tokens;
  onNavigate: (tab: 'routines' | 'exercises' | 'history' | 'profile' | 'plate-calculator' | 'measurements') => void;
  onStartWorkout: (routineId?: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ tokens, onNavigate, onStartWorkout }) => {
  const [stats, setStats] = useState<ProgressStatistics | null>(null);
  const [muscleStats, setMuscleStats] = useState<MuscleGroupStat[]>([]);
  const [weeklyMuscleSets, setWeeklyMuscleSets] = useState<WeeklyMuscleSetStat[]>([]);
  const [totalWeeklySets, setTotalWeeklySets] = useState<number>(0);
  const [totalDailySets, setTotalDailySets] = useState<number>(0);
  const [weeklyViewMode, setWeeklyViewMode] = useState<'weekly' | 'daily'>('weekly');
  const [recentWorkouts, setRecentWorkouts] = useState<WorkoutHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [tokens]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, muscleRes, historyRes, weeklyRes] = await Promise.allSettled([
        api.getStatistics(tokens.accessToken),
        api.getMuscleGroupStatistics(tokens.accessToken),
        api.listWorkoutHistory(tokens.accessToken),
        api.getWeeklyMuscleSets(tokens.accessToken),
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value);
      if (muscleRes.status === 'fulfilled') setMuscleStats(muscleRes.value);
      if (historyRes.status === 'fulfilled') setRecentWorkouts(historyRes.value.slice(0, 3));
      if (weeklyRes.status === 'fulfilled') {
        setWeeklyMuscleSets(weeklyRes.value.data);
        setTotalWeeklySets(weeklyRes.value.totalWeeklySets);
        setTotalDailySets(weeklyRes.value.totalDailySets);
      }
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

  const totalMuscleVolume = muscleStats.reduce((sum, m) => sum + m.volume, 0);
  const sortedMuscles = [...muscleStats].sort((a, b) => b.volume - a.volume);

  const RECOMMENDED_WEEKLY_SETS = 16;
  const RECOMMENDED_DAILY_SETS = 8;

  const displayedMuscleSets = React.useMemo(() => {
    if (weeklyMuscleSets.length > 0) {
      if (weeklyViewMode === 'weekly') {
        return [...weeklyMuscleSets].sort((a, b) => b.weeklySets - a.weeklySets || b.totalSets - a.totalSets);
      } else {
        return [...weeklyMuscleSets].sort((a, b) => b.dailySets - a.dailySets || b.weeklySets - a.weeklySets);
      }
    }
    // Fallback con muscleStats si la API de weeklyMuscleSets aún no tiene datos
    return sortedMuscles.map((m) => {
      const estimatedTotalSets = stats?.totalSets && totalMuscleVolume > 0
        ? Math.max(1, Math.round((m.volume / totalMuscleVolume) * stats.totalSets))
        : m.trainingFrequency * 3;
      return {
        muscleGroup: m.muscleGroup,
        weeklySets: 0,
        weeklyVolume: 0,
        dailySets: 0,
        dailyVolume: 0,
        totalSets: estimatedTotalSets,
        totalVolume: m.volume,
        frequencyThisWeek: 0,
      };
    });
  }, [weeklyMuscleSets, weeklyViewMode, sortedMuscles, stats, totalMuscleVolume]);

  const muscleColorMap: Record<string, string> = {
    Pecho: '#38bdf8',
    Chest: '#38bdf8',
    Pectoral: '#38bdf8',
    Dorsal: '#818cf8',
    Espalda: '#818cf8',
    Back: '#818cf8',
    Cuadriceps: '#34d399',
    Femoral: '#10b981',
    Piernas: '#34d399',
    Legs: '#34d399',
    Gluteos: '#059669',
    Hombros: '#f472b6',
    Shoulders: '#f472b6',
    Biceps: '#fbbf24',
    Triceps: '#f59e0b',
    Brazos: '#fbbf24',
    Arms: '#fbbf24',
    Abdominales: '#a78bfa',
    Core: '#a78bfa',
    Trapecio: '#c084fc',
    Antebrazo: '#fb7185',
    Pantorrillas: '#2dd4bf',
    Adductor: '#e879f9',
  };

  return (
    <div style={styles.container}>
      {/* Welcome Hero Banner */}
      <div style={styles.welcomeBanner}>
        <div style={styles.welcomeLeft}>
          <div style={styles.badgeRow}>
            <span style={styles.greetingBadge}>
              <Sparkles size={13} color="var(--accent-teal)" />
              {getGreeting()}
            </span>
          </div>
          <h1 style={styles.welcomeTitle}>Panel de Rendimiento</h1>
          <p style={styles.welcomeSubtitle}>
            Monitorea tu sobrecarga progresiva, volumen acumulado por semana y distribución de balance muscular.
          </p>
        </div>

        <div style={styles.bannerActions}>
          <button style={styles.startWorkoutBtn} onClick={() => onStartWorkout()}>
            <div style={styles.playIconCircle}>
              <Play size={14} fill="var(--bg-color)" color="var(--bg-color)" style={{ marginLeft: '2px' }} />
            </div>
            <span>Entrenar ahora</span>
          </button>
          <button style={styles.secondaryActionBtn} onClick={() => onNavigate('routines')}>
            <Dumbbell size={16} />
            <span>Mis rutinas</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div style={styles.loadingBox}>
          <RefreshCw size={26} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-teal)' }} />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>Cargando métricas...</span>
        </div>
      ) : (
        <>
          {/* Top 4 Metrics Grid */}
          <div style={styles.metricsGrid}>
            <div style={styles.metricCard}>
              <div style={{ ...styles.metricIconWrap, backgroundColor: 'rgba(34, 240, 197, 0.12)' }}>
                <Zap size={20} color="var(--accent-teal)" />
              </div>
              <div style={styles.metricInfo}>
                <span style={styles.metricLabel}>Volumen Total</span>
                <span style={styles.metricValue}>
                  {stats ? `${(stats.totalVolume).toLocaleString()} kg` : '0 kg'}
                </span>
                <span style={styles.metricSub}>Carga acumulada</span>
              </div>
            </div>

            <div style={styles.metricCard}>
              <div style={{ ...styles.metricIconWrap, backgroundColor: 'rgba(56, 189, 248, 0.12)' }}>
                <Activity size={20} color="#38bdf8" />
              </div>
              <div style={styles.metricInfo}>
                <span style={styles.metricLabel}>Series Completadas</span>
                <span style={styles.metricValue}>
                  {stats?.totalSets ?? 0}
                </span>
                <span style={styles.metricSub}>{stats?.totalRepetitions.toLocaleString() ?? 0} repeticiones</span>
              </div>
            </div>

            <div style={styles.metricCard}>
              <div style={{ ...styles.metricIconWrap, backgroundColor: 'rgba(129, 140, 248, 0.12)' }}>
                <Calendar size={20} color="#818cf8" />
              </div>
              <div style={styles.metricInfo}>
                <span style={styles.metricLabel}>Entrenamientos</span>
                <span style={styles.metricValue}>
                  {stats?.totalWorkouts ?? 0}
                </span>
                <span style={styles.metricSub}>{stats?.workoutFrequency ?? 0} ses/sem prom.</span>
              </div>
            </div>

            <div style={styles.metricCard}>
              <div style={{ ...styles.metricIconWrap, backgroundColor: 'rgba(245, 158, 11, 0.12)' }}>
                <Trophy size={20} color="#f59e0b" />
              </div>
              <div style={styles.metricInfo}>
                <span style={styles.metricLabel}>Récords Personales</span>
                <span style={styles.metricValue}>
                  {stats?.personalRecords ?? 0}
                </span>
                <span style={styles.metricSub}>Mejores marcas (PRs)</span>
              </div>
            </div>
          </div>

          {/* Main Asymmetrical Bento Grid */}
          <div style={styles.bentoGrid}>
            {/* Left Column: Weekly & Daily Muscle Sets Volume (FR-PROG-003) */}
            <div style={styles.chartCard}>
              <div style={styles.cardHeader}>
                <div>
                  <div style={styles.cardEyebrow}>VOLUMEN DE ENTRENAMIENTO SEMANAL</div>
                  <h2 style={styles.cardTitle}>
                    {weeklyViewMode === 'weekly' ? 'Series Semanales por Músculo' : 'Series Diarias por Músculo'}
                  </h2>
                </div>

                <div style={styles.weeklyHeaderRight}>
                  <div style={styles.weeklySetsBadge}>
                    <Layers size={14} color="var(--accent-teal)" />
                    <span>
                      {weeklyViewMode === 'weekly'
                        ? `${totalWeeklySets} series esta semana`
                        : `${totalDailySets} series hoy`}
                    </span>
                  </div>
                  <div style={styles.chartToggleGroup}>
                    <button
                      style={{
                        ...styles.toggleBtn,
                        ...(weeklyViewMode === 'weekly' ? styles.toggleBtnActive : {}),
                      }}
                      onClick={() => setWeeklyViewMode('weekly')}
                    >
                      <Calendar size={13} />
                      <span>Semanales</span>
                    </button>
                    <button
                      style={{
                        ...styles.toggleBtn,
                        ...(weeklyViewMode === 'daily' ? styles.toggleBtnActive : {}),
                      }}
                      onClick={() => setWeeklyViewMode('daily')}
                    >
                      <Activity size={13} />
                      <span>Diarias</span>
                    </button>
                  </div>
                </div>
              </div>

              {displayedMuscleSets.length === 0 ? (
                <div style={styles.chartEmpty}>
                  <Layers size={36} color="var(--text-dim)" />
                  <p>Completa entrenamientos para ver tus series por músculo</p>
                  <button style={styles.emptyStartBtn} onClick={() => onStartWorkout()}>
                    Iniciar entrenamiento
                  </button>
                </div>
              ) : (
                <div style={styles.weeklyContentWrap}>
                  {weeklyViewMode === 'weekly' && totalWeeklySets === 0 && (
                    <div style={styles.weeklyNotice}>
                      <span>💡 Aún no has registrado series esta semana. Mostrando metas semanales por grupo muscular:</span>
                    </div>
                  )}

                  {weeklyViewMode === 'daily' && totalDailySets === 0 && (
                    <div style={styles.weeklyNotice}>
                      <span>💡 Aún no has registrado series hoy. Inicia un entrenamiento para sumar tus series diarias:</span>
                    </div>
                  )}

                  <div style={styles.weeklyMuscleGrid}>
                    {displayedMuscleSets.slice(0, 8).map((item) => {
                      const isWeekly = weeklyViewMode === 'weekly';
                      const sets = isWeekly ? item.weeklySets : item.dailySets;
                      const target = isWeekly ? RECOMMENDED_WEEKLY_SETS : RECOMMENDED_DAILY_SETS;
                      const pct = Math.min(Math.round((sets / target) * 100), 100);
                      const color = muscleColorMap[item.muscleGroup] || 'var(--accent-teal)';

                      let badgeText = '0 series';
                      let badgeStyle = styles.badgeMuted;

                      if (isWeekly) {
                        if (sets >= 10 && sets <= 20) {
                          badgeText = 'Óptimo';
                          badgeStyle = styles.badgeOptimal;
                        } else if (sets > 20) {
                          badgeText = 'Volumen Alto';
                          badgeStyle = styles.badgeHigh;
                        } else if (sets > 0 && sets < 10) {
                          badgeText = 'Mantenimiento';
                          badgeStyle = styles.badgeMaintenance;
                        }
                      } else {
                        if (sets >= 4 && sets <= 8) {
                          badgeText = 'Óptimo';
                          badgeStyle = styles.badgeOptimal;
                        } else if (sets > 8) {
                          badgeText = 'Volumen Alto';
                          badgeStyle = styles.badgeHigh;
                        } else if (sets > 0 && sets < 4) {
                          badgeText = 'Estímulo Bajo';
                          badgeStyle = styles.badgeMaintenance;
                        }
                      }

                      return (
                        <div key={item.muscleGroup} style={styles.weeklyMuscleItem}>
                          <div style={styles.weeklyMuscleHeader}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                              <span style={{ ...styles.muscleDot, backgroundColor: color }} />
                              <span style={styles.weeklyMuscleName}>{item.muscleGroup}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                              <span style={styles.weeklySetsCount}>
                                {sets} <span style={styles.weeklySetsLabel}>series</span>
                              </span>
                              <span style={{ ...styles.weeklyStatusBadge, ...badgeStyle }}>
                                {badgeText}
                              </span>
                            </div>
                          </div>

                          {/* Barra de progreso de series vs rango óptimo */}
                          <div style={styles.weeklyProgressTrack}>
                            <div
                              style={{
                                ...styles.weeklyProgressFill,
                                width: `${Math.max(pct, sets > 0 ? 6 : 0)}%`,
                                backgroundColor: color,
                              }}
                            />
                            <div
                              style={styles.targetOptimalMarker}
                              title={isWeekly ? 'Inicio de rango óptimo semanal (10 series)' : 'Inicio de rango óptimo diario (4 series)'}
                            />
                          </div>

                          <div style={styles.weeklySubRow}>
                            <span style={styles.weeklySubTarget}>
                              {isWeekly ? 'Rango óptimo: 10-20 series' : 'Meta de sesión: 4-8 series'}
                            </span>
                            <span style={styles.weeklySubPercent}>
                              {isWeekly ? `${pct}% meta semanal` : `${sets} series hoy`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={styles.weeklyFooterNotice}>
                    <span>
                      {weeklyViewMode === 'weekly'
                        ? '🎯 Volumen semanal óptimo: Entre 10 y 20 series efectivas semanales por músculo principal.'
                        : '🎯 Volumen diario óptimo: Entre 4 y 8 series efectivas por sesión por músculo principal.'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Muscle Balance (FR-MUSC-002) */}
            <div style={styles.muscleCard}>
              <div style={styles.cardHeader}>
                <div>
                  <div style={styles.cardEyebrow}>DISTRIBUCIÓN DE ESTIMULO</div>
                  <h2 style={styles.cardTitle}>Balance Muscular</h2>
                </div>
                <button
                  style={styles.exploreLinkBtn}
                  onClick={() => onNavigate('exercises')}
                  title="Ver biblioteca"
                >
                  <ArrowUpRight size={16} />
                </button>
              </div>

              {sortedMuscles.length === 0 ? (
                <div style={styles.chartEmpty}>
                  <PieChart size={36} color="var(--text-dim)" />
                  <p>Registra ejercicios para ver el balance entre grupos musculares</p>
                </div>
              ) : (
                <div style={styles.muscleList}>
                  {sortedMuscles.slice(0, 6).map((muscle) => {
                    const pct = totalMuscleVolume > 0
                      ? Math.round((muscle.volume / totalMuscleVolume) * 100)
                      : 0;
                    const color = muscleColorMap[muscle.muscleGroup] || 'var(--accent-teal)';

                    return (
                      <div key={muscle.muscleGroup} style={styles.muscleRow}>
                        <div style={styles.muscleMeta}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ ...styles.muscleDot, backgroundColor: color }} />
                            <span style={styles.muscleName}>{muscle.muscleGroup}</span>
                          </div>
                          <div style={styles.muscleVolWrap}>
                            <span style={styles.muscleVol}>{muscle.volume.toLocaleString()} kg</span>
                            <span style={styles.musclePct}>{pct}%</span>
                          </div>
                        </div>

                        <div style={styles.muscleTrack}>
                          <div
                            style={{
                              ...styles.muscleFill,
                              width: `${Math.max(pct, 4)}%`,
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

          {/* Bottom Row: Recent Workouts & Quick Navigation Bento */}
          <div style={styles.bottomBento}>
            {/* Recent Sessions */}
            <div style={styles.recentWorkoutsCard}>
              <div style={styles.cardHeader}>
                <div>
                  <div style={styles.cardEyebrow}>HISTORIAL RECIENTE</div>
                  <h2 style={styles.cardTitle}>Últimas Sesiones</h2>
                </div>
                <button style={styles.textLinkBtn} onClick={() => onNavigate('history')}>
                  <span>Ver todo</span>
                  <ChevronRight size={16} />
                </button>
              </div>

              {recentWorkouts.length === 0 ? (
                <div style={styles.recentEmpty}>
                  <p>No hay entrenamientos registrados recientemente.</p>
                  <button style={styles.emptyStartBtn} onClick={() => onStartWorkout()}>
                    Iniciar primer entrenamiento
                  </button>
                </div>
              ) : (
                <div style={styles.recentGrid}>
                  {recentWorkouts.map((w) => (
                    <div key={w.id} style={styles.recentItemCard} onClick={() => onNavigate('history')}>
                      <div style={styles.recentItemTop}>
                        <span style={styles.recentDate}>
                          {new Date(w.startedAt).toLocaleDateString('es-ES', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                        <span style={styles.recentStatusBadge}>Completado</span>
                      </div>
                      <div style={styles.recentStatsRow}>
                        <div>
                          <span style={styles.recentStatVal}>{w.exerciseCount}</span>
                          <span style={styles.recentStatLabel}>Ejercicios</span>
                        </div>
                        <div>
                          <span style={styles.recentStatVal}>{w.setsCompleted}</span>
                          <span style={styles.recentStatLabel}>Series</span>
                        </div>
                        <div>
                          <span style={styles.recentStatVal}>{w.totalVolume.toLocaleString()} kg</span>
                          <span style={styles.recentStatLabel}>Volumen</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Tools Tile */}
            <div style={styles.quickToolsCard}>
              <div style={styles.cardEyebrow}>ACCESOS RÁPIDOS</div>
              <h2 style={styles.cardTitle}>Herramientas del Gimnasio</h2>

              <div style={styles.toolsList}>
                <div style={styles.toolItem} onClick={() => onNavigate('plate-calculator')}>
                  <div style={{ ...styles.toolIconWrap, backgroundColor: 'rgba(37, 99, 235, 0.12)' }}>
                    <Target size={18} color="#2563eb" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={styles.toolTitle}>Calculadora de Discos</h4>
                    <p style={styles.toolSub}>Distribución exacta por lado de barra</p>
                  </div>
                  <ChevronRight size={18} color="var(--text-dim)" />
                </div>

                <div style={styles.toolItem} onClick={() => onNavigate('measurements')}>
                  <div style={{ ...styles.toolIconWrap, backgroundColor: 'rgba(34, 240, 197, 0.12)' }}>
                    <Activity size={18} color="var(--accent-teal)" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={styles.toolTitle}>Registro de Medidas</h4>
                    <p style={styles.toolSub}>Seguimiento de peso y perímetros</p>
                  </div>
                  <ChevronRight size={18} color="var(--text-dim)" />
                </div>

                <div style={styles.toolItem} onClick={() => onNavigate('exercises')}>
                  <div style={{ ...styles.toolIconWrap, backgroundColor: 'rgba(245, 158, 11, 0.12)' }}>
                    <Layers size={18} color="#f59e0b" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={styles.toolTitle}>151 Ejercicios Ilustrados</h4>
                    <p style={styles.toolSub}>Catálogo bilingüe con mapas musculares</p>
                  </div>
                  <ChevronRight size={18} color="var(--text-dim)" />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '2.5rem 3rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
    maxWidth: '1440px',
    margin: '0 auto',
    boxSizing: 'border-box',
  },
  welcomeBanner: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: '24px',
    padding: '2rem 2.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '1.5rem',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
  },
  welcomeLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
    maxWidth: '650px',
  },
  badgeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.2rem',
  },
  greetingBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.25rem 0.65rem',
    borderRadius: '999px',
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    border: '1px solid rgba(6, 182, 212, 0.25)',
    color: 'var(--accent-teal)',
    fontSize: '0.78rem',
    fontWeight: 700,
    letterSpacing: '0.02em',
  },
  welcomeTitle: {
    fontSize: '2.2rem',
    fontWeight: 800,
    letterSpacing: '-0.03em',
    color: 'var(--text-primary)',
  },
  welcomeSubtitle: {
    color: 'var(--text-muted)',
    fontSize: '0.95rem',
    lineHeight: 1.5,
  },
  bannerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.85rem',
    flexWrap: 'wrap',
  },
  startWorkoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
    backgroundColor: 'var(--accent-teal)',
    color: 'var(--bg-color)',
    padding: '0.75rem 1.35rem',
    borderRadius: '14px',
    fontWeight: 800,
    fontSize: '0.95rem',
    boxShadow: '0 4px 20px var(--accent-teal-glow)',
  },
  playIconCircle: {
    width: '26px',
    height: '26px',
    borderRadius: '50%',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    padding: '0.75rem 1.25rem',
    borderRadius: '14px',
    fontWeight: 700,
    fontSize: '0.9rem',
  },
  loadingBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1rem',
    padding: '6rem 2rem',
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: '20px',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '1rem',
  },
  metricCard: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: '20px',
    padding: '1.4rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1.1rem',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
  },
  metricIconWrap: {
    width: '48px',
    height: '48px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  metricInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem',
  },
  metricLabel: {
    fontSize: '0.78rem',
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  metricValue: {
    fontSize: '1.55rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
    lineHeight: 1.1,
  },
  metricSub: {
    fontSize: '0.75rem',
    color: 'var(--text-dim)',
  },
  bentoGrid: {
    display: 'grid',
    gridTemplateColumns: '2fr 1.2fr',
    gap: '1.5rem',
  },
  chartCard: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: '24px',
    padding: '1.75rem 2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  cardEyebrow: {
    fontSize: '0.72rem',
    fontWeight: 800,
    color: 'var(--accent-teal)',
    letterSpacing: '0.08em',
    marginBottom: '0.2rem',
  },
  cardTitle: {
    fontSize: '1.25rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
  },
  chartToggleGroup: {
    display: 'flex',
    gap: '0.35rem',
    backgroundColor: 'var(--input-bg)',
    padding: '0.25rem',
    borderRadius: '10px',
    border: '1px solid var(--border-color)',
  },
  toggleBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.4rem 0.75rem',
    borderRadius: '8px',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    backgroundColor: 'transparent',
  },
  toggleBtnActive: {
    backgroundColor: 'var(--surface-color)',
    color: 'var(--accent-teal)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
  },
  chartEmpty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    padding: '4rem 1rem',
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
    textAlign: 'center',
  },
  weeklyHeaderRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
    flexWrap: 'wrap',
  },
  weeklySetsBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
    border: '1px solid rgba(6, 182, 212, 0.2)',
    padding: '0.35rem 0.75rem',
    borderRadius: '10px',
    fontSize: '0.78rem',
    fontWeight: 700,
    color: 'var(--accent-teal)',
  },
  weeklyContentWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  weeklyNotice: {
    padding: '0.65rem 1rem',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    border: '1px solid rgba(56, 189, 248, 0.18)',
    borderRadius: '12px',
    fontSize: '0.82rem',
    color: 'var(--text-muted)',
  },
  weeklyMuscleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '0.85rem',
  },
  weeklyMuscleItem: {
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '14px',
    padding: '0.85rem 1.05rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.55rem',
  },
  weeklyMuscleHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.5rem',
  },
  weeklyMuscleName: {
    fontSize: '0.88rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  weeklySetsCount: {
    fontSize: '0.92rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
  },
  weeklySetsLabel: {
    fontSize: '0.72rem',
    fontWeight: 500,
    color: 'var(--text-muted)',
  },
  weeklyStatusBadge: {
    fontSize: '0.68rem',
    fontWeight: 700,
    padding: '0.2rem 0.5rem',
    borderRadius: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  },
  badgeOptimal: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    color: '#34d399',
    border: '1px solid rgba(52, 211, 153, 0.3)',
  },
  badgeHigh: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    color: '#fbbf24',
    border: '1px solid rgba(251, 191, 36, 0.3)',
  },
  badgeMaintenance: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    color: '#38bdf8',
    border: '1px solid rgba(56, 189, 248, 0.3)',
  },
  badgeMuted: {
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    color: 'var(--text-dim)',
    border: '1px solid var(--border-color)',
  },
  weeklyProgressTrack: {
    position: 'relative',
    height: '7px',
    borderRadius: '999px',
    backgroundColor: 'var(--surface-color)',
    overflow: 'hidden',
  },
  weeklyProgressFill: {
    height: '100%',
    borderRadius: '999px',
    transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  targetOptimalMarker: {
    position: 'absolute',
    left: '62.5%',
    top: 0,
    bottom: 0,
    width: '2px',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  weeklySubRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '0.73rem',
  },
  weeklySubTarget: {
    color: 'var(--text-dim)',
  },
  weeklySubPercent: {
    color: 'var(--text-muted)',
    fontWeight: 600,
  },
  weeklyFooterNotice: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.6rem 0.8rem',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: '10px',
    border: '1px solid var(--border-color)',
    fontSize: '0.76rem',
    color: 'var(--text-muted)',
    textAlign: 'center',
  },
  chartContainer: {
    height: '240px',
    width: '100%',
    display: 'flex',
    alignItems: 'flex-end',
    paddingTop: '2rem',
  },
  barsRow: {
    display: 'flex',
    width: '100%',
    height: '100%',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: '0.75rem',
  },
  barColumn: {
    flex: 1,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
    cursor: 'pointer',
  },
  barTooltip: {
    position: 'absolute',
    top: '-8px',
    backgroundColor: 'var(--card-color)',
    border: '1px solid var(--border-color)',
    color: 'var(--accent-teal)',
    padding: '0.25rem 0.5rem',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: 700,
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    transition: 'all 0.15s ease',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
    zIndex: 10,
  },
  barTrack: {
    width: '100%',
    maxWidth: '44px',
    height: 'calc(100% - 30px)',
    backgroundColor: 'var(--input-bg)',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: '10px',
    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  barDate: {
    fontSize: '0.75rem',
    marginTop: '0.5rem',
    textAlign: 'center',
    whiteSpace: 'nowrap',
  },
  muscleCard: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: '24px',
    padding: '1.75rem 2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  exploreLinkBtn: {
    padding: '0.45rem',
    borderRadius: '10px',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-muted)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  muscleList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.9rem',
  },
  muscleRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  muscleMeta: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  muscleDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  muscleName: {
    fontSize: '0.88rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  muscleVolWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  muscleVol: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    fontWeight: 500,
  },
  musclePct: {
    fontSize: '0.82rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
  },
  muscleTrack: {
    height: '8px',
    borderRadius: '999px',
    backgroundColor: 'var(--input-bg)',
    overflow: 'hidden',
  },
  muscleFill: {
    height: '100%',
    borderRadius: '999px',
    transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  bottomBento: {
    display: 'grid',
    gridTemplateColumns: '1.8fr 1.2fr',
    gap: '1.5rem',
  },
  recentWorkoutsCard: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: '24px',
    padding: '1.75rem 2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  textLinkBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
    color: 'var(--accent-teal)',
    fontSize: '0.85rem',
    fontWeight: 700,
  },
  recentEmpty: {
    padding: '3rem 1rem',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
  },
  emptyStartBtn: {
    backgroundColor: 'var(--accent-blue)',
    color: '#ffffff',
    padding: '0.6rem 1.25rem',
    borderRadius: '10px',
    fontSize: '0.85rem',
    fontWeight: 700,
  },
  recentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '0.85rem',
  },
  recentItemCard: {
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '16px',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  recentItemTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recentDate: {
    fontSize: '0.85rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    textTransform: 'capitalize',
  },
  recentStatusBadge: {
    fontSize: '0.7rem',
    fontWeight: 700,
    color: '#22c55e',
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    padding: '0.15rem 0.45rem',
    borderRadius: '6px',
  },
  recentStatsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.5rem',
  },
  recentStatVal: {
    display: 'block',
    fontSize: '0.88rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
  },
  recentStatLabel: {
    fontSize: '0.68rem',
    color: 'var(--text-muted)',
  },
  quickToolsCard: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: '24px',
    padding: '1.75rem 2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  toolsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.65rem',
    marginTop: '0.25rem',
  },
  toolItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.85rem',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '14px',
    padding: '0.85rem 1rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  toolIconWrap: {
    width: '38px',
    height: '38px',
    borderRadius: '11px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  toolTitle: {
    fontSize: '0.9rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: '0.1rem',
  },
  toolSub: {
    fontSize: '0.76rem',
    color: 'var(--text-muted)',
  },
};
