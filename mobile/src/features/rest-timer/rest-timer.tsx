import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useRestTimer } from './use-rest-timer';

interface RestTimerProps {
  defaultDurationSeconds: number;
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

interface TimerButtonProps {
  label: string;
  onPress: () => void;
}

function TimerButton({ label, onPress }: TimerButtonProps): React.JSX.Element {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.button}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

export function RestTimer({ defaultDurationSeconds }: RestTimerProps): React.JSX.Element {
  const timer = useRestTimer({ defaultDurationSeconds });
  const primaryAction = () => {
    if (timer.isRunning) {
      timer.pause();
      return;
    }
    if (timer.remainingSeconds > 0) {
      timer.resume();
      return;
    }
    timer.start();
  };
  const primaryLabel = timer.isRunning ? 'Pausar' : timer.remainingSeconds > 0 ? 'Reanudar' : 'Iniciar';

  return (
    <View accessibilityLabel="Temporizador de descanso" style={styles.container}>
      <Text style={styles.title}>Descanso</Text>
      <Text style={styles.time}>{formatTime(timer.remainingSeconds)}</Text>
      <View style={styles.actions}>
        <TimerButton label="−15 s" onPress={() => timer.adjust(-15)} />
        <TimerButton label={primaryLabel} onPress={primaryAction} />
        <TimerButton label="+15 s" onPress={() => timer.adjust(15)} />
      </View>
      <TimerButton label="Omitir" onPress={timer.skip} />
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderRadius: 8,
    minWidth: 80,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  container: {
    alignItems: 'center',
    gap: 12,
  },
  time: {
    fontSize: 42,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
});
