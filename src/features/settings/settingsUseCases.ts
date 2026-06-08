import { requestAccountDeletion, signOut } from "@/services/authService";
import { cancelBedtimeReminder, scheduleBedtimeReminder } from "@/services/notificationService";
import { clearRescueStorage, saveUserConfig } from "@/storage/rescueSessionStorage";
import { LateNightReason, SleepAidPreference } from "@/types/app";

type ResetLocalState = {
  clearAllData: () => void;
};

export type PersistSettingsInput = {
  targetBedtime: string;
  wakeUpTime: string;
  reminderEnabled: boolean;
  reminderTime: string;
  bedtimeModeReminderMinutesBefore: number;
  selectedReasons: LateNightReason[];
  selectedSleepAidPreferences: SleepAidPreference[];
};

export async function persistSettings(input: PersistSettingsInput): Promise<void> {
  await saveUserConfig({
    hasOnboarded: true,
    targetSleepTime: input.targetBedtime,
    targetBedtime: input.targetBedtime,
    wakeUpTime: input.wakeUpTime,
    reminderMinutesBefore: input.bedtimeModeReminderMinutesBefore,
    lateNightReasons: input.selectedReasons,
    sleepAidPreferences: input.selectedSleepAidPreferences
  });

  await scheduleBedtimeReminder({
    targetBedtime: input.targetBedtime,
    reminderMinutesBefore: input.bedtimeModeReminderMinutesBefore,
    reminderTime: input.reminderTime,
    enabled: input.reminderEnabled
  });
}

export async function clearLocalAppData({ clearAllData }: ResetLocalState): Promise<void> {
  clearAllData();
  await cancelBedtimeReminder();
  await clearRescueStorage();
}

export async function deleteAccountAndLocalData({ clearAllData }: ResetLocalState): Promise<void> {
  await requestAccountDeletion();
  await signOut();
  await clearLocalAppData({ clearAllData });
}
