import { prisma } from '../../database/prisma';
import { dailyReminderMessage, restEndMessage, sendPushToUser } from './push.service';

/** Persisted "rest finished" push per user; scheduling again replaces the old one. */
export async function scheduleRestPush(userId: string, seconds: number): Promise<void> {
  const scheduledAt = new Date(Date.now() + seconds * 1000);
  await prisma.restPushSchedule.upsert({
    where: { userId },
    update: { scheduledAt },
    create: { userId, scheduledAt },
  });
}

export async function cancelRestPush(userId: string): Promise<void> {
  await prisma.restPushSchedule.deleteMany({ where: { userId } });
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
export const REST_SWEEP_MS = 5_000;

let reminderInterval: NodeJS.Timeout | null = null;
let restSweepInterval: NodeJS.Timeout | null = null;

/** Deliver any due rest-push schedules, claiming each row atomically before sending. */
export async function sweepRestPushes(now: Date = new Date()): Promise<void> {
  const schedules = await prisma.restPushSchedule.findMany({
    where: { scheduledAt: { lte: now } },
    select: { userId: true },
  });

  for (const schedule of schedules) {
    const claimed = await prisma.restPushSchedule.deleteMany({
      where: { userId: schedule.userId, scheduledAt: { lte: now } },
    });
    if (claimed.count === 0) continue;

    await sendPushToUser(schedule.userId, {
      ...restEndMessage,
      title: '⏰ Descanso terminado',
      body: '¡A por la siguiente serie!',
    });
  }
}

/** In-process daily reminder + rest-push schedulers. Run once from server bootstrap. */
export function startReminderScheduler(): void {
  if (reminderInterval) return;

  void tickReminders(new Date());
  reminderInterval = setInterval(() => {
    void tickReminders(new Date());
  }, REMINDER_TICK_MS);
  reminderInterval.unref();

  void sweepRestPushes(new Date());
  restSweepInterval = setInterval(() => {
    void sweepRestPushes(new Date());
  }, REST_SWEEP_MS);
  restSweepInterval.unref();
}

export function stopReminderScheduler(): void {
  if (reminderInterval) {
    clearInterval(reminderInterval);
    reminderInterval = null;
  }
  if (restSweepInterval) {
    clearInterval(restSweepInterval);
    restSweepInterval = null;
  }
}