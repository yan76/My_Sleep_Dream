import { appStorage } from "@/storage/appStorage";
import { isDemoMode } from "@/constants/demo";
import { storageKeys } from "@/storage/storageKeys";
import { defaultSleepAidPreferences } from "@/constants/sleepAidPreferences";
import {
  clearStoredDemoCycleDate,
  resolveCurrentCycleDate,
  resolveDemoStartCycleDate
} from "@/storage/demoCycleDateStorage";
import { clearSleepAudioSessions } from "@/storage/sleepAudioStorage";
import {
  clearDailyCyclesFromSQLite,
  getDailyCyclesFromSQLite,
  replaceDailyCyclesInSQLite
} from "@/storage/sqlite/dailyCycleRepository";
import { clearSyncQueue, enqueueSyncItem } from "@/storage/sqlite/syncQueueRepository";
import {
  clearSleepRecordsFromSQLite,
  getSleepRecordsFromSQLite,
  replaceSleepRecordsInSQLite,
  upsertSleepRecordToSQLite
} from "@/storage/sqlite/sleepRecordRepository";
import {
  clearTodayReviewsFromSQLite,
  getTodayReviewsFromSQLite,
  replaceTodayReviewsInSQLite,
  upsertTodayReviewToSQLite
} from "@/storage/sqlite/todayReviewRepository";
import {
  AppStats,
  DailyExecutionRecord,
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
type StoredDailyExecutionRecords = Record<string, DailyExecutionRecord>;

type SleepRecordInput = Partial<
  Pick<SleepRecord, "date" | "sessionId" | "plannedSleepTime" | "actualSleepTime" | "success" | "reasonIfFailed" | "moodNextMorning">
>;
type TodayReviewInput = Partial<Pick<TodayReview, "mood" | "happenedToday" | "completedToday" | "unfinishedToday" | "tomorrowPlan" | "affirmation" | "minimalMode">>;

const DEFAULT_TARGET_SLEEP_TIME = "23:30";
const DEFAULT_WAKE_UP_TIME = "07:30";
const DEFAULT_REMINDER_MINUTES_BEFORE = 30;

const nowIso = () => new Date().toISOString();
const sessionIdForDate = (date: string) => `rescue-session:${date}`;
const sleepRecordIdForDate = (date: string) => `sleep-record:${date}`;
const todayReviewIdForDate = (date: string) => `today-review:${date}`;
const DEFAULT_CLOSING_NOTE = "今天已经结束，剩下的交给明天。";

function isInactiveSession(session: RescueSession | undefined): boolean {
  return Boolean(session && ["completed", "abandoned"].includes(session.status));
}

function createDefaultUserConfig(): UserConfig {
  const now = nowIso();
  return {
    hasOnboarded: false,
    targetSleepTime: DEFAULT_TARGET_SLEEP_TIME,
    targetBedtime: DEFAULT_TARGET_SLEEP_TIME,
    wakeUpTime: DEFAULT_WAKE_UP_TIME,
    reminderMinutesBefore: DEFAULT_REMINDER_MINUTES_BEFORE,
    lateNightReasons: [],
    sleepAidPreferences: defaultSleepAidPreferences,
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
    sleepAidPreferences: config.sleepAidPreferences ?? fallback.sleepAidPreferences,
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

function averageSleepMinutes(records: SleepRecord[]): number | undefined {
  const minutes = records
    .map((record) => record.actualSleepTime)
    .filter((time): time is string => Boolean(time))
    .map((time) => {
      const value = timeToMinutes(time);
      return value < 12 * 60 ? value + 24 * 60 : value;
    });

  if (!minutes.length) {
    return undefined;
  }

  return Math.round(minutes.reduce((sum, value) => sum + value, 0) / minutes.length);
}

function formatSleepMinutes(minutes?: number): string | undefined {
  if (minutes === undefined) {
    return undefined;
  }

  const normalized = minutes % (24 * 60);
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function timeWithOffset(time: string, offsetMinutes: number): string {
  const next = (timeToMinutes(time) + offsetMinutes + 24 * 60) % (24 * 60);
  const hour = Math.floor(next / 60);
  const minute = next % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function isoForDateTime(date: string, time: string): string {
  return `${date}T${time}:00.000`;
}

function dateTimeForDateKey(date: string, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const next = new Date(`${date}T00:00:00`);
  next.setHours(hours, minutes, 0, 0);
  return next;
}

function wakeTimeForCycle(date: string, wakeUpTime: string, readyAtValue?: string): Date {
  const readyAt = readyAtValue ? new Date(readyAtValue) : null;

  if (readyAt && !Number.isNaN(readyAt.getTime())) {
    let wakeAt = dateTimeForDateKey(todayKey(readyAt), wakeUpTime);

    if (wakeAt.getTime() <= readyAt.getTime()) {
      wakeAt = dateTimeForDateKey(todayKey(addDays(wakeAt, 1)), wakeUpTime);
    }

    return wakeAt;
  }

  return dateTimeForDateKey(todayKey(addDays(new Date(`${date}T00:00:00`), 1)), wakeUpTime);
}

async function getDailyExecutionRecordMap(): Promise<StoredDailyExecutionRecords> {
  try {
    const sqliteRecords = await getDailyCyclesFromSQLite();
    if (sqliteRecords.length > 0) {
      return Object.fromEntries(sqliteRecords.map((record) => [record.date, record]));
    }
  } catch (error) {
    console.warn("[sqlite] Failed to read daily cycles", error);
  }

  return readJson<StoredDailyExecutionRecords>(storageKeys.dailyExecutionRecords, {});
}

function findNextGrowthTestDate(existingDates: Set<string>): string {
  const now = new Date();
  const weekDay = now.getDay() || 7;
  const weekStart = addDays(now, 1 - weekDay);
  const weekEnd = addDays(weekStart, 6);
  const candidates: string[] = [];

  for (let offset = 0; offset <= 6; offset += 1) {
    const date = addDays(now, offset);
    if (date <= weekEnd) {
      candidates.push(todayKey(date));
    }
  }

  for (let offset = -1; offset >= -6; offset -= 1) {
    const date = addDays(now, offset);
    if (date >= weekStart) {
      candidates.push(todayKey(date));
    }
  }

  for (let offset = 7; offset <= 30; offset += 1) {
    const date = addDays(now, offset);
    if (date.getMonth() === now.getMonth()) {
      candidates.push(todayKey(date));
    }
  }

  for (let offset = -7; offset >= -60; offset -= 1) {
    const date = addDays(now, offset);
    if (date.getMonth() === now.getMonth()) {
      candidates.push(todayKey(date));
    }
  }

  for (const date of candidates) {
    if (!existingDates.has(date)) {
      return date;
    }
  }

  for (let offset = -61; offset >= -365; offset -= 1) {
    const date = todayKey(addDays(now, offset));
    if (!existingDates.has(date)) {
      return date;
    }
  }

  return todayKey(addDays(now, -existingDates.size - 1));
}

function recordsBetween(records: SleepRecord[], start: Date, end: Date): SleepRecord[] {
  const startKey = todayKey(start);
  const endKey = todayKey(end);
  return records.filter((record) => record.date >= startKey && record.date <= endKey);
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
  const date = await resolveCurrentCycleDate();
  const session = sessions[date];
  return session && !isInactiveSession(session) ? session : null;
}

export async function startTodaySession(): Promise<RescueSession> {
  const sessions = await getRescueSessions();
  const executionRecords = await getDailyExecutionRecordMap();
  const date = await resolveDemoStartCycleDate({ sessions, executionRecords });
  const current = sessions[date];

  if (current && !isInactiveSession(current)) {
    return current;
  }

  if (isInactiveSession(current)) {
    await clearTodayReviewForDate(date);
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
  const date = await resolveCurrentCycleDate();
  const sessions = await getRescueSessions();
  const stored = sessions[date];
  const current = stored && !isInactiveSession(stored) ? stored : await startTodaySession();
  const next: RescueSession = {
    ...current,
    ...input
  };

  await writeJson(storageKeys.rescueSessions, { ...sessions, [next.date]: next });
  return next;
}

export async function updateTodayRitualStep(ritualStep: number): Promise<RescueSession> {
  return updateTodaySession({
    ritualStep,
    status: "in_rescue_flow"
  });
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
  const current = await getTodaySession();

  return updateTodaySession({
    hasUrgeToScroll: true,
    status: current?.status === "ready_to_sleep" ? "ready_to_sleep" : "in_shutdown_challenge"
  });
}

export async function markShutdownChallengeCompleted(): Promise<RescueSession> {
  const current = await getTodaySession();

  return updateTodaySession({
    shutdownChallengeCompleted: true,
    status: current?.status === "ready_to_sleep" ? "ready_to_sleep" : "in_rescue_flow"
  });
}

export async function markRelaxModeUsed(): Promise<RescueSession> {
  return updateTodaySession({
    relaxModeUsed: true,
    status: "in_relax_mode"
  });
}

export async function markSleepGeneratorUsed(sleepAidChoice?: string): Promise<RescueSession> {
  return updateTodaySession({
    sleepGeneratorUsed: true,
    sleepAidChoice,
    status: "in_relax_mode"
  });
}

export async function markTreeHoleUsed(): Promise<RescueSession> {
  return updateTodaySession({
    treeHoleUsed: true,
    sleepAidChoice: "AI 树洞",
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
  try {
    const sqliteReviews = await getTodayReviewsFromSQLite();
    if (sqliteReviews.length > 0) {
      return Object.fromEntries(sqliteReviews.map((review) => [review.date, review]));
    }
  } catch (error) {
    console.warn("[sqlite] Failed to read today reviews", error);
  }

  return readJson<StoredTodayReviews>(storageKeys.todayReviews, {});
}

async function clearTodayReviewForDate(date: string): Promise<void> {
  const reviews = await getTodayReviewMap();
  if (!reviews[date]) {
    return;
  }

  const nextReviews = { ...reviews };
  delete nextReviews[date];
  await writeJson(storageKeys.todayReviews, nextReviews);
  await replaceTodayReviewsInSQLite(Object.values(nextReviews));
}

export async function getTodayReview(): Promise<TodayReview | null> {
  const reviews = await getTodayReviewMap();
  const date = await resolveCurrentCycleDate();
  return reviews[date] ?? null;
}

export async function getTodayReviews(): Promise<TodayReview[]> {
  const reviews = await getTodayReviewMap();
  return Object.values(reviews).sort((a, b) => a.date.localeCompare(b.date));
}

export async function saveTodayReview(input: TodayReviewInput): Promise<TodayReview> {
  const reviews = await getTodayReviewMap();
  const session = await startTodaySession();
  const date = session.date;
  const current = reviews[date];
  const now = nowIso();
  const review: TodayReview = {
    id: current?.id ?? todayReviewIdForDate(date),
    date,
    sessionId: session.id,
    mood: input.mood,
    happenedToday: input.happenedToday ?? "",
    completedToday: input.completedToday ?? "",
    unfinishedToday: input.unfinishedToday ?? "",
    tomorrowPlan: input.tomorrowPlan ?? "",
    closingNote: DEFAULT_CLOSING_NOTE,
    affirmation: input.affirmation ?? current?.affirmation,
    minimalMode: input.minimalMode ?? current?.minimalMode,
    createdAt: current?.createdAt ?? now,
    updatedAt: now
  };

  await writeJson(storageKeys.todayReviews, { ...reviews, [date]: review });
  await upsertTodayReviewToSQLite(review);
  await enqueueSyncItem({
    entityType: "today_review",
    entityId: review.date,
    operation: "update",
    payload: review
  }).catch((error) => {
    console.warn("[sync] Failed to enqueue today review", error);
  });
  await updateTodaySession({
    status: "in_rescue_flow",
    todayReviewCompleted: true,
    todayReviewCompletedAt: now
  });

  return review;
}

export async function getSleepRecords(): Promise<SleepRecord[]> {
  const records = await getSleepRecordMap();
  return Object.values(records).sort((a, b) => a.date.localeCompare(b.date));
}

async function getSleepRecordMap(): Promise<StoredSleepRecords> {
  try {
    const sqliteRecords = await getSleepRecordsFromSQLite();
    if (sqliteRecords.length > 0) {
      return Object.fromEntries(sqliteRecords.map((record) => [record.date, record]));
    }
  } catch (error) {
    console.warn("[sqlite] Failed to read sleep records", error);
  }

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
  await upsertSleepRecordToSQLite(next);
  await enqueueSyncItem({
    entityType: "sleep_record",
    entityId: next.date,
    operation: "update",
    payload: next
  }).catch((error) => {
    console.warn("[sync] Failed to enqueue sleep record", error);
  });

  if (session && session.status !== "completed") {
    await writeJson(storageKeys.rescueSessions, {
      ...sessions,
      [date]: { ...session, status: "completed", completedAt: session.completedAt ?? now }
    });
  }

  return next;
}

export async function seedGrowthTestData(): Promise<void> {
  const [config, records, sessions, reviews, executionRecords] = await Promise.all([
    getUserConfig(),
    getSleepRecordMap(),
    getRescueSessions(),
    getTodayReviewMap(),
    getDailyExecutionRecordMap()
  ]);
  const now = nowIso();
  const nextRecords: StoredSleepRecords = { ...records };
  const nextSessions: StoredRescueSessions = { ...sessions };
  const nextReviews: StoredTodayReviews = { ...reviews };
  const nextExecutionRecords: StoredDailyExecutionRecords = { ...executionRecords };
  const existingDates = new Set([
    ...Object.keys(nextRecords),
    ...Object.keys(nextSessions),
    ...Object.keys(nextReviews),
    ...Object.keys(nextExecutionRecords)
  ]);
  const date = findNextGrowthTestDate(existingDates);
  const sessionId = sessionIdForDate(date);
  const dateStart = new Date(`${date}T00:00:00`);
  const ritualStartedAt = isoForDateTime(date, timeWithOffset(config.targetSleepTime, -60));
  const externalClosedAt = isoForDateTime(date, timeWithOffset(config.targetSleepTime, -45));
  const reviewCompletedAt = isoForDateTime(date, timeWithOffset(config.targetSleepTime, -35));
  const sleepAidStartedAt = isoForDateTime(date, timeWithOffset(config.targetSleepTime, -15));
  const readyToSleepAt = isoForDateTime(date, config.targetSleepTime);
  const checkinCompletedAt = isoForDateTime(todayKey(addDays(dateStart, 1)), config.wakeUpTime);

  nextExecutionRecords[date] = {
    date,
    plannedSleepTime: config.targetSleepTime,
    wakeUpTime: config.wakeUpTime,
    status: "checked_in",
    ritualStartedAt,
    externalClosedAt,
    reviewCompletedAt,
    sleepAidStartedAt,
    readyToSleepAt,
    checkinCompletedAt,
    usedSoundSpa: true,
    usedTreeHole: false,
    usedSleepGenerator: true,
    shutdownChallengeCount: 1,
    rescuePauseCount: 0,
    actualSleepTime: config.targetSleepTime,
    sleepResult: "near_target",
    morningMood: "okay",
    createdAt: ritualStartedAt,
    updatedAt: now
  };

  nextSessions[date] = {
    id: sessionId,
    date,
    status: "completed",
    startedAt: ritualStartedAt,
    readyToSleepAt,
    completedAt: readyToSleepAt,
    hasUrgeToScroll: true,
    shutdownChallengeCompleted: true,
    relaxModeUsed: true,
    todayReviewCompleted: true,
    todayReviewCompletedAt: reviewCompletedAt,
    ritualStep: 1,
    sleepGeneratorUsed: true,
    sleepAidChoice: "声音 Spa"
  };

  nextRecords[date] = {
    id: sleepRecordIdForDate(date),
    date,
    sessionId,
    plannedSleepTime: config.targetSleepTime,
    actualSleepTime: config.targetSleepTime,
    success: true,
    moodNextMorning: "还可以",
    createdAt: checkinCompletedAt,
    updatedAt: now
  };

  nextReviews[date] = {
    id: todayReviewIdForDate(date),
    date,
    sessionId,
    mood: "还可以",
    happenedToday: "完成了一次睡前复盘",
    completedToday: "按计划收尾并进入助眠流程",
    unfinishedToday: "留给明天继续推进",
    tomorrowPlan: "提前开始睡前流程",
    closingNote: DEFAULT_CLOSING_NOTE,
    affirmation: "慢慢变好也很好",
    minimalMode: false,
    createdAt: reviewCompletedAt,
    updatedAt: now
  };

  await Promise.all([
    writeJson(storageKeys.sleepRecords, nextRecords),
    writeJson(storageKeys.rescueSessions, nextSessions),
    writeJson(storageKeys.todayReviews, nextReviews),
    replaceSleepRecordsInSQLite(Object.values(nextRecords)),
    replaceTodayReviewsInSQLite(Object.values(nextReviews)),
    replaceDailyCyclesInSQLite(Object.values(nextExecutionRecords))
  ]);
}

export async function getMorningCheckInDate(): Promise<string | null> {
  const now = new Date();
  const nowTime = now.getTime();
  const backfillWindowMs = 48 * 60 * 60 * 1000;
  const [records, sessions, executionRecords] = await Promise.all([
    getSleepRecordMap(),
    getRescueSessions(),
    getDailyExecutionRecordMap()
  ]);

  const executionCandidate = Object.values(executionRecords)
    .filter((record) => {
      if (!["ready_to_sleep", "needs_checkin"].includes(record.status) || record.checkinCompletedAt) {
        return false;
      }

      if (isDemoMode) {
        return true;
      }

      const wakeAt = wakeTimeForCycle(record.date, record.wakeUpTime, record.readyToSleepAt);
      const elapsed = nowTime - wakeAt.getTime();
      return elapsed >= 0 && elapsed <= backfillWindowMs;
    })
    .sort((a, b) => b.date.localeCompare(a.date))[0];

  if (executionCandidate) {
    return executionCandidate.date;
  }

  const sessionCandidate = Object.values(sessions)
    .filter((session) => {
      if (!["ready_to_sleep", "completed"].includes(session.status) || records[session.date]) {
        return false;
      }

      if (isDemoMode) {
        return true;
      }

      const wakeAt = wakeTimeForCycle(session.date, DEFAULT_WAKE_UP_TIME, session.readyToSleepAt ?? session.completedAt);
      const elapsed = nowTime - wakeAt.getTime();
      return elapsed >= 0 && elapsed <= backfillWindowMs;
    })
    .sort((a, b) => b.date.localeCompare(a.date))[0];

  return sessionCandidate?.date ?? null;
}

export async function hasTodaySessionStarted(): Promise<boolean> {
  return Boolean(await getTodaySession());
}

export async function hasTodayCheckedIn(): Promise<boolean> {
  const records = await getSleepRecordMap();
  const date = await resolveCurrentCycleDate();
  return Boolean(records[date]);
}

export async function shouldShowMorningCheckIn(): Promise<boolean> {
  return Boolean(await getMorningCheckInDate());
}

export async function getAppStats(): Promise<AppStats> {
  const records = await getSleepRecords();
  const sessions = Object.values(await getRescueSessions());
  const reviews = Object.values(await getTodayReviewMap());
  const { currentStreak, longestStreak } = calculateStreaks(records);
  const now = new Date();
  const weekStart = addDays(now, -6);
  const previousWeekStart = addDays(now, -13);
  const previousWeekEnd = addDays(now, -7);
  const weekStartKey = todayKey(weekStart);
  const weeklyRecords = recordsBetween(records, weekStart, now);
  const previousWeeklyRecords = recordsBetween(records, previousWeekStart, previousWeekEnd);
  const currentAverage = averageSleepMinutes(weeklyRecords);
  const previousAverage = averageSleepMinutes(previousWeeklyRecords);

  return {
    currentStreak,
    longestStreak,
    totalSuccessDays: records.filter((record) => record.success).length,
    totalRescueSessions: sessions.length,
    totalChallengeCompleted: sessions.filter((session) => session.shutdownChallengeCompleted).length,
    weeklySuccessCount: countSuccessSince(records, addDays(now, -6)),
    monthlySuccessCount: countSuccessSince(records, addDays(now, -29)),
    weeklyReviewCount: reviews.filter((review) => review.date >= weekStartKey).length,
    weeklyChallengeCount: sessions.filter((session) => session.date >= weekStartKey && session.shutdownChallengeCompleted).length,
    weeklyTreeHoleCount: sessions.filter((session) => session.date >= weekStartKey && session.treeHoleUsed).length,
    averageSleepTime: formatSleepMinutes(currentAverage),
    previousAverageSleepTime: formatSleepMinutes(previousAverage),
    averageSleepDeltaMinutes:
      currentAverage !== undefined && previousAverage !== undefined ? currentAverage - previousAverage : undefined,
    goodMorningMoodCount: weeklyRecords.filter((record) => ["精神不错", "还可以"].includes(record.moodNextMorning ?? "")).length
  };
}

export async function clearRescueStorage(): Promise<void> {
  await Promise.all([
    appStorage.removeItem(storageKeys.appState),
    appStorage.removeItem(storageKeys.userConfig),
    appStorage.removeItem(storageKeys.rescueSessions),
    appStorage.removeItem(storageKeys.todayReviews),
    appStorage.removeItem(storageKeys.sleepRecords),
    appStorage.removeItem(storageKeys.dailyExecutionRecords),
    clearStoredDemoCycleDate(),
    clearSleepAudioSessions(),
    clearSleepRecordsFromSQLite(),
    clearTodayReviewsFromSQLite(),
    clearDailyCyclesFromSQLite(),
    clearSyncQueue()
  ]);
}

export type { LateNightReason };
