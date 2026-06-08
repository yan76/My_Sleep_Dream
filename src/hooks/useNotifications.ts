import { useCallback, useEffect, useState } from "react";
import {
  getBedtimeReminderStatus,
  LocalReminderStatus,
  refreshBedtimeReminderFromSettings
} from "@/services/notificationService";
import { useAppStore } from "@/store/useAppStore";

export function useNotifications() {
  const userConfig = useAppStore((state) => state.userConfig);
  const reminderSettings = useAppStore((state) => state.reminderSettings);
  const [status, setStatus] = useState<LocalReminderStatus | null>(null);

  const refresh = useCallback(async () => {
    setStatus(await getBedtimeReminderStatus(reminderSettings.enabled));
  }, [reminderSettings.enabled]);

  const syncReminder = useCallback(async () => {
    const next = await refreshBedtimeReminderFromSettings(userConfig, reminderSettings);
    setStatus(next);
    return next;
  }, [reminderSettings, userConfig]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  return {
    available: status?.available ?? false,
    status,
    note: status?.message ?? "正在读取系统提醒状态。",
    refresh,
    syncReminder
  };
}
