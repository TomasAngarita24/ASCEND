import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { api } from '../api/api';
import { soundManager } from '../utils/audio';

export const useRestTimer = (soundEnabled: boolean) => {
  const [restSecondsLeft, setRestSecondsLeft] = useState<number | null>(null);
  const [isRestTimerActive, setIsRestTimerActive] = useState(false);
  const [isRestPaused, setIsRestPaused] = useState(false);
  const restTargetMsRef = useRef<number | null>(null);
  const restPausedMsRef = useRef<number>(0);

  const cancelRestPushRemote = useCallback(() => {
    void api.cancelRestPush().catch(() => {});
  }, []);

  useEffect(() => {
    if (!isRestTimerActive || isRestPaused || restTargetMsRef.current === null) return;
    const target = restTargetMsRef.current;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((target - Date.now()) / 1000));
      setRestSecondsLeft(remaining);
      if (remaining <= 0) {
        restTargetMsRef.current = null;
        setRestSecondsLeft(null);
        setIsRestTimerActive(false);
        cancelRestPushRemote();
        if (soundEnabled) {
          soundManager.playRestFinishedChime();
        }
        toast.info('⏰ ¡Tiempo de descanso completado! A por la siguiente serie.');
      }
    };
    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [isRestTimerActive, isRestPaused, soundEnabled, cancelRestPushRemote]);

  // Cancel a pending rest-end push if unmounted mid-rest
  useEffect(() => () => cancelRestPushRemote(), [cancelRestPushRemote]);

  const startRestTimer = useCallback((seconds: number = 90) => {
    restTargetMsRef.current = Date.now() + seconds * 1000;
    setRestSecondsLeft(seconds);
    setIsRestTimerActive(true);
    setIsRestPaused(false);
    restPausedMsRef.current = 0;
    void api.scheduleRestPush(seconds).catch(() => {});
  }, []);

  const pauseRestTimer = useCallback(() => {
    const target = restTargetMsRef.current ?? Date.now();
    restPausedMsRef.current = Math.max(0, target - Date.now());
    setIsRestPaused(true);
    cancelRestPushRemote();
  }, [cancelRestPushRemote]);

  const resumeRestTimer = useCallback(() => {
    const remainingMs = Math.max(0, restPausedMsRef.current);
    restTargetMsRef.current = Date.now() + remainingMs;
    const next = Math.max(1, Math.ceil(remainingMs / 1000));
    setRestSecondsLeft(next);
    setIsRestPaused(false);
    void api.scheduleRestPush(next).catch(() => {});
  }, []);

  const add30s = useCallback(() => {
    restTargetMsRef.current = (restTargetMsRef.current ?? Date.now()) + 30_000;
    setRestSecondsLeft((prev) => {
      const next = (prev ?? 0) + 30;
      void api.scheduleRestPush(next).catch(() => {});
      return next;
    });
  }, []);

  const dismissRestTimer = useCallback(() => {
    restTargetMsRef.current = null;
    setRestSecondsLeft(null);
    setIsRestTimerActive(false);
    setIsRestPaused(false);
    cancelRestPushRemote();
  }, [cancelRestPushRemote]);

  return {
    restSecondsLeft,
    isRestTimerActive,
    isRestPaused,
    startRestTimer,
    pauseRestTimer,
    resumeRestTimer,
    add30s,
    dismissRestTimer,
  };
};
