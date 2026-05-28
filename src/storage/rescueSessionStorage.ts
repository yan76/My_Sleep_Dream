import { appStorage } from "@/storage/appStorage";
import { storageKeys } from "@/storage/storageKeys";
import {
  AppStats,
  LateNightReason,
  RescueSession,
  RescueSessionStatus,
  SleepRecord,
  TodayReview,
  UserConfig
} from "@/types/app";
import { addDays, timeToMinutes, todayKey } from "@/utils/date";

type StoredRescueSessions = Record<string, RescueSession>;
type StoredSleepRecords = Record<string, SleepRecord>;
type StoredTodayReviews = Record<string, TodayReview>;

type SleepRecordInput = Partial<
  Pick<SleepRecord, "date" | "sessionId" | "plannedSleepTime" | "actualSleepTime" | "success" | "reasonIfFailed" | "moodNextMorning">
>;
type TodayReviewInput = Pick<TodayReview, "happenedToday" | "completedToday" | "unfinishedToday" | "tomorrowPlan">;

const DEFAULT_TARGET_SLEEP_TIME = "23:30";
const DEFAULT_WAKE_UP_TIME = "07:30";
const DEFAULT_REMINDER_MINUTES_BEFORE = 30;

const nowIso = () => new Date().toISOString();
const sessionIdForDate = (date: string) => `rescue-session:${date}`;
const sleepRecordIdForDate = (date: string) => `sleep-record:${date}`;
const todayReviewIdForDate = (date: string) => `today-review:${date}`;
const DEFAULT_CLOSING_NOTE = "今天已经结束，剩下的交给明天。";

function createDefaultUserConfig(): UserConfig {
  const now = nowIso();
  return {
    hasOnboarded: false,
    targetSleepTime: DEFAULT_TARGET_SLEEP_TIME,
    targetBedtime: DEFAULT_TARGET_SLEEP_TIME,
    wakeUpTime: DEFAULT_WAKE_UP_TIME,
    reminderMinutesBefore: DEFAULT_REMINDER_MINUTES_BEFORE,
    lateNightReasons: [],
    createdAt: now,
    updatedAt: now
  };
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const value = await appStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch (error) {
    console.warn(`[storage] Failed to read ${key}`, error);
    return fallback;
  }
}

async function writeJson<T>(key: string, value: T): Promise<boolean> {
  try {
    await appStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`[storage] Failed to write ${key}`, error);
    return false;
  }
}

function normalizeUserConfig(config: Partial<UserConfig>): UserConfig {
  const fallback = createDefaultUserConfig();
  const targetSleepTime = config.targetSleepTime ?? config.targetBedtime ?? fallback.targetSleepTime;
  const createdAt = config.createdAt ?? fallback.createdAt;

  return {
    ...fallback,
    ...config,
    targetSleepTime,
    targetBedtime: config.targetBedtime ?? targetSleepTime,
    wakeUpTime: config.wakeUpTime ?? fallback.wakeUpTime,
    reminderMinutesBefore: config.reminderMinutesBefore ?? fallback.reminderMinutesBefore,
    lateNightReasons: config.lateNightReasons ?? fallback.lateNightReasons,
    createdAt,
    updatedAt: config.updatedAt ?? createdAt
  };
}

function didMeetPlannedSleepTime(actualSleepTime: string | undefined, plannedSleepTime: string): boolean {
  if (!actualSleepTime) {
    return false;
  }

  const actual = timeToMinutes(actualSleepTime);
  const planned = timeToMinutes(plannedSleepTime);
  const normalizedActual = actual < 12 * 60 ? actual + 24 * 60 : actual;
  const normalizedPlanned = planned < 12 * 60 ? planned + 24 * 60 : planned;
  return normalizedActual <= normalizedPlanned;
}

function countSuccessSince(records: SleepRecord[], since: Date): number {
  const sinceKey = todayKey(since);
  return records.filter((record) => record.success && record.date >= sinceKey).length;
}

function calculateStreaks(records: SleepRecord[]) {
  const successDates = new Set(records.filter((record) => record.success).map((record) => record.date));
  const sortedSuccessDates = [...successDates].sort();
  let longestStreak = 0;
  let runningStreak = 0;
  let previousDate: Date | null = null;

  sortedSuccessDates.forEach((dateKey) => {
    const currentDate = new Date(`${dateKey}T00:00:00`);
    const expectedPreviousKey = previousDate ? todayKey(addDays(currentDate, -1)) : null;
    runningStreak = previousDate && todayKey(previousDate) === expectedPreviousKey ? runningStreak + 1 : 1;
    longestStreak = Math.max(longestStreak, runningStreak);
    previousDate = currentDate;
  });

  let currentStreak = 0;
  const today = new Date();
  let cursor = successDates.has(todayKey(today)) ? today : addDays(today, -1);

  for (let index = 0; index < 365; index += 1) {
    if (!successDates.has(todayKey(cursor))) {
      break;
    }
    currentStreak += 1;
    cursor = addDays(cursor, -1);
  }

  return { currentStreak, longestStreak };
}

export async function saveUserConfig(input: Partial<UserConfig>): Promise<UserConfig> {
  const current = await getUserConfig();
  const targetSleepTime = input.targetSleepTime ?? input.targetBedtime ?? current.targetSleepTime;
  const next = normalizeUserConfig({
    ...current,
    ...input,
    targetSleepTime,
    targetBedtime: input.targetBedtime ?? targetSleepTime,
    updatedAt: nowIso()
  });

  await writeJson(storageKeys.userConfig, next);
  return next;
}

export async function getUserConfig(): Promise<UserConfig> {
  const config = await readJson<Partial<UserConfig>>(storageKeys.userConfig, {});
  return normalizeUserConfig(config);
}

export async function getRescueSessions(): Promise<StoredRescueSessions> {
  return readJson<StoredRescueSessions>(storageKeys.rescueSessions, {});
}

export async function getTodaySession(): Promise<RescueSession | null> {
  const sessions = await getRescueSessions();
  return sessions[todayKey()] ?? null;
}

export async function startTodaySession(): Promise<RescueSession> {
  const date = todayKey();
  const sessions = await getRescueSessions();
  const current = sessions[date];

  if (current) {
    return current;
  }

  const session: RescueSession = {
    id: sessionIdForDate(date),
    date,
    status: "started",
    startedAt: nowIso(),
    hasUrgeToScroll: false,
    shutdownChallengeCompleted: false,
    relaxModeUsed: false
  };

  await writeJson(storageKeys.rescueSessions, { ...sessions, [date]: session });
  return session;
}

export async function updateTodaySession(input: Partial<RescueSession>): Promise<RescueSession> {
  const date = todayKey();
  const sessions = await getRescueSessions();
  const current = sessions[date] ?? (await startTodaySession());
  const next: RescueSession = {
    ...current,
    ...input
  };

  await writeJson(storageKeys.rescueSessions, { ...sessions, [date]: next });
  return next;
}

export async function updateTodaySessionStatus(status: RescueSessionStatus): Promise<RescueSession> {
  const timestamps: Partial<RescueSession> = {};

  if (status === "ready_to_sleep") {
    timestamps.readyToSleepAt = nowIso();
  }

  if (status === "completed" || status === "abandoned") {
    timestamps.completedAt = nowIso();
  }

  return updateTodaySession({ status, ...timestamps });
}

export async function markUrgeToScroll(): Promise<RescueSession> {
  return updateTodaySession({ hasUrgeToScroll: true, status: "in_shutdown_challenge" });
}

export async function markShutdownChallengeCompleted(): Promise<RescueSession> {
  return updateTodaySession({
    shutdownChallengeCompleted: true,
    status: "in_rescue_flow"
  });
}

export async function markRelaxModeUsed(): Promise<RescueSession> {
  return updateTodaySession({
    relaxModeUsed: true,
    status: "in_relax_mode"
  });
}

export async function markReadyToSleep(): Promise<RescueSession> {
  return updateTodaySessionStatus("ready_to_sleep");
}

export async function resetTodayRescueFlowProgress(): Promise<RescueSession> {
  return updateTodaySession({
    status: "in_rescue_flow",
    todayReviewCompleted: false,
    todayReviewCompletedAt: undefined
  });
}

async function getTodayReviewMap(): Promise<StoredTodayReviews> {
  return readJson<StoredTodayReviews>(storageKeys.todayReviews, {});
}

export async function getTodayReview(): Promise<TodayReview | null> {
  const reviews = await getTodayReviewMap();
  return reviews[todayKey()] ?? null;
}

export async function saveTodayReview(input: TodayReviewInput): Promise<TodayReview> {
  const date = todayKey();
  const reviews = await getTodayReviewMap();
  const session = await startTodaySession();
  const current = reviews[date];
  const now = nowIso();
  const review: TodayReview = {
    id: current?.id ?? todayReviewIdForDate(date),
    date,
    sessionId: session.id,
    happenedToday: input.happenedToday,
    completedToday: input.completedToday,
    unfinishedToday: input.unfinishedToday,
    tomorrowPlan: input.tomorrowPlan,
    closingNote: DEFAULT_CLOSING_NOTE,
    createdAt: current?.createdAt ?? now,
    updatedAt: now
  };

  await writeJson(storageKeys.todayReviews, { ...reviews, [date]: review });
  await updateTodaySession({
    status: "in_rescue_flow",
    todayReviewCompleted: true,
    todayReviewCompletedAt: now
  });

  return review;
}

export async function getSleepRecords(): Promise<SleepRecord[]> {
  const records = await readJson<StoredSleepRecords>(storageKeys.sleepRecords, {});
  return Object.values(records).sort((a, b) => a.date.localeCompare(b.date));
}

async function getSleepRecordMap(): Promise<StoredSleepRecords> {
  return readJson<StoredSleepRecords>(storageKeys.sleepRecords, {});
}

export async function getSleepRecordByDate(date: string): Promise<SleepRecord | null> {
  const records = await getSleepRecordMap();
  return records[date] ?? null;
}

export async function getLatestSleepRecord(): Promise<SleepRecord | null> {
  const records = await getSleepRecords();
  return records.at(-1) ?? null;
}

export async function getSessionByDate(date: string): Promise<RescueSession | null> {
  const sessions = await getRescueSessions();
  return sessions[date] ?? null;
}

export async function createOrUpdateSleepRecord(input: SleepRecordInput = {}): Promise<SleepRecord> {
  const fallbackDate = todayKey(addDays(new Date(), -1));
  const date = input.date ?? fallbackDate;
  const records = await getSleepRecordMap();
  const sessions = await getRescueSessions();
  const session = sessions[date];
  const config = await getUserConfig();
  const current = records[date];
  const now = nowIso();
  const plannedSleepTime = input.plannedSleepTime ?? current?.plannedSleepTime ?? config.targetSleepTime;
  const actualSleepTime = input.actualSleepTime ?? current?.actualSleepTime;
  const success = input.success ?? didMeetPlannedSleepTime(actualSleepTime, plannedSleepTime);

  const next: SleepRecord = {
    id: current?.id ?? sleepRecordIdForDate(date),
    date,
    sessionId: input.sessionId ?? current?.sessionId ?? session?.id ?? sessionIdForDate(date),
    plannedSleepTime,
    actualSleepTime,
    success,
    reasonIfFailed: input.reasonIfFailed ?? current?.reasonIfFailed,
    moodNextMorning: input.moodNextMorning ?? current?.moodNextMorning,
    createdAt: current?.createdAt ?? now,
    updatedAt: now
  };

  await writeJson(storageKeys.sleepRecords, { ...records, [date]: next });

  if (session && success && session.status !== "completed") {
    await writeJson(storageKeys.rescueSessions, {
      ...sessions,
      [date]: { ...session, status: "completed", completedAt: session.completedAt ?? now }
    });
  }

  return next;
}

export async function getMorningCheckInDate(): Promise<string | null> {
  const hour = new Date().getHours();
  if (hour < 5 || hour >= 14) {
    return null;
  }

  const checkInDate = todayKey(addDays(new Date(), -1));
  const records = await getSleepRecordMap();
  if (records[checkInDate]) {
    return null;
  }

  const sessions = await getRescueSessions();
  const session = sessions[checkInDate];
  return session && ["ready_to_sleep", "completed"].includes(session.status) ? checkInDate : null;
}

export async function hasTodaySessionStarted(): Promise<boolean> {
  return Boolean(await getTodaySession());
}

export async function hasTodayCheckedIn(): Promise<boolean> {
  const records = await getSleepRecordMap();
  return Boolean(records[todayKey()]);
}

export async function shouldShowMorningCheckIn(): Promise<boolean> {
  return Boolean(await getMorningCheckInDate());
}

export async function getAppStats(): Promise<AppStats> {
  const records = await getSleepRecords();
  const sessions = Object.values(await getRescueSessions());
  const { currentStreak, longestStreak } = calculateStreaks(records);
  const now = new Date();

  return {
    currentStreak,
    longestStreak,
    totalSuccessDays: records.filter((record) => record.success).length,
    totalRescueSessions: sessions.length,
    totalChallengeCompleted: sessions.filter((session) => session.shutdownChallengeCompleted).length,
    weeklySuccessCount: countSuccessSince(records, addDays(now, -6)),
    monthlySuccessCount: countSuccessSince(records, addDays(now, -29))
  };
}

export async function clearRescueStorage(): Promise<void> {
  await Promise.all([
    appStorage.removeItem(storageKeys.userConfig),
    appStorage.removeItem(storageKeys.rescueSessions),
    appStorage.removeItem(storageKeys.todayReviews),
    appStorage.removeItem(storageKeys.sleepRecords)
  ]);
}

export type { LateNightReason };
