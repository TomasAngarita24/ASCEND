import webpush from 'web-push';

import { env } from '../../config/env';
import { prisma } from '../../database/prisma';
import type {
  PushMessage,
  PushSettings,
  PushSubscriptionResponse,
  SaveSubscriptionInput,
  SaveSettingsInput,
} from './push.types';

const VAPID_ENABLED = Boolean(env.vapid.publicKey && env.vapid.privateKey);

if (VAPID_ENABLED) {
  webpush.setVapidDetails(env.vapid.subject, env.vapid.publicKey!, env.vapid.privateKey!);
}

export function isPushEnabled(): boolean {
  return VAPID_ENABLED;
}

function toSubscriptionResponse(
  subscription: { id: string; endpoint: string; createdAt: Date },
): PushSubscriptionResponse {
  return {
    id: subscription.id,
    endpoint: subscription.endpoint,
    createdAt: subscription.createdAt.toISOString(),
  };
}

export async function saveSubscription(
  userId: string,
  input: SaveSubscriptionInput,
): Promise<PushSubscriptionResponse> {
  const existing = await prisma.pushSubscription.findUnique({ where: { endpoint: input.endpoint } });

  if (existing) {
    // A re-subscription after re-login on a shared device may surface the same
    // endpoint under a different user; reparent it and refresh its keys.
    const updated = await prisma.pushSubscription.update({
      where: { id: existing.id },
      data: {
        userId,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
      },
    });
    return toSubscriptionResponse(updated);
  }

  const created = await prisma.pushSubscription.create({
    data: {
      userId,
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
    },
  });

  return toSubscriptionResponse(created);
}

export async function deleteSubscription(userId: string, endpoint: string): Promise<void> {
  const existing = await prisma.pushSubscription.findUnique({ where: { endpoint } });

  if (!existing || existing.userId !== userId) {
    return;
  }

  await prisma.pushSubscription.delete({ where: { id: existing.id } });
}

export async function getPushSettings(userId: string): Promise<PushSettings> {
  const [user, subscriptionCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        reminderEnabled: true,
        reminderHour: true,
        reminderMinute: true,
        reminderTzOffsetMin: true,
      },
    }),
    prisma.pushSubscription.count({ where: { userId } }),
  ]);

  return {
    pushAvailable: VAPID_ENABLED,
    subscribed: subscriptionCount > 0,
    reminderEnabled: user?.reminderEnabled ?? false,
    reminderHour: user?.reminderHour ?? null,
    reminderMinute: user?.reminderMinute ?? null,
    reminderTzOffsetMin: user?.reminderTzOffsetMin ?? 0,
  };
}

export async function savePushSettings(userId: string, input: SaveSettingsInput): Promise<PushSettings> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      reminderEnabled: input.reminderEnabled ?? undefined,
      reminderHour: input.reminderHour ?? undefined,
      reminderMinute: input.reminderMinute ?? undefined,
      reminderTzOffsetMin: input.reminderTzOffsetMin ?? undefined,
    },
  });

  return getPushSettings(userId);
}

/**
 * Sends a push message to every active subscription of the user. Stale
 * endpoints (410 Gone / 404) are pruned so the user is not pushed to forever.
 * Everything fails softly: subscriptions should never break a workout flow.
 */
export async function sendPushToUser(userId: string, message: PushMessage): Promise<void> {
  if (!VAPID_ENABLED) return;

  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subscriptions.length === 0) return;

  const payload = JSON.stringify({
    title: message.title,
    body: message.body,
    icon: '/icons/icon.svg',
    badge: '/icons/icon.svg',
    tag: message.tag ?? 'ascend',
    data: { url: message.url ?? '/' },
  });

  const results = await Promise.allSettled(
    subscriptions.map((subscription) =>
      webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        payload,
      ),
    ),
  );

  const staleIds = subscriptions
    .filter((_subscription, index) => {
      const result = results[index];
      return (
        result.status === 'rejected' &&
        typeof result.reason === 'object' &&
        result.reason !== null &&
        'statusCode' in result.reason &&
        (result.reason.statusCode === 404 || result.reason.statusCode === 410)
      );
    })
    .map((subscription) => subscription.id);

  if (staleIds.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: staleIds } } });
  }
}

export const restEndMessage: Omit<PushMessage, 'title' | 'body'> = {
  tag: 'ascend-rest',
  url: '/workout/active',
};

export const dailyReminderMessage: Omit<PushMessage, 'title' | 'body'> = {
  tag: 'ascend-daily',
  url: '/',
};