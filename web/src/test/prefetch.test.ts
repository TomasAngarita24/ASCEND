import { describe, it, expect, vi, afterEach } from 'vitest';
import { prefetchOnIdle } from '../utils/prefetch';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('prefetchOnIdle', () => {
  it('runs the loader when requestIdleCallback is available', () => {
    const load = vi.fn().mockResolvedValue(undefined);
    const idle = vi.fn();
    (window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number }).requestIdleCallback = idle;

    prefetchOnIdle(load);

    expect(idle).toHaveBeenCalledTimes(1);
    const cb = idle.mock.calls[0][0] as () => void;
    cb();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('falls back to a timeout when requestIdleCallback is unavailable', () => {
    const load = vi.fn().mockResolvedValue(undefined);
    vi.useFakeTimers();
    const original = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    delete (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;

    prefetchOnIdle(load, 5000);
    expect(load).not.toHaveBeenCalled();
    vi.advanceTimersByTime(5000);
    expect(load).toHaveBeenCalledTimes(1);

    (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback = original;
    vi.useRealTimers();
  });

  it('swallows loader errors', () => {
    const load = vi.fn().mockRejectedValue(new Error('boom'));
    const idle = vi.fn((cb: () => void) => cb());
    (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback = idle;

    expect(() => prefetchOnIdle(load)).not.toThrow();
  });
});