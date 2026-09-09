import React, { useEffect, useMemo, useState } from 'react';
import { Dumbbell, Flame, Trophy, Calendar, Award, Play, ChevronRight } from 'lucide-react';
import { api, type RoutineSummary, type WorkoutHistoryEntry, type WorkoutDetailEntry, type User as UserType, type Tokens } from '../api/api';
import type { UserProfileCustomData } from './SettingsView';
import type { NavTab } from '../components/Sidebar';

interface ProfileViewProps {
  user: UserType;
  tokens: Tokens;
  profileData: UserProfileCustomData;
  onNavigate: (tab: NavTab) => void;
  onStartWorkout: (routineId?: string) => void;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Returns Monday of the ISO week containing `date` */
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Calculate consecutive weekly streak from sorted completed workout dates (desc) */
function calcWeeklyStreak(workoutDates: Date[]): number {
  if (workoutDates.length === 0) return 0;

  // Get distinct weeks (Mon) that have at least one workout
  const weekSet = new Set<string>();
  for (const d of workoutDates) {
    const mon = getMonday(d);
    weekSet.add(mon.toISOString().slice(0, 10));
  }

  const sortedWeeks = Array.from(weekSet)
    .map((s) => new Date(s))
    .sort((a, b) => b.getTime() - a.getTime());

  const thisWeekMon = getMonday(new Date());

  // Allow current week or last week to start streak
  let streak = 0;
  let expected = new Date(thisWeekMon);

  for (const weekMon of sortedWeeks) {
    if (weekMon.getTime() === expected.getTime() || weekMon.getTime() === new Date(expected.getTime() + 7 * 86400000).getTime()) {
      streak++;
      expected.setDate(expected.getDate() - 7);
    } else if (weekMon.getTime() < expected.getTime()) {
      break;
    }
  }

  return streak;
}

/** Build workout day Set from history for quick lookup: "YYYY-MM-DD" */
function buildWorkoutDaySet(workouts: WorkoutHistoryEntry[]): Set<string> {
  const s = new Set<string>();
  for (const w of workouts) {
    const d = new Date(w.startedAt);
    s.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }
  return s;
}

/** Compute real PRs from detailed workout data: max weight per exercise + reps at that weight */
function calcPersonalBests(details: WorkoutDetailEntry[]): Array<{ name: string; weight: string; reps: string; date: string }> {
  // Map exerciseId -> { name, maxWeight, repsAtMax, date }
  const map = new Map<string, { name: string; maxWeight: number; repsAtMax: number; date: string }>();

  for (const workout of details) {
    for (const ex of workout.exercises) {
      for (const s of ex.sets) {
        if (!s.isCompleted || !s.weight || !s.repetitions || s.weight <= 0) continue;
        const existing = map.get(ex.exercise.id);
        if (!existing || s.weight > existing.maxWeight) {
          const d = new Date(workout.startedAt);
          map.set(ex.exercise.id, {
            name: ex.exercise.name,
            maxWeight: s.weight,
            repsAtMax: s.repetitions,
            date: d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' }),
          });
        }
      }
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.maxWeight - a.maxWeight)
    .slice(0, 6)
    .map(pr => ({
      name: pr.name,
      weight: `${pr.maxWeight} kg`,
      reps: `${pr.repsAtMax} reps`,
      date: pr.date,
    }));
}

// ─── GitHub-style Contribution Heatmap ────────────────────────────────────────

const NUM_WEEKS = 52;
const CELL_SIZE = 14;
const CELL_GAP = 3;

interface HeatCell { dateKey: string }
type HeatColumn = Array<HeatCell | null>; // 7 slots Mon–Sun

function buildHeatColumns(): HeatColumn[] {
  const today = new Date();
  const dow = today.getDay();
  const toMon = dow === 0 ? -6 : 1 - dow;
  const anchor = new Date(today);
  anchor.setDate(today.getDate() + toMon);
  anchor.setHours(0, 0, 0, 0);

  const start = new Date(anchor);
  start.setDate(anchor.getDate() - (NUM_WEEKS - 1) * 7);

  const columns: HeatColumn[] = [];
  for (let w = 0; w < NUM_WEEKS; w++) {
    const col: HeatColumn = [];
    for (let d = 0; d < 7; d++) {
      const cur = new Date(start);
      cur.setDate(start.getDate() + w * 7 + d);
      if (cur > today) {
        col.push(null);
      } else {
        const yr = cur.getFullYear();
        const mo = cur.getMonth();
        const dy = cur.getDate();
        const dateKey = `${yr}-${String(mo + 1).padStart(2, '0')}-${String(dy).padStart(2, '0')}`;
        col.push({ dateKey });
      }
    }
    columns.push(col);
  }
  return columns;
}

interface CalendarProps {
  workoutDays: Set<string>;
}

const ActivityCalendar: React.FC<CalendarProps> = ({ workoutDays }) => {
  const columns = useMemo(() => buildHeatColumns(), []);
  const gridW = NUM_WEEKS * (CELL_SIZE + CELL_GAP);

  return (
    <div style={{ width: '100%' }}>
      <div style={{ overflowX: 'auto', paddingBottom: '4px' }}>
        <div style={{ display: 'flex', gap: `${CELL_GAP}px`, minWidth: gridW }}>
          {columns.map((col, wi) => (
            <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: `${CELL_GAP}px` }}>
              {col.map((cell, di) => {
                if (!cell) return <div key={di} style={{ width: CELL_SIZE, height: CELL_SIZE }} />;
                const isWorkout = workoutDays.has(cell.dateKey);
                return (
                  <div
                    key={di}
                    title={cell.dateKey}
                    style={{
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      borderRadius: 3,
                      backgroundColor: isWorkout ? 'var(--accent-teal)' : 'var(--heat-empty, #172033)',
                      transition: 'background 0.12s',
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Menos</span>
        <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: 'var(--heat-empty, #172033)' }} />
        <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: 'rgba(192,138,90,0.35)' }} />
        <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: 'var(--accent-teal)' }} />
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Más</span>
      </div>
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────
export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  tokens,
  profileData,
  onNavigate,
  onStartWorkout,
}) => {
  const [routines, setRoutines] = useState<RoutineSummary[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutHistoryEntry[]>([]);
  const [workoutDetails, setWorkoutDetails] = useState<WorkoutDetailEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const displayName = profileData.fullName.trim()
    || (user.email.includes('@') ? user.email.split('@')[0] : user.email);

  useEffect(() => {
    Promise.all([
      api.listRoutines(tokens.accessToken).catch(() => []),
      api.listWorkoutHistory(tokens.accessToken).catch(() => []),
    ]).then(([rList, wList]) => {
      setRoutines(rList);
      setWorkouts(wList);
      // Load last 15 workouts in detail for real PR data
      const recent = wList.slice(0, 15);
      Promise.all(recent.map(w => api.getWorkout(tokens.accessToken, w.id).catch(() => null)))
        .then(results => setWorkoutDetails(results.filter(Boolean) as WorkoutDetailEntry[]));
    }).finally(() => setLoading(false));
  }, [tokens]);

  const workoutDates = useMemo(
    () => workouts.map((w) => new Date(w.startedAt)),
    [workouts],
  );

  const workoutDaySet = useMemo(() => buildWorkoutDaySet(workouts), [workouts]);
  const weekStreak = useMemo(() => calcWeeklyStreak(workoutDates), [workoutDates]);
  const personalBests = useMemo(() => calcPersonalBests(workoutDetails), [workoutDetails]);

  // Aggregate statistics for FR-PROG-002 / FR-PROG-003
  const stats = useMemo(() => {
    let totalVol = 0;
    let totalSets = 0;
    let totalReps = 0;
    let thisWeekVol = 0;
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);

    for (const w of workouts) {
      totalVol += w.totalVolume || 0;
      totalSets += w.setsCompleted || 0;
      totalReps += w.totalRepetitions || 0;
      if (new Date(w.startedAt) >= sevenDaysAgo) {
        thisWeekVol += w.totalVolume || 0;
      }
    }

    return {
      totalVol: totalVol.toLocaleString('es-ES'),
      totalSets,
      totalReps: totalReps.toLocaleString('es-ES'),
      thisWeekVol: thisWeekVol.toLocaleString('es-ES'),
    };
  }, [workouts]);

  return (
    <div style={styles.container}>
      <h1 style={styles.pageTitle}>Perfil</h1>

      {/* User Header */}
      <div style={styles.headerCard}>
        <div style={styles.avatarCircle}>
          {profileData.avatarUrl ? (
            <img src={profileData.avatarUrl} alt="Avatar" style={styles.avatarImg} />
          ) : (
            <span style={styles.avatarInitial}>{displayName.charAt(0).toUpperCase()}</span>
          )}
        </div>

        <div style={styles.headerInfo}>
          <h2 style={styles.userName}>{displayName}</h2>
          <span style={styles.userEmail}>{profileData.email || user.email}</span>
          {profileData.bio && <p style={styles.userBio}>{profileData.bio}</p>}

          <div style={styles.countersRow}>
            <div style={styles.counterBox}>
              <span style={styles.counterNum}>{routines.length}</span>
              <span style={styles.counterLabel}>Rutinas</span>
            </div>
            <div style={styles.counterBox}>
              <span style={styles.counterNum}>{workouts.length}</span>
              <span style={styles.counterLabel}>Entrenamientos</span>
            </div>
            <div style={styles.counterBox}>
              <span style={styles.counterNum}>0</span>
              <span style={styles.counterLabel}>Seguidores</span>
            </div>
            <div style={styles.counterBox}>
              <span style={styles.counterNum}>0</span>
              <span style={styles.counterLabel}>Siguiendo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Summary Cards Row (FR-PROG-002 & FR-PROG-003) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1.25rem', width: '100%' }}>
        <div style={styles.statMetricCard}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>VOLUMEN TOTAL</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
            {stats.totalVol} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>kg</span>
          </div>
        </div>

        <div style={styles.statMetricCard}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>SERIES COMPLETADAS</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-teal)', marginTop: '0.2rem' }}>
            {stats.totalSets} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>series</span>
          </div>
        </div>

        <div style={styles.statMetricCard}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>REPETICIONES TOTALES</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-gold)', marginTop: '0.2rem' }}>
            {stats.totalReps} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>reps</span>
          </div>
        </div>

        <div style={styles.statMetricCard}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>VOLUMEN 7 DÍAS</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-gold)', marginTop: '0.2rem' }}>
            {stats.thisWeekVol} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>kg</span>
          </div>
        </div>
      </div>

      {/* Row 1: Actividad Heatmap (70%) + Racha Semanal (30%) */}
      <div style={styles.activityStreakGrid}>
        {/* Calendar Panel */}
        <div style={styles.card}>
          <div style={styles.titleRow}>
            <Calendar size={22} color="var(--accent-teal)" />
            <h2 style={styles.cardTitle}>Actividad</h2>
          </div>

          <ActivityCalendar workoutDays={workoutDaySet} />
        </div>

        {/* Racha Semanal Panel */}
        <div style={styles.card}>
          <div style={styles.titleRow}>
            <Flame size={22} color="var(--accent-gold)" />
            <h2 style={styles.cardTitle}>Racha semanal</h2>
          </div>

          <div style={styles.streakOnlyBox}>
            <div style={styles.streakBigNumber}>{weekStreak}</div>
            <div style={styles.streakBigLabel}>
              {weekStreak === 1 ? 'semana consecutiva' : 'semanas consecutivas'}
            </div>
            <div style={styles.streakSub}>entrenando 🔥</div>
          </div>

          <div style={styles.streakTotalBox}>
            <span style={styles.streakTotalNum}>{workouts.length}</span>
            <span style={styles.streakTotalLabel}>entrenamientos totales</span>
          </div>
        </div>
      </div>

      {/* Row 2: Tus Rutinas + Marcas Personales */}
      <div style={styles.twoColGrid}>
        {/* Tus Rutinas */}
        <div style={styles.cardLarge}>
          <div style={styles.cardHeaderBetween}>
            <div style={styles.titleRow}>
              <Dumbbell size={22} color="var(--accent-blue)" />
              <h2 style={styles.cardTitle}>Tus rutinas</h2>
            </div>
            <button style={styles.seeAllBtn} onClick={() => onNavigate('routines')}>
              Ver todas
            </button>
          </div>

          {routines.length === 0 ? (
            <div style={styles.emptyCardText}>No tienes rutinas creadas todavía.</div>
          ) : (
            <div style={styles.routinesGrid}>
              {routines.map((r) => (
                <div key={r.id} style={styles.routineCardMini}>
                  <div>
                    <h4 style={styles.routineMiniTitle}>{r.name}</h4>
                    <p style={styles.routineMiniSub}>{r.exerciseCount} ejercicios</p>
                  </div>
                  <button style={styles.startMiniBtn} onClick={() => onStartWorkout(r.id)}>
                    <Play size={15} />
                    <span>Iniciar</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Marcas Personales */}
        <div style={styles.cardLarge}>
          <div style={styles.titleRow}>
            <Trophy size={22} color="var(--accent-gold)" />
            <h2 style={styles.cardTitle}>Marcas personales</h2>
          </div>

          {loading ? (
            <div style={styles.emptyCardText}>Cargando...</div>
          ) : personalBests.length === 0 ? (
            <div style={styles.emptyCardText}>Completa entrenamientos para ver tus marcas.</div>
          ) : (
            <div style={styles.prList}>
              {personalBests.map((pr, i) => (
                <div key={i} style={styles.prItem}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={styles.prName}>{pr.name}</div>
                    <div style={styles.prDate}>{pr.date}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.1rem' }}>
                    <div style={styles.prWeight}>{pr.weight}</div>
                    <div style={styles.prReps}>{pr.reps}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Tus Entrenamientos Feed */}
      <div style={styles.cardLarge}>
        <div style={styles.cardHeaderBetween}>
          <div style={styles.titleRow}>
            <Award size={22} color="var(--accent-teal)" />
            <h2 style={styles.cardTitle}>Tus entrenamientos</h2>
          </div>
          <button style={styles.seeAllBtn} onClick={() => onNavigate('history')}>
            Ver historial
          </button>
        </div>

        {loading ? (
          <div style={styles.emptyCardText}>Cargando entrenamientos...</div>
        ) : workouts.length === 0 ? (
          <div style={styles.emptyCardText}>Aún no has completado ningún entrenamiento.</div>
        ) : (
          <div style={styles.workoutFeedList}>
            {workouts.slice(0, 5).map((w) => {
              const d = new Date(w.startedAt);
              const duration = w.durationSeconds
                ? `${Math.round(w.durationSeconds / 60)} min`
                : null;
              return (
                <div key={w.id} style={styles.workoutFeedItem} onClick={() => onNavigate('history')}>
                  <div style={styles.feedLeft}>
                    <div style={styles.feedIconBadge}>
                      <Dumbbell size={18} color="var(--accent-teal)" />
                    </div>
                    <div>
                      <h4 style={styles.feedTitle}>
                        {d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
                      </h4>
                      <p style={styles.feedSub}>
                        {w.exerciseCount} ejercicios · {w.setsCompleted} series
                        {w.totalVolume > 0 ? ` · ${w.totalVolume.toLocaleString()} kg` : ''}
                        {duration ? ` · ${duration}` : ''}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={18} color="var(--text-muted)" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: 'clamp(1.5rem, 4vw, 2.5rem) clamp(1rem, 5vw, 3rem)',
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
    boxSizing: 'border-box',
    maxWidth: '1280px',
    margin: '0 auto',
  },
  pageTitle: {
    fontSize: '2.4rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    marginBottom: '0.5rem',
  },
  headerCard: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-container)',
    padding: '2.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '2rem',
    flexWrap: 'wrap',
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '2rem', flex: 1 },
  avatarCircle: {
    width: '96px',
    height: '96px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent-teal)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarInitial: { fontSize: '2.2rem', fontWeight: 800, color: 'var(--bg-color)' },
  headerInfo: { display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 },
  userName: { fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' },
  userEmail: { fontSize: '1rem', color: 'var(--text-muted)' },
  userBio: { fontSize: '0.95rem', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.4, marginTop: '0.2rem' },
  countersRow: { display: 'flex', gap: '2.5rem', marginTop: '0.75rem' },
  counterBox: { display: 'flex', flexDirection: 'column', gap: '0.2rem' },
  counterNum: { fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' },
  counterLabel: { fontSize: '0.85rem', color: 'var(--text-muted)' },

  activityStreakGrid: {
    display: 'grid',
    gridTemplateColumns: '7fr 3fr',
    gap: '2rem',
    width: '100%',
    alignItems: 'stretch',
    marginTop: '1.25rem',
  },
  twoColGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2,1fr)',
    gap: '2rem',
    width: '100%',
  },
  statMetricCard: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-container)',
    padding: '1.15rem 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    boxSizing: 'border-box',
  },
  card: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-container)',
    padding: '0.65rem 2.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    boxSizing: 'border-box',
  },
  cardLarge: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-container)',
    padding: '2rem 2.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
    boxSizing: 'border-box',
  },
  titleRow: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  cardTitle: { fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' },
  cardHeaderBetween: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },

  streakOnlyBox: {
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-container)',
    padding: '0.4rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.2rem',
    textAlign: 'center',
    flex: 1,
  },
  streakBigNumber: { fontSize: '4rem', fontWeight: 800, color: 'var(--accent-gold)', lineHeight: 1 },
  streakBigLabel: { fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-secondary)' },
  streakSub: { fontSize: '0.85rem', color: 'var(--text-muted)' },
  streakTotalBox: {
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-element)',
    padding: '0.3rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.1rem',
  },
  streakTotalNum: { fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' },
  streakTotalLabel: { fontSize: '0.82rem', color: 'var(--text-muted)' },

  prList: { display: 'flex', flexDirection: 'column', gap: '0.65rem' },
  prItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    padding: '0.85rem 1.15rem',
    borderRadius: 'var(--radius-element)',
  },
  prName: { fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  prDate: { fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' },
  prWeight: { fontSize: '1rem', fontWeight: 800, color: 'var(--accent-gold)', whiteSpace: 'nowrap' },
  prReps: { fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' },

  seeAllBtn: { color: 'var(--accent-teal)', fontWeight: 600, fontSize: '0.9rem' },
  emptyCardText: { color: 'var(--text-muted)', fontSize: '0.95rem' },

  workoutFeedList: { display: 'flex', flexDirection: 'column', gap: '0.65rem' },
  workoutFeedItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    padding: '1rem 1.35rem',
    borderRadius: 'var(--radius-container)',
    cursor: 'pointer',
  },
  feedLeft: { display: 'flex', alignItems: 'center', gap: '1rem' },
  feedIconBadge: {
    width: '40px',
    height: '40px',
    borderRadius: 'var(--radius-control)',
    backgroundColor: 'rgba(192,138,90,0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  feedTitle: { fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'capitalize' },
  feedSub: { fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.15rem' },

  routinesGrid: { display: 'flex', flexDirection: 'column', gap: '0.65rem' },
  routineCardMini: {
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    padding: '1rem 1.25rem',
    borderRadius: 'var(--radius-control)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  routineMiniTitle: { fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' },
  routineMiniSub: { fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.15rem' },
  startMiniBtn: {
    backgroundColor: 'var(--accent-teal)',
    color: 'var(--bg-color)',
    padding: '0.45rem 0.9rem',
    borderRadius: 'var(--radius-full)',
    fontWeight: 700,
    fontSize: '0.82rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
    flexShrink: 0,
  },
};
