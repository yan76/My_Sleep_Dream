export type LateNightReason =
  | "short_video"
  | "social_media"
  | "gaming"
  | "drama"
  | "work_study"
  | "revenge_bedtime"
  | "anxiety"
  | "other";

export type UserConfig = {
  hasOnboarded: boolean;
  targetBedtime: string;
  wakeUpTime: string;
  lateNightReasons: LateNightReason[];
  createdAt: string;
  updatedAt: string;
};

export type ReminderSettings = {
  enabled: boolean;
  reminderTime: string;
  bedtimeModeReminderMinutesBefore: number;
};

export type DailyStatus =
  | "not_started"
  | "contracted"
  | "reviewed"
  | "bedtime_mode"
  | "slept_on_time"
  | "slept_late"
  | "rescued"
  | "checked_in";

export type DailyRecord = {
  date: string;
  plannedBedtime: string;
  actualSleepTime?: string;
  actualWakeTime?: string;
  status: DailyStatus;
  contractConfirmedAt?: string;
  review?: {
    events: string;
    gains: string;
    tomorrowWishlist: string;
    completedAt: string;
  };
  bedtimeChecklist?: {
    putPhoneDown: boolean;
    washedUp: boolean;
    lightsDimmed: boolean;
    tomorrowParked: boolean;
  };
  rescueCount: number;
  rescueSuccess: boolean;
  checkin?: {
    sleepQuality: number; // 1-5
    morningMood: string;
    reflection: string;
    sleepDuration: string;
    completedAt: string;
  };
  note?: string;
  createdAt: string;
  updatedAt: string;
};

export type BadgeId =
  | "first_contract"
  | "first_on_time_sleep"
  | "three_day_streak"
  | "seven_day_streak"
  | "first_rescue"
  | "less_late_week";

export type Badge = {
  id: BadgeId;
  title: string;
  description: string;
  unlocked: boolean;
  unlockedAt?: string;
};
