import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWorkoutTimer } from '../hooks/useWorkoutTimer';

describe('useWorkoutTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calculates elapsed seconds from startedAt timestamp and formats correctly', () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const startedAt = new Date(now - 65 * 1000).toISOString(); // 1m 5s ago

    const { result } = renderHook(() => useWorkoutTimer(startedAt));

    expect(result.current.elapsedSeconds).toBe(65);
    expect(result.current.formattedElapsed).toBe('01:05');

    // Fast-forward 10 seconds
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(result.current.elapsedSeconds).toBe(75);
    expect(result.current.formattedElapsed).toBe('01:15');
  });

  it('formats hours correctly when elapsed time exceeds 1 hour', () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const startedAt = new Date(now - (3600 + 120 + 5) * 1000).toISOString(); // 1h 2m 5s ago

    const { result } = renderHook(() => useWorkoutTimer(startedAt));

    expect(result.current.elapsedSeconds).toBe(3725);
    expect(result.current.formattedElapsed).toBe('1:02:05');
  });
});
