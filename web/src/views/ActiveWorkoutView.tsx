import React, { useState } from 'react';
import { Plus, Timer, Trophy, X } from 'lucide-react';
import type { ActiveWorkout } from '../api/api';
import { ConfirmModal } from '../components/ConfirmModal';
import type { WorkoutSummaryData } from '../components/WorkoutSummaryModal';
import { useWorkoutTimer } from '../hooks/useWorkoutTimer';
import { useRestTimer } from '../hooks/useRestTimer';
import { useWorkoutSession } from '../hooks/useWorkoutSession';
import { RestTimerWidget } from '../components/workout/RestTimerWidget';
import { WorkoutExerciseCard } from '../components/workout/WorkoutExerciseCard';
import { ExerciseSelectorModal } from '../components/workout/ExerciseSelectorModal';
import { DELOAD_SETS_THRESHOLD, suggestWorkingWeight } from '../utils/coaching';

interface ActiveWorkoutViewProps {
  workout: ActiveWorkout;
  onFinished: (summary?: WorkoutSummaryData) => void;
}

export const ActiveWorkoutView: React.FC<ActiveWorkoutViewProps> = ({
  workout: initialWorkout,
  onFinished,
}) => {
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Custom Hooks
  const { elapsedSeconds, formattedElapsed } = useWorkoutTimer(initialWorkout.startedAt);
  const {
    restSecondsLeft,
    isRestTimerActive,
    isRestPaused,
    startRestTimer,
    pauseRestTimer,
    resumeRestTimer,
    add30s,
    dismissRestTimer,
  } = useRestTimer(soundEnabled);

  const {
    workout,
    prevPerformanceMap,
    recentSetsByExercise,
    isAddModalOpen,
    setIsAddModalOpen,
    allExercises,
    searchQuery,
    setSearchQuery,
    completing,
    confirmState,
    closeConfirm,
    checkIsPR,
    handleToggleSet,
    handleUpdateSetField,
    handleAddSetToExercise,
    handleDeleteSet,
    handleMoveExercise,
    handleCycleSetType,
    applyCoachingSuggestion,
    handleDeleteExercise,
    handleFinishWorkout,
    handleCancelWorkout,
    openAddModal,
    handleAddExerciseToWorkout,
  } = useWorkoutSession(
    initialWorkout,
    onFinished,
    startRestTimer,
    soundEnabled,
    elapsedSeconds
  );

  return (
    <div style={styles.container}>
      {/* Top Header Card */}
      <div style={styles.topCard}>
        <div>
          <div style={styles.eyebrowWrap}>
            <span style={styles.livePulseDot} />
            <span style={styles.eyebrow}>SESIÓN EN CURSO</span>
          </div>
          <h1 style={styles.workoutName}>Entrenamiento Activo</h1>
        </div>

        <div style={styles.topRight}>
          <div style={styles.timerBadge}>
            <Timer size={18} color="var(--accent-teal)" />
            <span style={styles.timerText}>{formattedElapsed}</span>
          </div>

          <button style={styles.finishBtn} onClick={handleFinishWorkout} disabled={completing}>
            <Trophy size={16} />
            <span>{completing ? 'Guardando...' : 'Finalizar sesión'}</span>
          </button>

          <button
            style={styles.cancelBtn}
            onClick={handleCancelWorkout}
            title="Descartar sesión"
            aria-label="Descartar la sesión actual"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Rest Countdown Bar Widget */}
      <RestTimerWidget
        isRestTimerActive={isRestTimerActive}
        isRestPaused={isRestPaused}
        restSecondsLeft={restSecondsLeft}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((v) => !v)}
        onResume={resumeRestTimer}
        onPause={pauseRestTimer}
        onAdd30s={add30s}
        onDismiss={dismissRestTimer}
      />

      {/* Exercises List */}
      <div style={styles.exercisesList}>
        {workout.exercises.map((exItem, exIdx) => {
          const prevSets = prevPerformanceMap[exItem.exercise.id] || [];
          const coaching = suggestWorkingWeight(prevSets);
          const weeklySets = recentSetsByExercise[exItem.exercise.id] ?? 0;
          const deloadWarning = weeklySets >= DELOAD_SETS_THRESHOLD;

          return (
            <WorkoutExerciseCard
              key={exItem.id}
              exItem={exItem}
              exIdx={exIdx}
              totalExercisesCount={workout.exercises.length}
              prevSets={prevSets}
              coaching={coaching}
              deloadWarning={deloadWarning}
              weeklySets={weeklySets}
              checkIsPR={checkIsPR}
              onMoveExercise={handleMoveExercise}
              onDeleteExercise={handleDeleteExercise}
              onApplyCoachingSuggestion={applyCoachingSuggestion}
              onToggleSet={handleToggleSet}
              onUpdateSetField={handleUpdateSetField}
              onCycleSetType={handleCycleSetType}
              onDeleteSet={handleDeleteSet}
              onAddSetToExercise={handleAddSetToExercise}
            />
          );
        })}
      </div>

      {/* Add Exercise Floating / Bottom Button */}
      <button style={styles.addExerciseMainBtn} onClick={openAddModal}>
        <div style={styles.addIconCircle}>
          <Plus size={18} color="var(--bg-color)" />
        </div>
        <span>Agregar Ejercicio a la Sesión</span>
      </button>

      {/* Add Exercise Modal */}
      <ExerciseSelectorModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        allExercises={allExercises}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSelectExercise={handleAddExerciseToWorkout}
      />

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        variant={confirmState.variant}
        onConfirm={() => {
          confirmState.onConfirm();
          closeConfirm();
        }}
        onCancel={closeConfirm}
      />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: 'clamp(1.5rem, 4vw, 2.5rem) clamp(1rem, 5vw, 3rem)',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.75rem',
    maxWidth: '1100px',
    margin: '0 auto',
    boxSizing: 'border-box',
  },
  topCard: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-container)',
    padding: '1.75rem 2.25rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '1rem',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
  },
  eyebrowWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.45rem',
    marginBottom: '0.2rem',
  },
  livePulseDot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent-teal)',
  },
  eyebrow: {
    fontSize: '0.72rem',
    fontWeight: 800,
    color: 'var(--accent-teal)',
    letterSpacing: '0.08em',
  },
  workoutName: {
    fontSize: '2rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    letterSpacing: '-0.03em',
  },
  topRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  timerBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    padding: '0.65rem 1rem',
    borderRadius: 'var(--radius-container)',
  },
  timerText: {
    fontSize: '1.15rem',
    fontWeight: 800,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-primary)',
  },
  finishBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: 'var(--accent-teal)',
    color: 'var(--bg-color)',
    padding: '0.7rem 1.25rem',
    borderRadius: 'var(--radius-container)',
    fontWeight: 800,
    fontSize: '0.9rem',
  },
  cancelBtn: {
    padding: '0.7rem',
    borderRadius: 'var(--radius-container)',
    backgroundColor: 'rgba(192, 105, 105, 0.12)',
    border: '1px solid rgba(192, 105, 105, 0.25)',
    color: 'var(--danger-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exercisesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  addExerciseMainBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    padding: '1rem',
    borderRadius: 'var(--radius-container)',
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    fontWeight: 800,
    fontSize: '1rem',
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
  },
  addIconCircle: {
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent-teal)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
