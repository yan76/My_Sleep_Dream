import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { defaultSleepAidPreferences } from "@/constants/sleepAidPreferences";
import { appStorage } from "@/storage/appStorage";
import { storageKeys } from "@/storage/storageKeys";
import { Badge, BadgeId, DailyRecord, ReminderSettings, UserConfig } from "@/types/app";
import { createInitialBadges, updateBadges } from "@/utils/badges";
import { didSleepOnTime } from "@/utils/sleep";
import { nowTime, todayKey } from "@/utils/date";
import { getSuggestedRescueTime } from "@/utils/sleepPreferences";

type ReviewInput = {
  events: string;
  gains: string;
  tomorrowWishlist: string;
};

type ChecklistInput = NonNullable<DailyRecord["bedtimeChecklist"]>;

type CheckinInput = {
  sleepQuality: number;
  morningMood: string;
  reflection: string;
  actualWakeTime: string;
};

type AppStore = {
  userConfig: UserConfig;
  reminderSettings: ReminderSettings;
  dailyRecords: Record<string, DailyRecord>;
  badges: Record<BadgeId, Badge>;
  completeOnboarding: (
    input: Pick<UserConfig, "targetBedtime" | "wakeUpTime" | "lateNightReasons"> &
      Partial<Pick<UserConfig, "reminderMinutesBefore" | "sleepAidPreferences">>
  ) => void;
  updateConfig: (
    input: Partial<
      Pick<
        UserConfig,
        "targetBedtime" | "targetSleepTime" | "wakeUpTime" | "lateNightReasons" | "reminderMinutesBefore" | "sleepAidPreferences"
      >
    >
  ) => void;
  updateReminderSettings: (input: Partial<ReminderSettings>) => void;
  ensureTodayRecord: () => DailyRecord;
  confirmContract: (plannedBedtime: string) => void;
  saveReview: (review: ReviewInput) => void;
  saveBedtimeChecklist: (checklist: ChecklistInput, markReady?: boolean) => void;
  markRescueSuccess: () => void;
  saveCheckin: (checkin: CheckinInput) => void;
  clearAllData: () => void;
};

const nowIso = () => new Date().toISOString();

const defaultUserConfig: UserConfig = {
  hasOnboarded: false,
  targetSleepTime: "23:30",
  targetBedtime: "23:30",
  wakeUpTime: "07:30",
  reminderMinutesBefore: 30,
  lateNightReasons: [],
  sleepAidPreferences: defaultSleepAidPreferences,
  createdAt: nowIso(),
  updatedAt: nowIso()
};

const defaultReminderSettings: ReminderSettings = {
  enabled: true,
  reminderTime: "22:50",
  bedtimeModeReminderMinutesBefore: 30
};

function createDailyRecord(plannedBedtime: string): DailyRecord {
  const now = nowIso();
  return {
    date: todayKey(),
    plannedBedtime,
    status: "not_started",
    rescueCount: 0,
    rescueSuccess: false,
    createdAt: now,
    updatedAt: now
  };
}

function applyRecordsWithBadges(
  records: Record<string, DailyRecord>,
  badges: Record<BadgeId, Badge>
) {
  return {
    dailyRecords: records,
    badges: updateBadges(records, badges)
  };
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      userConfig: defaultUserConfig,
      reminderSettings: defaultReminderSettings,
      dailyRecords: {},
      badges: createInitialBadges(),

      completeOnboarding: (input) => {
        const now = nowIso();
        const reminderMinutesBefore = input.reminderMinutesBefore ?? defaultReminderSettings.bedtimeModeReminderMinutesBefore;
        set({
          userConfig: {
            hasOnboarded: true,
            targetSleepTime: input.targetBedtime,
            targetBedtime: input.targetBedtime,
            wakeUpTime: input.wakeUpTime,
            reminderMinutesBefore,
            lateNightReasons: input.lateNightReasons,
            sleepAidPreferences: input.sleepAidPreferences ?? defaultSleepAidPreferences,
            createdAt: now,
            updatedAt: now
          },
          reminderSettings: {
            ...defaultReminderSettings,
            reminderTime: getSuggestedRescueTime(input.targetBedtime, reminderMinutesBefore),
            bedtimeModeReminderMinutesBefore: reminderMinutesBefore
          }
        });
      },

      updateConfig: (input) => {
        set((state) => ({
          userConfig: {
            ...state.userConfig,
            ...input,
            targetSleepTime: input.targetSleepTime ?? input.targetBedtime ?? state.userConfig.targetSleepTime,
            targetBedtime: input.targetBedtime ?? input.targetSleepTime ?? state.userConfig.targetBedtime,
            reminderMinutesBefore: input.reminderMinutesBefore ?? state.userConfig.reminderMinutesBefore,
            updatedAt: nowIso()
          }
        }));
      },

      updateReminderSettings: (input) => {
        set((state) => ({
          userConfig: {
            ...state.userConfig,
            reminderMinutesBefore:
              input.bedtimeModeReminderMinutesBefore ?? state.userConfig.reminderMinutesBefore,
            updatedAt: nowIso()
          },
          reminderSettings: {
            ...state.reminderSettings,
            ...input
          }
        }));
      },

      ensureTodayRecord: () => {
        const key = todayKey();
        const current = get().dailyRecords[key];
        if (current) {
          return current;
        }

        const record = createDailyRecord(get().userConfig.targetBedtime);
        set((state) => ({
          dailyRecords: {
            ...state.dailyRecords,
            [key]: record
          }
        }));
        return record;
      },

      confirmContract: (plannedBedtime) => {
        const key = todayKey();
        const current = get().dailyRecords[key] ?? createDailyRecord(plannedBedtime);
        const record: DailyRecord = {
          ...current,
          plannedBedtime,
          status: "contracted",
          contractConfirmedAt: nowIso(),
          updatedAt: nowIso()
        };
        set((state) => applyRecordsWithBadges({ ...state.dailyRecords, [key]: record }, state.badges));
      },

      saveReview: (review) => {
        const key = todayKey();
        const current = get().dailyRecords[key] ?? createDailyRecord(get().userConfig.targetBedtime);
        const record: DailyRecord = {
          ...current,
          status: "reviewed",
          review: {
            ...review,
            completedAt: nowIso()
          },
          updatedAt: nowIso()
        };
        set((state) => applyRecordsWithBadges({ ...state.dailyRecords, [key]: record }, state.badges));
      },

      saveBedtimeChecklist: (checklist, markReady = false) => {
        const key = todayKey();
        const current = get().dailyRecords[key] ?? createDailyRecord(get().userConfig.targetBedtime);
        const actualSleepTime = markReady ? nowTime() : current.actualSleepTime;
        const record: DailyRecord = {
          ...current,
          status: markReady
            ? didSleepOnTime(actualSleepTime ?? nowTime(), current.plannedBedtime)
              ? "slept_on_time"
              : "slept_late"
            : "bedtime_mode",
          actualSleepTime,
          bedtimeChecklist: checklist,
          updatedAt: nowIso()
        };
        set((state) => applyRecordsWithBadges({ ...state.dailyRecords, [key]: record }, state.badges));
      },

      markRescueSuccess: () => {
        const key = todayKey();
        const current = get().dailyRecords[key] ?? createDailyRecord(get().userConfig.targetBedtime);
        const record: DailyRecord = {
          ...current,
          status: "rescued",
          rescueCount: current.rescueCount + 1,
          rescueSuccess: true,
          updatedAt: nowIso()
        };
        set((state) => applyRecordsWithBadges({ ...state.dailyRecords, [key]: record }, state.badges));
      },

      saveCheckin: (checkin) => {
        const key = todayKey();
        const current = get().dailyRecords[key] ?? createDailyRecord(get().userConfig.targetBedtime);
        const actualSleepTime = current.actualSleepTime ?? nowTime();
        const record: DailyRecord = {
          ...current,
          status: "checked_in",
          actualSleepTime,
          actualWakeTime: checkin.actualWakeTime,
          checkin: {
            ...checkin,
            sleepDuration: "",
            completedAt: nowIso()
          },
          updatedAt: nowIso()
        };
        set((state) => applyRecordsWithBadges({ ...state.dailyRecords, [key]: record }, state.badges));
      },

      clearAllData: () => {
        const createdAt = nowIso();
        set({
          userConfig: { ...defaultUserConfig, createdAt, updatedAt: createdAt },
          reminderSettings: defaultReminderSettings,
          dailyRecords: {},
          badges: createInitialBadges()
        });
      }
    }),
    {
      name: storageKeys.appState,
      storage: createJSONStorage(() => appStorage),
      merge: (persisted, current) => {
        const persistedState = persisted as Partial<AppStore> | undefined;

        return {
          ...current,
          ...persistedState,
          userConfig: {
            ...defaultUserConfig,
            ...persistedState?.userConfig,
            reminderMinutesBefore: persistedState?.userConfig?.reminderMinutesBefore ?? defaultUserConfig.reminderMinutesBefore,
            sleepAidPreferences: persistedState?.userConfig?.sleepAidPreferences ?? defaultSleepAidPreferences
          },
          reminderSettings: {
            ...defaultReminderSettings,
            ...persistedState?.reminderSettings
          }
        };
      }
    }
  )
);
