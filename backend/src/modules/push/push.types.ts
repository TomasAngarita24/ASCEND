export interface PushSubscriptionResponse {
  id: string;
  endpoint: string;
  createdAt: string;
}

export interface PushSettings {
  pushAvailable: boolean;
  subscribed: boolean;
  reminderEnabled: boolean;
  reminderHour: number | null;
  reminderMinute: number | null;
  reminderTzOffsetMin: number;
}

export interface SaveSubscriptionInput {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface SaveSettingsInput {
  reminderEnabled?: boolean;
  reminderHour?: number | null;
  reminderMinute?: number | null;
  reminderTzOffsetMin?: number;
}

export interface PushMessage {
  title: string;
  body: string;
  tag?: string;
  url?: string;
}