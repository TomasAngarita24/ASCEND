/**
 * Offline Sync Queue manager for ASCEND.
 * Enqueues failed network mutations when offline, and replays them
 * silently when the network connection is restored.
 *
 * Authentication is handled entirely by httpOnly session cookies, which the
 * browser sends automatically on replay — no token is ever stored here.
 */

export interface QueuedAction {
  id: string;
  timestamp: number;
  url: string;
  method: string;
  body?: unknown;
  description: string;
}

const QUEUE_STORAGE_KEY = 'ascend_offline_sync_queue';

export class OfflineQueueManager {
  private isSyncing = false;
  private refreshTokenFn: (() => Promise<void>) | null = null;

  /** Optionally provide a function that renews the session cookies before each replay. */
  setTokenRefresher(fn: (() => Promise<void>) | null): void {
    this.refreshTokenFn = fn;
  }

  getQueue(): QueuedAction[] {
    try {
      const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  saveQueue(queue: QueuedAction[]): void {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    } catch {
      // Storage quota exceeded or disabled
    }
  }

  enqueue(action: Omit<QueuedAction, 'id' | 'timestamp'>): void {
    const queue = this.getQueue();
    const method = action.method.toUpperCase();

    // Repeated PATCH/PUT to the same URL must not accumulate: only the latest
    // payload matters (the server applies last-write-wins). Replacing keeps the
    // queue short and avoids replaying stale intermediate values out of order.
    if (method === 'PATCH' || method === 'PUT') {
      const lastIndex = queue.reduce(
        (match, item, index) => (item.method === method && item.url === action.url ? index : match),
        -1,
      );
      if (lastIndex >= 0) {
        queue[lastIndex] = {
          ...queue[lastIndex],
          body: action.body,
          description: action.description,
          timestamp: Date.now(),
        };
        this.saveQueue(queue);
        return;
      }
    }

    const item: QueuedAction = {
      ...action,
      id: `queue_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
    };
    queue.push(item);
    this.saveQueue(queue);
  }

  clear(): void {
    try {
      localStorage.removeItem(QUEUE_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }

  async processQueue(onSuccessNotice?: (count: number, droppedCount: number) => void): Promise<number> {
    if (this.isSyncing || !navigator.onLine) return 0;
    const queue = this.getQueue();
    if (queue.length === 0) return 0;

    this.isSyncing = true;
    let syncedCount = 0;
    let droppedCount = 0;
    const remaining: QueuedAction[] = [];

    for (const item of queue) {
      try {
        if (this.refreshTokenFn) {
          try {
            await this.refreshTokenFn();
          } catch {
            // Cannot renew the session for the replay. Drop the queued mutation
            // instead of silently claiming success, but do not block the queue.
            droppedCount++;
            continue;
          }
        }

        const response = await fetch(item.url, {
          method: item.method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: item.body ? JSON.stringify(item.body) : undefined,
          credentials: 'include',
        });

        if (response.ok || response.status === 404) {
          syncedCount++;
        } else if (response.status >= 500) {
          remaining.push(item);
        } else {
          // 4xx responses will never succeed on retry; drop them instead of
          // silently claiming the change was applied.
          droppedCount++;
        }
      } catch {
        remaining.push(item);
        break; // Network still unavailable
      }
    }

    this.saveQueue(remaining);
    this.isSyncing = false;

    if ((syncedCount > 0 || droppedCount > 0) && onSuccessNotice) {
      onSuccessNotice(syncedCount, droppedCount);
    }

    return syncedCount;
  }
}

export const offlineQueue = new OfflineQueueManager();
