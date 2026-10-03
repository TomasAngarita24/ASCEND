import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRestTimer } from '../hooks/useRestTimer';

vi.mock('../api/api', () => ({
  api: {
    scheduleRestPush: vi.fn().mockResolvedValue(undefined),
    cancelRestPush: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('useRestTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts rest timer and counts down correctly', () => {
    const { result } = renderHook(() => useRestTimer(true));

    expect(result.current.isRestTimerActive).toBe(false);
    expect(result.current.restSecondsLeft).toBeNull();

    act(() => {
      result.current.startRestTimer(90);
    });

    expect(result.current.isRestTimerActive).toBe(true);
    expect(result.current.restSecondsLeft).toBe(90);

    act(() => {
      vi.advanceTimersByTime(30000);
    });

    expect(result.current.restSecondsLeft).toBe(60);
  });

  it('handles pause, resume, add 30s and dismiss actions', () => {
    const { result } = renderHook(() => useRestTimer(true));

    act(() => {
      result.current.startRestTimer(60);
    });

    // Pause
    act(() => {
      result.current.pauseRestTimer();
    });

    expect(result.current.isRestPaused).toBe(true);

    // Resume
    act(() => {
      result.current.resumeRestTimer();
    });

    expect(result.current.isRestPaused).toBe(false);

    // Add 30s
    act(() => {
      result.current.add30s();
    });

    expect(result.current.restSecondsLeft).toBe(90);

    // Dismiss
    act(() => {
      result.current.dismissRestTimer();
    });

    expect(result.current.isRestTimerActive).toBe(false);
    expect(result.current.restSecondsLeft).toBeNull();
  });
});
