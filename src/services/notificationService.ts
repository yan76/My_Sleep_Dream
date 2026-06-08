import * as Notifications from "expo-notifications";
import { appStorage } from "@/storage/appStorage";
import { storageKeys } from "@/storage/storageKeys";
import { ReminderSettings, UserConfig } from "@/types/app";
import { isValidTime } from "@/utils/date";
import { getSuggestedRescueTime } from "@/utils/sleepPreferences";

const REMINDER_CHANNEL_ID = "sleep-rescue-reminders";
const REMINDER_IDENTIFIER = "daily-sleep-rescue-reminder";

export type NotificationPermissionState = "granted" | "denied" | "undetermined" | "unavailable";

export type LocalReminderStatus = {
  available: boolean;
  enabled: boolean;
  scheduled: boolean;
  permission: NotificationPermissionState;
  reminderTime?: string;
  message: string;
};

let handlerConfigured = false;

export function configureLocalNotificationHandling() {
  if (handlerConfigured) {
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      priority: Notifications.AndroidNotificationPriority.DEFAULT
    })
  });
  handlerConfigured = true;
}

async function ensureReminderChannel() {
  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: "睡前自救提醒",
    description: "提醒你在目标睡觉时间前开始收尾。",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 180, 120, 180],
    lightColor: "#E3D4B5",
    sound: null
  });
}

async function getNotificationPermissionState(): Promise<NotificationPermissionState> {
  try {
    const permission = await Notifications.getPermissionsAsync();
    if (permission.granted || permission.status === "granted") {
      return "granted";
    }
    return permission.status === "denied" ? "denied" : "undetermined";
  } catch {
    return "unavailable";
  }
}

async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  const current = await getNotificationPermissionState();
  if (current === "granted" || current === "denied" || current === "unavailable") {
    return current;
  }

  try {
    const permission = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowSound: false,
        allowBadge: false
      }
    });
    return permission.granted || permission.status === "granted" ? "granted" : "denied";
  } catch {
    return "unavailable";
  }
}

export async function cancelBedtimeReminder(): Promise<void> {
  const storedIdentifier = await appStorage.getItem(storageKeys.localReminderNotificationId);
  const identifiers = new Set([REMINDER_IDENTIFIER, storedIdentifier].filter(Boolean) as string[]);

  await Promise.all(
    [...identifiers].map((identifier) =>
      Notifications.cancelScheduledNotificationAsync(identifier).catch(() => undefined)
    )
  );
  await appStorage.removeItem(storageKeys.localReminderNotificationId);
  await appStorage.removeItem(storageKeys.localReminderSnapshot);
}

export async function scheduleBedtimeReminder(input: {
  targetBedtime: string;
  reminderMinutesBefore: number;
  reminderTime?: string;
  enabled: boolean;
}): Promise<LocalReminderStatus> {
  configureLocalNotificationHandling();

  if (!input.enabled) {
    await cancelBedtimeReminder();
    return {
      available: true,
      enabled: false,
      scheduled: false,
      permission: await getNotificationPermissionState(),
      message: "提醒已关闭。"
    };
  }

  const reminderTime = input.reminderTime && isValidTime(input.reminderTime)
    ? input.reminderTime
    : getSuggestedRescueTime(input.targetBedtime, input.reminderMinutesBefore);

  if (!isValidTime(input.targetBedtime) || !isValidTime(reminderTime)) {
    await cancelBedtimeReminder();
    return {
      available: true,
      enabled: true,
      scheduled: false,
      permission: await getNotificationPermissionState(),
      message: "目标睡觉时间无效，暂未注册提醒。"
    };
  }

  const permission = await requestNotificationPermission();
  if (permission !== "granted") {
    await cancelBedtimeReminder();
    return {
      available: permission !== "unavailable",
      enabled: true,
      scheduled: false,
      permission,
      message: permission === "denied" ? "系统通知权限未开启。" : "当前环境不支持系统通知。"
    };
  }

  await ensureReminderChannel();
  await cancelBedtimeReminder();

  const [hour, minute] = reminderTime.split(":").map(Number);
  const identifier = await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_IDENTIFIER,
    content: {
      title: "到收尾时间了",
      body: "先把外界暂停一下，从一个能做到的小停顿开始。",
      data: {
        route: "/rescue",
        kind: "bedtime_reminder"
      },
      sound: false
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      channelId: REMINDER_CHANNEL_ID,
      hour,
      minute
    }
  });

  await appStorage.setItem(storageKeys.localReminderNotificationId, identifier);
  await appStorage.setItem(
    storageKeys.localReminderSnapshot,
    JSON.stringify({
      reminderTime,
      targetBedtime: input.targetBedtime,
      reminderMinutesBefore: input.reminderMinutesBefore,
      updatedAt: new Date().toISOString()
    })
  );

  return {
    available: true,
    enabled: true,
    scheduled: true,
    permission,
    reminderTime,
    message: `已注册每天 ${reminderTime} 的睡前自救提醒。`
  };
}

export async function refreshBedtimeReminderFromSettings(
  userConfig: UserConfig,
  reminderSettings: ReminderSettings
): Promise<LocalReminderStatus> {
  return scheduleBedtimeReminder({
    targetBedtime: userConfig.targetBedtime,
    reminderMinutesBefore: reminderSettings.bedtimeModeReminderMinutesBefore,
    reminderTime: reminderSettings.reminderTime,
    enabled: reminderSettings.enabled
  });
}

export async function getBedtimeReminderStatus(reminderEnabled: boolean): Promise<LocalReminderStatus> {
  const permission = await getNotificationPermissionState();
  const snapshotValue = await appStorage.getItem(storageKeys.localReminderSnapshot);
  const snapshot = snapshotValue ? (JSON.parse(snapshotValue) as { reminderTime?: string }) : null;
  const scheduled = Boolean(await appStorage.getItem(storageKeys.localReminderNotificationId));

  return {
    available: permission !== "unavailable",
    enabled: reminderEnabled,
    scheduled,
    permission,
    reminderTime: snapshot?.reminderTime,
    message: !reminderEnabled
      ? "提醒已关闭。"
      : scheduled
        ? `已注册每天 ${snapshot?.reminderTime ?? "设定时间"} 的睡前自救提醒。`
        : permission === "denied"
          ? "系统通知权限未开启。"
          : "尚未注册系统提醒。"
  };
}
