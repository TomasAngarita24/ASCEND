import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { SetInput, SetType, WorkoutAction } from './workout.service';

export interface ActiveWorkoutSet {
  id: string;
  isCompleted: boolean;
  repetitions: number;
  rpe: number;
  setType: SetType;
  weight: number;
}

export interface ActiveWorkoutExercise {
  id: string;
  name: string;
  restSeconds: number;
  sets: ActiveWorkoutSet[];
}

export interface ActiveWorkoutData {
  id: string;
  exercises: ActiveWorkoutExercise[];
  name: string;
  status: string;
}

interface ActiveWorkoutProps {
  workout: ActiveWorkoutData;
  onRecordSet: (
    exerciseId: string,
    input: SetInput,
    restSeconds: number,
  ) => Promise<void>;
  onSetCompletionChange: (
    exerciseId: string,
    setId: string,
    isCompleted: boolean,
    restSeconds: number,
  ) => Promise<void>;
  onTransition: (action: WorkoutAction) => Promise<void>;
}

const setTypes: SetType[] = ['normal', 'warmup', 'drop_set', 'failure'];

function getNextSetType(currentType: SetType): SetType {
  return setTypes[(setTypes.indexOf(currentType) + 1) % setTypes.length];
}

interface SetFormProps {
  exerciseId: string;
  onRecord: (input: SetInput) => Promise<void>;
}

interface WorkoutControlButtonProps {
  disabled: boolean;
  label: string;
  onPress: () => void;
}

function WorkoutControlButton({
  disabled,
  label,
  onPress,
}: WorkoutControlButtonProps): React.JSX.Element {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={styles.controlButton}>
      <Text style={styles.controlButtonText}>{label}</Text>
    </Pressable>
  );
}

function SetForm({ exerciseId, onRecord }: SetFormProps): React.JSX.Element {
  const [weight, setWeight] = useState('');
  const [repetitions, setRepetitions] = useState('');
  const [rpe, setRpe] = useState('');
  const [setType, setSetType] = useState<SetType>('normal');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const record = async () => {
    const parsedWeight = Number(weight);
    const parsedRepetitions = Number(repetitions);
    const parsedRpe = Number(rpe);
    if (!Number.isFinite(parsedWeight) || parsedWeight < 0 || !Number.isInteger(parsedRepetitions) || parsedRepetitions < 1 || !Number.isFinite(parsedRpe) || parsedRpe < 0 || parsedRpe > 10) {
      setError('Ingresa peso, repeticiones y RPE válidos.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await onRecord({
        isCompleted: true,
        repetitions: parsedRepetitions,
        rpe: parsedRpe,
        setType,
        weight: parsedWeight,
      });
      setWeight('');
      setRepetitions('');
      setRpe('');
      setSetType('normal');
    } catch {
      setError('No fue posible guardar la serie.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.form}>
      <TextInput keyboardType="decimal-pad" onChangeText={setWeight} placeholder="Peso" style={styles.input} value={weight} />
      <TextInput keyboardType="number-pad" onChangeText={setRepetitions} placeholder="Reps" style={styles.input} value={repetitions} />
      <TextInput keyboardType="decimal-pad" onChangeText={setRpe} placeholder="RPE" style={styles.input} value={rpe} />
      <Pressable accessibilityRole="button" onPress={() => setSetType(getNextSetType(setType))} style={styles.typeButton}>
        <Text>{setType}</Text>
      </Pressable>
      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <Pressable accessibilityRole="button" disabled={isSaving} onPress={() => { void record(); }} style={styles.recordButton}>
        <Text style={styles.recordButtonText}>{isSaving ? 'Guardando...' : `Registrar serie ${exerciseId}`}</Text>
      </Pressable>
    </View>
  );
}

export function ActiveWorkout({
  workout,
  onRecordSet,
  onSetCompletionChange,
  onTransition,
}: ActiveWorkoutProps): React.JSX.Element {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const canRecord = workout.status === 'active';
  const transition = async (action: WorkoutAction) => {
    setIsTransitioning(true);
    setTransitionError(null);
    try {
      await onTransition(action);
    } catch {
      setTransitionError('No fue posible actualizar el entrenamiento.');
    } finally {
      setIsTransitioning(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{workout.name}</Text>
      <Text style={styles.status}>Estado: {workout.status}</Text>
      <View style={styles.controls}>
        {workout.status === 'active' && <WorkoutControlButton disabled={isTransitioning} label="Pausar" onPress={() => { void transition('pause'); }} />}
        {workout.status === 'paused' && <WorkoutControlButton disabled={isTransitioning} label="Reanudar" onPress={() => { void transition('resume'); }} />}
        {['active', 'paused'].includes(workout.status) && <WorkoutControlButton disabled={isTransitioning} label="Completar" onPress={() => { void transition('complete'); }} />}
        {['active', 'paused'].includes(workout.status) && <WorkoutControlButton disabled={isTransitioning} label="Cancelar" onPress={() => { void transition('cancel'); }} />}
      </View>
      {transitionError && <Text accessibilityRole="alert" style={styles.error}>{transitionError}</Text>}
      {workout.exercises.map((exercise) => (
        <View key={exercise.id} style={styles.exercise}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          <Text style={styles.restTime}>Descanso: {exercise.restSeconds} s</Text>
          {exercise.sets.map((set, index) => (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: set.isCompleted }}
              disabled={!canRecord}
              key={set.id}
              onPress={() => { void onSetCompletionChange(exercise.id, set.id, !set.isCompleted, exercise.restSeconds); }}
              style={[styles.set, set.isCompleted && styles.completedSet]}
            >
              <Text style={styles.setText}>Serie {index + 1}</Text>
              <Text style={styles.setText}>{set.weight} kg × {set.repetitions}</Text>
              <Text style={styles.setText}>RPE {set.rpe} · {set.setType}</Text>
              <Text style={styles.setText}>{set.isCompleted ? 'Completada' : 'Pendiente'}</Text>
            </Pressable>
          ))}
          {canRecord && <SetForm exerciseId={exercise.id} onRecord={(input) => onRecordSet(exercise.id, input, exercise.restSeconds)} />}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  completedSet: {
    backgroundColor: '#14532d',
  },
  controlButton: {
    backgroundColor: '#374151',
    borderRadius: 6,
    padding: 10,
  },
  controlButtonText: {
    color: '#ffffff',
  },
  container: {
    gap: 16,
    padding: 20,
  },
  controls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  exercise: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    gap: 8,
    padding: 16,
  },
  exerciseName: {
    fontSize: 20,
    fontWeight: '700',
  },
  error: {
    color: '#b91c1c',
  },
  form: {
    gap: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#9ca3af',
    borderRadius: 6,
    borderWidth: 1,
    padding: 10,
  },
  recordButton: {
    alignItems: 'center',
    backgroundColor: '#1d4ed8',
    borderRadius: 8,
    padding: 12,
  },
  recordButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  restTime: {
    color: '#4b5563',
  },
  set: {
    backgroundColor: '#1f2937',
    borderRadius: 8,
    gap: 4,
    padding: 12,
  },
  setText: {
    color: '#ffffff',
  },
  status: {
    color: '#4b5563',
    textTransform: 'capitalize',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
  },
  typeButton: {
    alignItems: 'center',
    backgroundColor: '#d1d5db',
    borderRadius: 6,
    padding: 10,
  },
});
