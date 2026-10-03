import { useState, useEffect, useCallback } from 'react';

export const useWorkoutTimer = (startedAt: string) => {
  const getElapsed = useCallback(() => {
    const startMs = new Date(startedAt).getTime();
    return Math.max(0, Math.floor((Date.now() - startMs) / 1000));
  }, [startedAt]);

  const [elapsedSeconds, setElapsedSeconds] = useState<number>(getElapsed);

  useEffect(() => {
    setElapsedSeconds(getElapsed());
    const interval = setInterval(() => {
      setElapsedSeconds(getElapsed());
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt, getElapsed]);

  const formatElapsed = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return { elapsedSeconds, formattedElapsed: formatElapsed(elapsedSeconds) };
};
