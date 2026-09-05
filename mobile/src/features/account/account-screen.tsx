import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AnimatedPressable from '../../components/AnimatedPressable';
import { colors, spacing, typography } from '../../theme';
import type { Tokens } from '../auth/auth.types';
import { HistoryService, type WorkoutHistoryEntry } from '../history/history.service';

interface AccountScreenProps {
  historyService?: HistoryService;
  onLogout: () => Promise<void>;
  onViewBodyMeasurements: () => void;
  onViewCalendar: () => void;
  onViewExercises: () => void;
  onViewStatistics: () => void;
  onViewWorkoutHistory?: () => void;
  tokens?: Tokens;
  userEmail: string;
}

type MetricType = 'Duración' | 'Volumen' | 'Repeticiones';

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString();
}

function formatDuration(durationSeconds: number | null): string {
  if (durationSeconds === null) {
    return 'Sin duración';
  }
  const minutes = Math.floor(durationSeconds / 60);
  return `${minutes} min`;
}

export function AccountScreen({
  historyService,
  onLogout,
  onViewBodyMeasurements,
  onViewCalendar,
  onViewExercises,
  onViewStatistics,
  onViewWorkoutHistory,
  tokens,
  userEmail,
}: AccountScreenProps): React.JSX.Element {
  const [activeMetric, setActiveMetric] = useState<MetricType>('Duración');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [completedWorkouts, setCompletedWorkouts] = useState<WorkoutHistoryEntry[]>([]);
  const [isLoadingWorkouts, setIsLoadingWorkouts] = useState(false);

  const username = userEmail.includes('@') ? userEmail.split('@')[0] : userEmail;

  useEffect(() => {
    if (historyService && tokens) {
      setIsLoadingWorkouts(true);
      historyService.list(tokens)
        .then((result) => {
          setCompletedWorkouts(result.workouts);
        })
        .catch(() => {
          // Ignore error silently for profile preview
        })
        .finally(() => setIsLoadingWorkouts(false));
    }
  }, [historyService, tokens]);

  const logout = async () => {
    setIsLoggingOut(true);
    setError(null);
    try {
      await onLogout();
    } catch {
      setError('No fue posible cerrar sesión.');
      setIsLoggingOut(false);
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <Text style={styles.topBarUsername}>{username}</Text>
        <View style={styles.topBarIcons}>
          <AnimatedPressable style={styles.iconBtn}>
            <MaterialIcons name="edit" size={20} color={colors.text} />
          </AnimatedPressable>
          <AnimatedPressable style={styles.iconBtn}>
            <MaterialIcons name="share" size={20} color={colors.text} />
          </AnimatedPressable>
          <AnimatedPressable onPress={() => setIsSettingsOpen(true)} style={styles.iconBtn}>
            <MaterialIcons name="settings" size={20} color={colors.text} />
          </AnimatedPressable>
        </View>
      </View>

      {/* User Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatarPlaceholder}>
            <MaterialIcons name="person" size={44} color={colors.muted} />
          </View>
        </View>
        <View style={styles.profileMeta}>
          <Text style={styles.profileUsername}>{username}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Entrenamientos</Text>
              <Text style={styles.statValue}>{completedWorkouts.length}</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Seguidores</Text>
              <Text style={styles.statValue}>0</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Siguiendo</Text>
              <Text style={styles.statValue}>0</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Analytics Chart Preview Card */}
      <View style={styles.chartCard}>
        <View style={styles.chartPlaceholder}>
          <MaterialIcons name="insert-chart-outlined" size={48} color={colors.muted} />
          <Text style={styles.chartPlaceholderText}>Sin datos aún</Text>
        </View>
      </View>

      {/* Metric Filter Tabs */}
      <View style={styles.metricsRow}>
        {(['Duración', 'Volumen', 'Repeticiones'] as MetricType[]).map((metric) => {
          const isActive = activeMetric === metric;
          return (
            <AnimatedPressable
              key={metric}
              onPress={() => setActiveMetric(metric)}
              style={[styles.metricPill, isActive && styles.metricPillActive]}
            >
              <Text style={[styles.metricText, isActive && styles.metricTextActive]}>
                {metric}
              </Text>
            </AnimatedPressable>
          );
        })}
      </View>

      {/* Dashboard Section - 100% Symmetrical Grid */}
      <Text style={styles.sectionHeader}>Dashboard</Text>
      <View style={styles.dashboardGrid}>
        <View style={styles.dashboardRow}>
          <AnimatedPressable onPress={onViewStatistics} style={styles.dashboardCard}>
            <MaterialIcons name="show-chart" size={24} color={colors.text} />
            <Text style={styles.dashboardCardText}>Estadísticas</Text>
          </AnimatedPressable>

          <AnimatedPressable onPress={onViewExercises} style={styles.dashboardCard}>
            <MaterialIcons name="fitness-center" size={24} color={colors.text} />
            <Text style={styles.dashboardCardText}>Ejercicios</Text>
          </AnimatedPressable>
        </View>

        <View style={styles.dashboardRow}>
          <AnimatedPressable onPress={onViewBodyMeasurements} style={styles.dashboardCard}>
            <MaterialIcons name="accessibility" size={24} color={colors.text} />
            <Text style={styles.dashboardCardText}>Medidas</Text>
          </AnimatedPressable>

          <AnimatedPressable onPress={onViewCalendar} style={styles.dashboardCard}>
            <MaterialIcons name="calendar-today" size={24} color={colors.text} />
            <Text style={styles.dashboardCardText}>Calendario</Text>
          </AnimatedPressable>
        </View>
      </View>

      {/* Workouts Section - Showing Real Workouts History */}
      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionHeader}>Entrenamientos</Text>
        {onViewWorkoutHistory && completedWorkouts.length > 0 && (
          <AnimatedPressable onPress={onViewWorkoutHistory}>
            <Text style={styles.seeAllText}>Ver todos</Text>
          </AnimatedPressable>
        )}
      </View>

      {isLoadingWorkouts && <ActivityIndicator color={colors.accentAlt} style={{ marginVertical: 10 }} />}

      {!isLoadingWorkouts && completedWorkouts.length === 0 && (
        <View style={styles.workoutsCard}>
          <MaterialIcons name="fitness-center" size={44} color={colors.muted} />
          <Text style={styles.workoutsEmptyText}>Sin entrenamientos completados aún</Text>
        </View>
      )}

      {!isLoadingWorkouts && completedWorkouts.length > 0 && (
        <View style={styles.workoutsList}>
          {completedWorkouts.slice(0, 3).map((item) => (
            <AnimatedPressable
              key={item.id}
              onPress={onViewWorkoutHistory}
              style={styles.workoutItemCard}
            >
              <View style={styles.workoutItemHeader}>
                <Text style={styles.workoutItemTitle}>{formatDate(item.startedAt)}</Text>
                <Text style={styles.workoutItemBadge}>{formatDuration(item.durationSeconds)}</Text>
              </View>
              <Text style={styles.workoutItemMeta}>
                {item.exerciseCount} ejercicios · {item.setsCompleted} series · {item.totalVolume} kg
              </Text>
            </AnimatedPressable>
          ))}
        </View>
      )}

      {/* Settings Modal */}
      <Modal
        animationType="slide"
        onRequestClose={() => setIsSettingsOpen(false)}
        transparent
        visible={isSettingsOpen}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajustes de cuenta</Text>
              <AnimatedPressable onPress={() => setIsSettingsOpen(false)}>
                <MaterialIcons name="close" size={24} color={colors.muted} />
              </AnimatedPressable>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>Correo electrónico</Text>
              <Text style={styles.modalValue}>{userEmail}</Text>

              {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}

              <AnimatedPressable
                disabled={isLoggingOut}
                onPress={() => { void logout(); }}
                style={styles.logoutBtn}
              >
                <MaterialIcons name="logout" size={20} color={colors.danger} />
                <Text style={styles.logoutBtnText}>
                  {isLoggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
                </Text>
              </AnimatedPressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  avatarContainer: {
    marginRight: spacing(1.5),
  },
  avatarPlaceholder: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 40,
    borderWidth: 1,
    height: 80,
    justifyContent: 'center',
    width: 80,
  },
  chartCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    borderWidth: 1,
    height: 170,
    justifyContent: 'center',
    marginVertical: spacing(1),
  },
  chartPlaceholder: {
    alignItems: 'center',
    gap: spacing(1),
  },
  chartPlaceholderText: {
    color: colors.muted,
    fontSize: typography.body,
    fontWeight: '500',
  },
  container: {
    gap: spacing(1.5),
    padding: spacing(2.5),
    paddingBottom: spacing(4),
  },
  dashboardCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: spacing(1.25),
    height: 52,
    justifyContent: 'center',
    paddingHorizontal: spacing(1.5),
  },
  dashboardCardText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  dashboardGrid: {
    gap: spacing(1.25),
    width: '100%',
  },
  dashboardRow: {
    flexDirection: 'row',
    gap: spacing(1.25),
    width: '100%',
  },
  error: {
    color: colors.danger,
    marginTop: spacing(1),
  },
  iconBtn: {
    padding: spacing(0.5),
  },
  logoutBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing(1),
    justifyContent: 'center',
    marginTop: spacing(2),
    paddingVertical: spacing(1.5),
  },
  logoutBtnText: {
    color: colors.danger,
    fontSize: typography.body,
    fontWeight: '700',
  },
  metricPill: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(0.75),
  },
  metricPillActive: {
    backgroundColor: colors.accentAlt,
    borderColor: colors.accentAlt,
  },
  metricText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  metricTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  metricsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing(1.25),
    marginBottom: spacing(1),
  },
  modalBody: {
    gap: spacing(0.75),
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    borderWidth: 1,
    padding: spacing(2.5),
    width: '90%',
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing(2),
  },
  modalLabel: {
    color: colors.muted,
    fontSize: typography.caption,
  },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    flex: 1,
    justifyContent: 'center',
  },
  modalTitle: {
    color: colors.text,
    fontSize: typography.h2,
    fontWeight: '700',
  },
  modalValue: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '600',
  },
  profileHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: spacing(1),
    marginTop: spacing(0.5),
  },
  profileMeta: {
    flex: 1,
    gap: spacing(0.5),
  },
  profileUsername: {
    color: colors.text,
    fontSize: typography.h2,
    fontWeight: '700',
  },
  scroll: {
    backgroundColor: colors.background,
    flex: 1,
  },
  sectionHeader: {
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: '700',
    marginTop: spacing(1),
  },
  sectionTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing(1),
  },
  seeAllText: {
    color: colors.accentAlt,
    fontSize: typography.body,
    fontWeight: '600',
  },
  statCol: {
    alignItems: 'flex-start',
  },
  statLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '500',
  },
  statValue: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing(2.5),
    marginTop: spacing(0.5),
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing(0.5),
  },
  topBarIcons: {
    flexDirection: 'row',
    gap: spacing(1.5),
  },
  topBarUsername: {
    color: colors.text,
    fontSize: typography.h2,
    fontWeight: '700',
  },
  workoutItemBadge: {
    color: colors.accentAlt,
    fontSize: typography.caption,
    fontWeight: '600',
  },
  workoutItemCard: {
    backgroundColor: colors.surface,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    gap: spacing(0.5),
    padding: spacing(1.75),
  },
  workoutItemHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  workoutItemMeta: {
    color: colors.muted,
    fontSize: typography.caption,
  },
  workoutItemTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '700',
  },
  workoutsCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    borderWidth: 1,
    gap: spacing(1),
    height: 120,
    justifyContent: 'center',
    marginVertical: spacing(0.5),
  },
  workoutsEmptyText: {
    color: colors.muted,
    fontSize: typography.body,
    fontWeight: '500',
  },
  workoutsList: {
    gap: spacing(1),
    marginVertical: spacing(0.5),
  },
});
