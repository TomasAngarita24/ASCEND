import { useCallback, useEffect, useState } from 'react';

interface UseRestTimerOptions {
  defaultDurationSeconds: number;
  onComplete?: () => void;
}

export interface RestTimer {
  hasStarted: boolean;
  isRunning: boolean;
  remainingSeconds: number;
  adjust: (seconds: number) => void;
  pause: () => void;
  resume: () => void;
  skip: () => void;
  start: (durationSeconds?: number) => void;
}

function normalizeDuration(seconds: number): number {
  return Math.max(0, Math.round(seconds));
}

export function useRestTimer({
  defaultDurationSeconds,
  onComplete,
}: UseRestTimerOptions): RestTimer {
  const [remainingSeconds, setRemainingSeconds] = useState(
    normalizeDuration(defaultDurationSeconds),
  );
  const [isRunning, setIsRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (!isRunning) {
      return undefined;
    }

    const interval = setInterval(() => {
      setRemainingSeconds((currentSeconds) => {
        if (currentSeconds <= 1) {
          setIsRunning(false);
          onComplete?.();
          return 0;
        }

        return currentSeconds - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, onComplete]);

  const start = useCallback((durationSeconds = defaultDurationSeconds) => {
    setHasStarted(true);
    setRemainingSeconds(normalizeDuration(durationSeconds));
    setIsRunning(durationSeconds > 0);
  }, [defaultDurationSeconds]);

  const pause = useCallback(() => setIsRunning(false), []);
  const resume = useCallback(() => {
    setIsRunning((running) => remainingSeconds > 0 && !running);
  }, [remainingSeconds]);
  const skip = useCallback(() => {
    setIsRunning(false);
    setRemainingSeconds(0);
  }, []);
  const adjust = useCallback((seconds: number) => {
    setRemainingSeconds((currentSeconds) => normalizeDuration(currentSeconds + seconds));
  }, []);

  return { hasStarted, isRunning, remainingSeconds, adjust, pause, resume, skip, start };
}
