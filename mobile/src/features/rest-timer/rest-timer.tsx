import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AnimatedPressable from '../../components/AnimatedPressable';
import { colors, typography, spacing } from '../../theme';

import type { RestTimer as RestTimerState } from './use-rest-timer';

interface RestTimerProps {
  timer: RestTimerState;
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
    <AnimatedPressable accessibilityRole="button" onPress={onPress} style={styles.button}>
      <Text style={styles.buttonText}>{label}</Text>
    </AnimatedPressable>
  );
}

export function RestTimer({ timer }: RestTimerProps): React.JSX.Element {
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
  const primaryLabel = timer.isRunning ? 'Pausar' : timer.hasStarted && timer.remainingSeconds > 0 ? 'Reanudar' : 'Iniciar';

  return (
    <View accessibilityLabel="Temporizador de descanso" style={styles.container}>
      <Text style={styles.eyebrow}>ASCEND</Text>
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
    gap: spacing(1),
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    minWidth: 80,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1.25),
  },
  buttonText: {
    color: colors.text,
    fontWeight: '700',
  },
  container: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18,
    borderWidth: 1,
    gap: spacing(1.5),
    marginHorizontal: spacing(2.5),
    padding: spacing(2),
  },
  time: {
    color: colors.text,
    fontSize: 42,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  eyebrow: {
    color: colors.accentAlt,
    fontSize: typography.caption,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: '600',
  },
});
