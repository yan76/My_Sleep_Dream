import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { appStorage } from "@/storage/appStorage";
import { storageKeys } from "@/storage/storageKeys";
import { Badge, BadgeId, DailyRecord, ReminderSettings, UserConfig } from "@/types/app";
import { createInitialBadges, updateBadges } from "@/utils/badges";
import { didSleepOnTime } from "@/utils/sleep";
import { nowTime, todayKey } from "@/utils/date";

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
  completeOnboarding: (input: Pick<UserConfig, "targetBedtime" | "wakeUpTime" | "lateNightReasons">) => void;
  updateConfig: (input: Partial<Pick<UserConfig, "targetBedtime" | "wakeUpTime" | "lateNightReasons">>) => void;
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
  targetBedtime: "23:30",
  wakeUpTime: "07:30",
  lateNightReasons: [],
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
        set({
          userConfig: {
            hasOnboarded: true,
            targetBedtime: input.targetBedtime,
            wakeUpTime: input.wakeUpTime,
            lateNightReasons: input.lateNightReasons,
            createdAt: now,
            updatedAt: now
          }
        });
      },

      updateConfig: (input) => {
        set((state) => ({
          userConfig: {
            ...state.userConfig,
            ...input,
            updatedAt: nowIso()
          }
        }));
      },

      updateReminderSettings: (input) => {
        set((state) => ({
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
      storage: createJSONStorage(() => appStorage)
    }
  )
);
