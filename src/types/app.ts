export type LateNightReason =
  | "short_video"
  | "social_media"
  | "gaming"
  | "drama"
  | "work_study"
  | "revenge_bedtime"
  | "anxiety"
  | "other";

export type SleepAidPreference =
  | "sound_spa"
  | "suggestion"
  | "tree_hole"
  | "white_noise"
  | "asmr";

export type DailyCycleStatus =
  | "not_started"
  | "ritual_started"
  | "external_closed"
  | "review_completed"
  | "sleep_aid_started"
  | "ready_to_sleep"
  | "needs_checkin"
  | "checked_in"
  | "feedback_viewed";

export type DailyExecutionStatus = DailyCycleStatus;

export type SleepResult = "near_target" | "slightly_late" | "very_late";

export type MorningMood = "good" | "okay" | "tired";

export type UserConfig = {
  hasOnboarded: boolean;
  targetSleepTime: string;
  targetBedtime: string;
  wakeUpTime: string;
  reminderMinutesBefore: number;
  lateNightReasons: LateNightReason[];
  sleepAidPreferences: SleepAidPreference[];
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

export type RescueSessionStatus =
  | "idle"
  | "started"
  | "in_rescue_flow"
  | "in_shutdown_challenge"
  | "in_relax_mode"
  | "ready_to_sleep"
  | "completed"
  | "abandoned";

export type RescueSession = {
  id: string;
  date: string;
  status: RescueSessionStatus;
  startedAt: string;
  readyToSleepAt?: string;
  completedAt?: string;
  hasUrgeToScroll: boolean;
  shutdownChallengeCompleted: boolean;
  relaxModeUsed: boolean;
  todayReviewCompleted?: boolean;
  todayReviewCompletedAt?: string;
  ritualStep?: number;
  sleepGeneratorUsed?: boolean;
  treeHoleUsed?: boolean;
  sleepAidChoice?: string;
  notes?: string;
};

export type TodayReview = {
  id: string;
  date: string;
  sessionId: string;
  mood?: string;
  happenedToday: string;
  completedToday: string;
  unfinishedToday: string;
  tomorrowPlan: string;
  closingNote: string;
  affirmation?: string;
  minimalMode?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SleepRecord = {
  id: string;
  date: string;
  sessionId: string;
  plannedSleepTime: string;
  actualSleepTime?: string;
  success: boolean;
  reasonIfFailed?: string;
  moodNextMorning?: string;
  createdAt: string;
  updatedAt: string;
};

export type DailyExecutionRecord = {
  date: string;
  plannedSleepTime: string;
  wakeUpTime: string;
  status: DailyExecutionStatus;
  ritualStartedAt?: string;
  externalClosedAt?: string;
  reviewCompletedAt?: string;
  sleepAidStartedAt?: string;
  readyToSleepAt?: string;
  checkinCompletedAt?: string;
  feedbackViewedAt?: string;
  usedSoundSpa: boolean;
  usedTreeHole: boolean;
  usedSleepGenerator: boolean;
  shutdownChallengeCount: number;
  rescuePauseCount: number;
  actualSleepTime?: string;
  sleepResult?: SleepResult;
  morningMood?: MorningMood;
  lateReason?: LateNightReason;
  sleepAudioEnabled?: boolean;
  sleepAudioSessionId?: string;
  createdAt: string;
  updatedAt: string;
};

export type DailyCycle = DailyExecutionRecord;

export type SleepAudioSessionStatus =
  | "idle"
  | "permission_denied"
  | "recording"
  | "stopped"
  | "completed"
  | "failed";

export type SleepAudioEventType =
  | "voice_like"
  | "snore_like"
  | "noise_like"
  | "unknown";

export type SleepAudioEvent = {
  id: string;
  startedAt: string;
  durationMs: number;
  type: SleepAudioEventType;
  confidence?: number;
  localClipUri?: string;
};

export type SleepAudioSession = {
  id: string;
  date: string;
  status: SleepAudioSessionStatus;
  startedAt?: string;
  stoppedAt?: string;
  localAudioUri?: string;
  eventCount: number;
  events: SleepAudioEvent[];
  summary?: {
    hasVoiceLikeSound: boolean;
    hasSnoreLikeSound: boolean;
    quietScore?: number;
  };
  createdAt: string;
  updatedAt: string;
};

export type AppStats = {
  currentStreak: number;
  longestStreak: number;
  totalSuccessDays: number;
  totalRescueSessions: number;
  totalChallengeCompleted: number;
  weeklySuccessCount: number;
  monthlySuccessCount: number;
  weeklyReviewCount: number;
  weeklyChallengeCount: number;
  weeklyTreeHoleCount: number;
  averageSleepTime?: string;
  previousAverageSleepTime?: string;
  averageSleepDeltaMinutes?: number;
  goodMorningMoodCount: number;
};
