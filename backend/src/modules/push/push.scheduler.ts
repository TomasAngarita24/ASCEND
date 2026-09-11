import { prisma } from '../../database/prisma';
import { dailyReminderMessage, restEndMessage, sendPushToUser } from './push.service';

const restTimers = new Map<string, NodeJS.Timeout>();

/** One-shot "rest finished" push per user; scheduling again replaces the old one. */
export function scheduleRestPush(userId: string, seconds: number): void {
  cancelRestPush(userId);
  const timer = setTimeout(() => {
    restTimers.delete(userId);
    void sendPushToUser(userId, {
      ...restEndMessage,
      title: '⏰ Descanso terminado',
      body: '¡A por la siguiente serie!',
    });
  }, seconds * 1000);
  timer.unref();
  restTimers.set(userId, timer);
}

export function cancelRestPush(userId: string): void {
  const timer = restTimers.get(userId);
  if (timer) {
    clearTimeout(timer);
    restTimers.delete(userId);
  }
}

/**
 * UTC milliseconds of today's reminder for the user's local offset, or null
 * when the moment has already passed by more than the grace window (the tick
 * runs every 60 seconds, so a 5 minute window guarantees delivery).
 */
export function computeReminderDue(
  nowMs: number,
  hour: number,
  minute: number,
  tzOffsetMin: number,
): number | null {
  const localNowMs = nowMs + tzOffsetMin * 60_000;
  const localDayStartMs = Math.floor(localNowMs / 86_400_000) * 86_400_000;
  const dueLocalMs = localDayStartMs + (hour * 60 + minute) * 60_000;
  const dueUtcMs = dueLocalMs - tzOffsetMin * 60_000;

  if (nowMs < dueUtcMs || nowMs - dueUtcMs >= 5 * 60_000) {
    return null;
  }

  return dueUtcMs;
}

const lastSentDates = new Map<string, string>();

async function tickReminders(now: Date): Promise<void> {
  const users = await prisma.user.findMany({
    where: {
      reminderEnabled: true,
      reminderHour: { not: null },
      reminderMinute: { not: null },
    },
    select: {
      id: true,
      reminderHour: true,
      reminderMinute: true,
      reminderTzOffsetMin: true,
    },
  });

  const nowMs = now.getTime();

  for (const user of users) {
    const dueUtcMs = computeReminderDue(nowMs, user.reminderHour!, user.reminderMinute!, user.reminderTzOffsetMin ?? 0);
    if (dueUtcMs === null) continue;

    const dayKey = new Date(dueUtcMs).toISOString().slice(0, 10);
    if (lastSentDates.get(user.id) === dayKey) continue;

    lastSentDates.set(user.id, dayKey);
    await sendPushToUser(user.id, {
      ...dailyReminderMessage,
      title: '💪 Es hora de entrenar',
      body: 'Tu rutina te espera. ¡Hoy no te la saltes!',
    });
  }
}

export const REMINDER_TICK_MS = 60_000;

let reminderInterval: NodeJS.Timeout | null = null;

/** In-process daily reminder scheduler. Run once from server bootstrap. */
export function startReminderScheduler(): void {
  if (reminderInterval) return;

  void tickReminders(new Date());
  reminderInterval = setInterval(() => {
    void tickReminders(new Date());
  }, REMINDER_TICK_MS);
  reminderInterval.unref();
}

export function stopReminderScheduler(): void {
  if (reminderInterval) {
    clearInterval(reminderInterval);
    reminderInterval = null;
  }
  for (const timer of restTimers.values()) {
    clearTimeout(timer);
  }
  restTimers.clear();
}