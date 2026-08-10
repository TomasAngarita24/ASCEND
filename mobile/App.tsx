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
import { WorkoutExercisePicker } from './src/features/workout/workout-exercise-picker';
import { ApiClient } from './src/lib/api-client';
import { RoutinePicker } from './src/features/routine/routine-picker';
import { RoutineEditor } from './src/features/routine/routine-editor';
import { ProgressDashboardScreen } from './src/features/progress/progress-dashboard';
import { ExerciseProgressionScreen } from './src/features/progress/exercise-progression';
import { ProgressService } from './src/features/progress/progress.service';
import { RoutineService, type MobileWorkout } from './src/features/routine/routine.service';

const authService = new AuthService(new ApiClient(apiBaseUrl), new TokenStorage());
const routineService = new RoutineService(authService);
const workoutService = new WorkoutService(authService);
const historyService = new HistoryService(authService);
const exerciseService = new ExerciseService(authService);
const progressService = new ProgressService(authService);

function toActiveWorkout(workout: MobileWorkout): ActiveWorkoutData {
  return workout;
}

export default function App(): React.JSX.Element {
  const [workout, setWorkout] = useState<ActiveWorkoutData | null>(null);
  const [session, setSession] = useState<AuthSession | null | undefined>(undefined);
  const [selectedHistoryWorkoutId, setSelectedHistoryWorkoutId] = useState<string | null>(null);
  const [isViewingExercises, setIsViewingExercises] = useState(false);
  const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(null);
  const [isViewingProgress, setIsViewingProgress] = useState(false);
  const [isViewingExerciseProgression, setIsViewingExerciseProgression] = useState(false);
  const [isAddingWorkoutExercise, setIsAddingWorkoutExercise] = useState(false);
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

  const handleUpdateSet = useCallback((
    exerciseId: string,
    setId: string,
    input: SetInput,
    restSeconds: number,
  ): Promise<void> => {
    if (!workout || !session) {
      return Promise.resolve();
    }
    const previousSet = workout.exercises
      .find((exercise) => exercise.id === exerciseId)
      ?.sets.find((set) => set.id === setId);
    return workoutService.updateSet(session.tokens, workout.id, exerciseId, setId, input).then((result) => {
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
                  set.id === setId ? result.set : set
                )),
              }
          )),
        };
      });
      if (input.isCompleted && !previousSet?.isCompleted) {
        restTimer.start(restSeconds);
      }
    });
  }, [restTimer, session, workout]);

  const handleLogout = useCallback(async () => {
    if (!session) {
      return;
    }
    await authService.logout(session.tokens);
    setWorkout(null);
    setSelectedHistoryWorkoutId(null);
    setSelectedRoutineId(null);
    setIsViewingExercises(false);
    setIsViewingProgress(false);
    setIsViewingExerciseProgression(false);
    setIsAddingWorkoutExercise(false);
    setSession(null);
  }, [session]);

  const handleStartIndependentWorkout = useCallback(async () => {
    if (!session) {
      return;
    }
    const result = await workoutService.start(session.tokens);
    setSession((currentSession) => currentSession && { ...currentSession, tokens: result.tokens });
    setWorkout(toActiveWorkout(result.workout));
  }, [session]);

  const handleAddWorkoutExercise = useCallback(async (exerciseId: string) => {
    if (!session || !workout) {
      return;
    }
    const result = await workoutService.addExercise(session.tokens, workout.id, exerciseId);
    setSession((currentSession) => currentSession && { ...currentSession, tokens: result.tokens });
    setWorkout((currentWorkout) => (
      currentWorkout ? { ...currentWorkout, exercises: [...currentWorkout.exercises, result.exercise] } : currentWorkout
    ));
  }, [session, workout]);

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
    if (isViewingProgress) {
      if (isViewingExerciseProgression) {
        return (
          <SafeAreaView style={styles.container}>
            <ExerciseProgressionScreen
              exerciseService={exerciseService}
              onBack={() => setIsViewingExerciseProgression(false)}
              onTokensChange={(tokens) => {
                setSession((currentSession) => currentSession && { ...currentSession, tokens });
              }}
              progressService={progressService}
              tokens={session.tokens}
            />
          </SafeAreaView>
        );
      }
      return (
        <SafeAreaView style={styles.container}>
          <ProgressDashboardScreen
            onBack={() => setIsViewingProgress(false)}
            onViewExerciseProgression={() => setIsViewingExerciseProgression(true)}
            onTokensChange={(tokens) => {
              setSession((currentSession) => currentSession && { ...currentSession, tokens });
            }}
            progressService={progressService}
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
          onLogout={handleLogout}
          onStartIndependentWorkout={handleStartIndependentWorkout}
          onViewProgress={() => setIsViewingProgress(true)}
          onTokensChange={(tokens) => {
            setSession((currentSession) => currentSession && { ...currentSession, tokens });
          }}
          routineService={routineService}
          tokens={session.tokens}
          userEmail={session.user.email}
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

  if (isAddingWorkoutExercise) {
    return (
      <SafeAreaView style={styles.container}>
        <WorkoutExercisePicker
          exerciseService={exerciseService}
          onAdd={handleAddWorkoutExercise}
          onBack={() => setIsAddingWorkoutExercise(false)}
          onTokensChange={(tokens) => {
            setSession((currentSession) => currentSession && { ...currentSession, tokens });
          }}
          tokens={session.tokens}
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
        onAddExercise={() => setIsAddingWorkoutExercise(true)}
        onSetCompletionChange={handleSetCompletionChange}
        onTransition={handleWorkoutTransition}
        onUpdateSet={handleUpdateSet}
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
