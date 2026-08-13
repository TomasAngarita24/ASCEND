import React from 'react';
import { StyleSheet, View } from 'react-native';
import BottomTabBar, { type MainTab } from '../../components/BottomTabBar';
import { colors } from '../../theme';
import { AccountScreen } from '../account/account-screen';
import type { Tokens } from '../auth/auth.types';
import { HistoryService } from '../history/history.service';
import { HomeScreen } from '../home/home-screen';
import { RoutinePicker } from '../routine/routine-picker';
import { RoutineService, type MobileWorkout } from '../routine/routine.service';

interface MainTabShellProps {
  activeTab: MainTab;
  historyService?: HistoryService;
  onEditRoutine: (routineId: string) => void;
  onExploreRoutines: () => void;
  onLogout: () => Promise<void>;
  onStartIndependentWorkout: () => Promise<void>;
  onStarted: (workout: MobileWorkout, tokens: Tokens) => void;
  onTabChange: (tab: MainTab) => void;
  onTokensChange: (tokens: Tokens) => void;
  onViewBodyMeasurements: () => void;
  onViewCalendar: () => void;
  onViewExercises: () => void;
  onViewHistory?: () => void;
  onViewStatistics: () => void;
  routineService: RoutineService;
  tokens: Tokens;
  userEmail: string;
}

function renderTabContent(
  activeTab: MainTab,
  props: Omit<MainTabShellProps, 'activeTab' | 'onTabChange'>,
): React.JSX.Element {
  switch (activeTab) {
    case 'home':
      return <HomeScreen />;
    case 'workouts':
      return (
        <RoutinePicker
          onEditRoutine={props.onEditRoutine}
          onExploreRoutines={props.onExploreRoutines}
          onStartIndependentWorkout={props.onStartIndependentWorkout}
          onStarted={props.onStarted}
          onTokensChange={props.onTokensChange}
          onViewHistory={props.onViewHistory}
          routineService={props.routineService}
          tokens={props.tokens}
        />
      );
    case 'profile':
      return (
        <AccountScreen
          historyService={props.historyService}
          onLogout={props.onLogout}
          onViewBodyMeasurements={props.onViewBodyMeasurements}
          onViewCalendar={props.onViewCalendar}
          onViewExercises={props.onViewExercises}
          onViewStatistics={props.onViewStatistics}
          onViewWorkoutHistory={props.onViewHistory}
          tokens={props.tokens}
          userEmail={props.userEmail}
        />
      );
  }
}

export function MainTabShell({
  activeTab,
  historyService,
  onEditRoutine,
  onExploreRoutines,
  onLogout,
  onStartIndependentWorkout,
  onStarted,
  onTabChange,
  onTokensChange,
  onViewBodyMeasurements,
  onViewCalendar,
  onViewExercises,
  onViewHistory,
  onViewStatistics,
  routineService,
  tokens,
  userEmail,
}: MainTabShellProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {renderTabContent(activeTab, {
          historyService,
          onEditRoutine,
          onExploreRoutines,
          onLogout,
          onStartIndependentWorkout,
          onStarted,
          onTokensChange,
          onViewBodyMeasurements,
          onViewCalendar,
          onViewExercises,
          onViewHistory,
          onViewStatistics,
          routineService,
          tokens,
          userEmail,
        })}
      </View>
      <BottomTabBar activeTab={activeTab} onTabChange={onTabChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
