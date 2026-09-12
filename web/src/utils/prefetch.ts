/**
 * Runs a deferred task once the browser is idle (or after a timeout fallback),
 * so heavy module imports don't compete with the initial paint/interaction.
 */
export function prefetchOnIdle(loader: () => Promise<unknown>, fallbackMs = 3000): void {
  if (typeof window === 'undefined') return;
  const callback = () => {
    void loader().catch(() => {});
  };
  const idle = (window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number;
  }).requestIdleCallback;
  if (idle) {
    idle(callback, { timeout: 6000 });
  } else {
    window.setTimeout(callback, fallbackMs);
  }
}