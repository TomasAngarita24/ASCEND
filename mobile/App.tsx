import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, View } from 'react-native';

import { apiBaseUrl } from './src/config/api';
import { AuthScreen } from './src/features/auth/auth-screen';
import { AuthService } from './src/features/auth/auth.service';
import type { AuthSession } from './src/features/auth/auth.types';
import { TokenStorage } from './src/features/auth/token-storage';
import { ExerciseLibrary } from './src/features/exercise/exercise-library';
import { ExerciseService } from './src/features/exercise/exercise.service';
import { HistoryService } from './src/features/history/history.service';
import { WorkoutDetailScreen } from './src/features/history/workout-detail';
import { WorkoutHistory } from './src/features/history/workout-history';
import { RestTimer } from './src/features/rest-timer/rest-timer';
import { useRestTimer } from './src/features/rest-timer/use-rest-timer';
import {
  ActiveWorkout,
  type ActiveWorkoutData,
} from './src/features/workout/active-workout';
import { WorkoutService, type SetInput, type WorkoutAction } from './src/features/workout/workout.service';
import { ApiClient } from './src/lib/api-client';
import { RoutinePicker } from './src/features/routine/routine-picker';
import { RoutineEditor } from './src/features/routine/routine-editor';
import { RoutineService, type MobileWorkout } from './src/features/routine/routine.service';

const authService = new AuthService(new ApiClient(apiBaseUrl), new TokenStorage());
const routineService = new RoutineService(authService);
const workoutService = new WorkoutService(authService);
const historyService = new HistoryService(authService);
const exerciseService = new ExerciseService(authService);

function toActiveWorkout(workout: MobileWorkout): ActiveWorkoutData {
  return workout;
}

export default function App(): React.JSX.Element {
  const [workout, setWorkout] = useState<ActiveWorkoutData | null>(null);
  const [session, setSession] = useState<AuthSession | null | undefined>(undefined);
  const [selectedHistoryWorkoutId, setSelectedHistoryWorkoutId] = useState<string | null>(null);
  const [isViewingExercises, setIsViewingExercises] = useState(false);
  const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(null);
  const restTimer = useRestTimer({ defaultDurationSeconds: 90 });

  useEffect(() => {
    authService.restoreSession().then(setSession).catch(() => setSession(null));
  }, []);
  const handleSetCompletionChange = useCallback((
    exerciseId: string,
    setId: string,
    isCompleted: boolean,
    restSeconds: number,
  ): Promise<void> => {
    if (!workout || !session) {
      return Promise.resolve();
    }
    return workoutService.updateSetCompletion(
      session.tokens,
      workout.id,
      exerciseId,
      setId,
      isCompleted,
    ).then((result) => {
      setSession((currentSession) => currentSession && { ...currentSession, tokens: result.tokens });
    setWorkout((currentWorkout) => {
      if (!currentWorkout) {
        return currentWorkout;
      }
      return {
        ...currentWorkout,
        exercises: currentWorkout.exercises.map((exercise) => (
          exercise.id !== exerciseId
            ? exercise
            : {
              ...exercise,
              sets: exercise.sets.map((set) => (
                set.id === setId ? { ...set, isCompleted: result.set.isCompleted } : set
              )),
            }
        )),
      };
    });
    if (isCompleted) {
      restTimer.start(restSeconds);
    }
    });
  }, [restTimer, session, workout]);

  const handleRecordSet = useCallback((
    exerciseId: string,
    input: SetInput,
    restSeconds: number,
  ): Promise<void> => {
    if (!workout || !session) {
      return Promise.resolve();
    }
    return workoutService.createSet(session.tokens, workout.id, exerciseId, input).then((result) => {
      setSession((currentSession) => currentSession && { ...currentSession, tokens: result.tokens });
      setWorkout((currentWorkout) => {
        if (!currentWorkout) {
          return currentWorkout;
        }
        return {
          ...currentWorkout,
          exercises: currentWorkout.exercises.map((exercise) => (
            exercise.id !== exerciseId
              ? exercise
              : { ...exercise, sets: [...exercise.sets, result.set] }
          )),
        };
      });
      restTimer.start(restSeconds);
    });
  }, [restTimer, session, workout]);

  const handleWorkoutTransition = useCallback((action: WorkoutAction): Promise<void> => {
    if (!workout || !session) {
      return Promise.resolve();
    }
    return workoutService.transition(session.tokens, workout.id, action).then((result) => {
      setSession((currentSession) => currentSession && { ...currentSession, tokens: result.tokens });
      setWorkout((currentWorkout) => (
        currentWorkout ? { ...currentWorkout, status: result.status } : currentWorkout
      ));
      if (result.status !== 'active') {
        restTimer.pause();
      }
    });
  }, [restTimer, session, workout]);

  if (session === undefined) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (session === null) {
    return (
      <SafeAreaView style={styles.container}>
        <AuthScreen authService={authService} onAuthenticated={setSession} />
      </SafeAreaView>
    );
  }

  if (workout === null) {
    if (selectedRoutineId) {
      return (
        <SafeAreaView style={styles.container}>
          <RoutineEditor
            exerciseService={exerciseService}
            onBack={() => setSelectedRoutineId(null)}
            onTokensChange={(tokens) => {
              setSession((currentSession) => currentSession && { ...currentSession, tokens });
            }}
            routineId={selectedRoutineId}
            routineService={routineService}
            tokens={session.tokens}
          />
        </SafeAreaView>
      );
    }
    if (isViewingExercises) {
      return (
        <SafeAreaView style={styles.container}>
          <ExerciseLibrary
            exerciseService={exerciseService}
            onBack={() => setIsViewingExercises(false)}
            onTokensChange={(tokens) => {
              setSession((currentSession) => currentSession && { ...currentSession, tokens });
            }}
            tokens={session.tokens}
          />
        </SafeAreaView>
      );
    }
    return (
      <SafeAreaView style={styles.container}>
        <RoutinePicker
          onStarted={(startedWorkout, tokens) => {
            setSession((currentSession) => currentSession && { ...currentSession, tokens });
            setWorkout(toActiveWorkout(startedWorkout));
          }}
          onBrowseExercises={() => setIsViewingExercises(true)}
          onEditRoutine={setSelectedRoutineId}
          onTokensChange={(tokens) => {
            setSession((currentSession) => currentSession && { ...currentSession, tokens });
          }}
          routineService={routineService}
          tokens={session.tokens}
        />
      </SafeAreaView>
    );
  }

  if (selectedHistoryWorkoutId) {
    return (
      <SafeAreaView style={styles.container}>
        <WorkoutDetailScreen
          historyService={historyService}
          onBack={() => setSelectedHistoryWorkoutId(null)}
          onTokensChange={(tokens) => {
            setSession((currentSession) => currentSession && { ...currentSession, tokens });
          }}
          tokens={session.tokens}
          workoutId={selectedHistoryWorkoutId}
        />
      </SafeAreaView>
    );
  }

  if (workout.status === 'completed' || workout.status === 'cancelled') {
    return (
      <SafeAreaView style={styles.container}>
        <WorkoutHistory
          historyService={historyService}
          onStartNewWorkout={() => setWorkout(null)}
          onSelectWorkout={setSelectedHistoryWorkoutId}
          onTokensChange={(tokens) => {
            setSession((currentSession) => currentSession && { ...currentSession, tokens });
          }}
          tokens={session.tokens}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ActiveWorkout
        onRecordSet={handleRecordSet}
        onSetCompletionChange={handleSetCompletionChange}
        onTransition={handleWorkoutTransition}
        workout={workout}
      />
      <RestTimer timer={restTimer} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
});
