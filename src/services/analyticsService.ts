import { appStorage } from "@/storage/appStorage";
import { storageKeys } from "@/storage/storageKeys";

export type AppEventName =
  | "app_error_boundary"
  | "onboarding_completed"
  | "rescue_started"
  | "today_review_completed"
  | "sleep_aid_used"
  | "tree_hole_message_sent"
  | "sleep_script_generated"
  | "weekly_summary_generated"
  | "checkin_completed"
  | "sync_failed";

type AppEventPropertyValue = string | number | boolean | null;

export type AppEventPropertiesByName = {
  app_error_boundary: {
    message?: string;
  };
  onboarding_completed: {
    reminderMinutesBefore?: number;
    lateNightReasonCount?: number;
    sleepAidPreferenceCount?: number;
  };
  rescue_started: {
    date?: string;
  };
  today_review_completed: {
    date?: string;
  };
  sleep_aid_used: {
    date?: string;
    aid?: string;
  };
  tree_hole_message_sent: {
    source: "cloud" | "fallback";
  };
  sleep_script_generated: {
    source: "cloud" | "fallback";
    safetyLabel?: string;
  };
  weekly_summary_generated: {
    source: "cloud" | "fallback";
    safetyLabel?: string;
  };
  checkin_completed: {
    date?: string;
    sleepResult?: string | null;
  };
  sync_failed: {
    entityType?: string;
    entityId?: string;
    message?: string;
  };
};

export type AppEventProperties<TName extends AppEventName = AppEventName> =
  AppEventPropertiesByName[TName] & Record<string, AppEventPropertyValue | undefined>;

export type AppEvent = {
  id: string;
  name: AppEventName;
  createdAt: string;
  properties?: Record<string, AppEventPropertyValue>;
};

const MAX_LOCAL_EVENTS = 250;
const MAX_PROPERTY_TEXT_LENGTH = 80;
const SENSITIVE_PROPERTY_KEYS = [
  "content",
  "email",
  "message",
  "phone",
  "prompt",
  "reflection",
  "reply",
  "script",
  "token"
];

function createEventId(name: AppEventName): string {
  return `${name}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

async function readEvents(): Promise<AppEvent[]> {
  try {
    const value = await appStorage.getItem(storageKeys.appEvents);
    return value ? (JSON.parse(value) as AppEvent[]) : [];
  } catch {
    return [];
  }
}

function sanitizeProperties(properties?: Record<string, AppEventPropertyValue | undefined>): AppEvent["properties"] {
  if (!properties) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(properties)
      .filter((entry): entry is [string, AppEventPropertyValue] => entry[1] !== undefined)
      .map(([key, value]) => {
      const normalizedKey = key.toLowerCase();
      if (SENSITIVE_PROPERTY_KEYS.some((sensitiveKey) => normalizedKey.includes(sensitiveKey))) {
        return [key, "[redacted]"];
      }

      if (typeof value === "string" && value.length > MAX_PROPERTY_TEXT_LENGTH) {
        return [key, `${value.slice(0, MAX_PROPERTY_TEXT_LENGTH)}...`];
      }

      return [key, value];
    })
  );
}

export async function trackAppEvent<TName extends AppEventName>(
  name: TName,
  properties?: AppEventProperties<TName>
): Promise<void> {
  try {
    const events = await readEvents();
    const nextEvents = [
      ...events,
      {
        id: createEventId(name),
        name,
        createdAt: new Date().toISOString(),
        properties: sanitizeProperties(properties)
      }
    ].slice(-MAX_LOCAL_EVENTS);

    await appStorage.setItem(storageKeys.appEvents, JSON.stringify(nextEvents));
  } catch (error) {
    console.warn("[analytics] Failed to track local event", error);
  }
}

export async function getLocalAppEvents(): Promise<AppEvent[]> {
  return readEvents();
}
