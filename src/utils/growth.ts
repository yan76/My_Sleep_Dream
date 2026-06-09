import { DailyExecutionRecord, RescueSession, SleepRecord, TodayReview, UserConfig } from "@/types/app";
import { addDays, startOfGrowthWeek, todayKey, timeToMinutes } from "@/utils/date";

export type GrowthDimension = "week" | "month" | "all";

export type TrendBar = {
  label: string;
  height: number;
  active: boolean;
};

export type TrendPoint = {
  label: string;
  value: number;
};

export type GrowthStats = {
  averageDeltaMinutes?: number;
  averageLabel: string;
  averageCaption: string;
  statusLabel: string;
  monthAverageLabel: string;
  monthStatusLabel: string;
  reviewCount: number;
  pauseCount: number;
  goodMoodCount: number;
  stableNightCount: number;
  allStableNightCount: number;
  cumulativeReviewCount: number;
  longestStreak: number;
  lessLateCount: number;
  startBeforeTargetCount: number;
  weekBars: TrendBar[];
  monthPoints: TrendPoint[];
  allPoints: TrendPoint[];
};

const goodMoodLabels = new Set(["精神不错", "还可以"]);
const dayLabels = ["一", "二", "三", "四", "五", "六", "日"];

function dateFromKey(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00`);
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function inRange(date: string, start: Date, end: Date): boolean {
  const startKey = todayKey(start);
  const endKey = todayKey(end);
  return date >= startKey && date <= endKey;
}

function recordsInRange(records: SleepRecord[], start: Date, end: Date): SleepRecord[] {
  return records.filter((record) => inRange(record.date, start, end));
}

function sessionsInRange(sessions: RescueSession[], start: Date, end: Date): RescueSession[] {
  return sessions.filter((session) => inRange(session.date, start, end));
}

function reviewsInRange(reviews: TodayReview[], start: Date, end: Date): TodayReview[] {
  return reviews.filter((review) => inRange(review.date, start, end));
}

function sessionPauseCount(session: RescueSession | undefined): number {
  return session?.shutdownChallengeCompleted || session?.hasUrgeToScroll ? 1 : 0;
}

function sessionHasCompletedRescuePlan(session: RescueSession): boolean {
  return Boolean(
    session.readyToSleepAt ||
      session.status === "ready_to_sleep"
  );
}

function executionPauseCount(record: DailyExecutionRecord, sessionsByDate: Record<string, RescueSession>): number {
  return Math.max(record.rescuePauseCount + record.shutdownChallengeCount, sessionPauseCount(sessionsByDate[record.date]));
}

function normalizedSleepMinutes(time?: string): number | undefined {
  if (!time) {
    return undefined;
  }
  const minutes = timeToMinutes(time);
  return minutes < 12 * 60 ? minutes + 24 * 60 : minutes;
}

function timeFromIso(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function executionHasCompletedWindDown(record: DailyExecutionRecord): boolean {
  return Boolean(record.readyToSleepAt || record.checkinCompletedAt);
}

function executionHasCompletedRescuePlan(record: DailyExecutionRecord): boolean {
  return Boolean(
    record.readyToSleepAt ||
      record.status === "ready_to_sleep" ||
      record.status === "needs_checkin"
  );
}

function executionHasCompletedCheckin(record: DailyExecutionRecord): boolean {
  return Boolean(record.checkinCompletedAt || record.status === "checked_in" || record.status === "feedback_viewed");
}

function executionHasGoodMorningMood(record: DailyExecutionRecord): boolean {
  return executionHasCompletedCheckin(record) && (record.morningMood === "good" || record.morningMood === "okay");
}

function executionDateSet(records: DailyExecutionRecord[]): Set<string> {
  return new Set(records.map((record) => record.date));
}

function didMeetPlannedSleepTime(actualSleepTime: string, plannedSleepTime: string): boolean {
  const actual = normalizedSleepMinutes(actualSleepTime);
  const planned = normalizedSleepMinutes(plannedSleepTime);

  return actual !== undefined && planned !== undefined && actual <= planned;
}

function executionSleepRecords(
  records: DailyExecutionRecord[],
  sessionsByDate: Record<string, RescueSession>
): SleepRecord[] {
  const sleepRecords: SleepRecord[] = [];

  records.forEach((record) => {
    const session = sessionsByDate[record.date];
    const actualSleepTime = record.actualSleepTime ?? timeFromIso(record.readyToSleepAt) ?? timeFromIso(session?.readyToSleepAt);

    if (!actualSleepTime) {
      return;
    }

    sleepRecords.push({
      id: `daily-execution-sleep:${record.date}`,
      date: record.date,
      sessionId: `daily-execution:${record.date}`,
      plannedSleepTime: record.plannedSleepTime,
      actualSleepTime,
      success: record.sleepResult ? record.sleepResult === "near_target" : didMeetPlannedSleepTime(actualSleepTime, record.plannedSleepTime),
      reasonIfFailed: record.lateReason,
      moodNextMorning: executionHasCompletedCheckin(record)
        ? record.morningMood === "good" ? "精神不错" : record.morningMood === "okay" ? "还可以" : undefined
        : undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    });
  });

  return sleepRecords;
}

function sleepRecordFromSession(session: RescueSession, config: UserConfig): SleepRecord | null {
  const actualSleepTime = timeFromIso(session.readyToSleepAt);

  if (!actualSleepTime) {
    return null;
  }

  const timestamp =
    session.completedAt ??
    session.readyToSleepAt ??
    session.startedAt ??
    new Date(`${session.date}T00:00:00`).toISOString();

  return {
    id: `rescue-session-sleep:${session.date}`,
    date: session.date,
    sessionId: session.id,
    plannedSleepTime: config.targetSleepTime,
    actualSleepTime,
    success: didMeetPlannedSleepTime(actualSleepTime, config.targetSleepTime),
    createdAt: session.startedAt ?? timestamp,
    updatedAt: timestamp
  };
}

function mergeSessionSleepRecords(
  records: SleepRecord[],
  sessions: RescueSession[],
  config: UserConfig
): SleepRecord[] {
  const recordDates = new Set(records.map((record) => record.date));
  const sessionRecords = sessions
    .filter((session) => !recordDates.has(session.date))
    .map((session) => sleepRecordFromSession(session, config))
    .filter((record): record is SleepRecord => Boolean(record));

  return [...records, ...sessionRecords].sort((a, b) => a.date.localeCompare(b.date));
}

function countExecutionStreak(records: DailyExecutionRecord[], currentDate = todayKey()): number {
  const completedDates = new Set(records.filter(executionHasCompletedWindDown).map((record) => record.date));
  const current = dateFromKey(currentDate);
  let cursor = completedDates.has(currentDate) ? current : addDays(current, -1);
  let count = 0;

  for (let index = 0; index < 365; index += 1) {
    if (!completedDates.has(todayKey(cursor))) {
      break;
    }
    count += 1;
    cursor = addDays(cursor, -1);
  }

  return count;
}

function countLongestExecutionStreak(records: DailyExecutionRecord[]): number {
  const completedDates = [...new Set(records.filter(executionHasCompletedWindDown).map((record) => record.date))].sort();
  let longest = 0;
  let current = 0;
  let previous: Date | null = null;

  completedDates.forEach((date) => {
    const value = new Date(`${date}T00:00:00`);
    const expected = previous ? todayKey(addDays(value, -1)) : null;
    current = previous && todayKey(previous) === expected ? current + 1 : 1;
    longest = Math.max(longest, current);
    previous = value;
  });

  return longest;
}

function createFourWeekExecutionPoints(records: DailyExecutionRecord[], monthStart: Date): TrendPoint[] {
  return [0, 1, 2, 3].map((index) => {
    const start = addDays(monthStart, index * 7);
    const end = addDays(start, 6);
    return {
      label: `W${index + 1}`,
      value: records.filter((record) => inRange(record.date, start, end) && executionHasCompletedWindDown(record)).length
    };
  });
}

function createSixMonthExecutionPoints(records: DailyExecutionRecord[], now: Date): TrendPoint[] {
  const firstMonth = addMonths(startOfMonth(now), -5);
  return [0, 1, 2, 3, 4, 5].map((index) => {
    const start = addMonths(firstMonth, index);
    const key = monthKey(start);
    return {
      label: `M${index + 1}`,
      value: records.filter((record) => record.date.startsWith(key) && executionHasCompletedWindDown(record)).length
    };
  });
}

function countExecutionStartBeforeTarget(records: DailyExecutionRecord[], config: UserConfig): number {
  const targetMinutes = timeToMinutes(config.targetSleepTime);

  return records.filter((record) => {
    const readyTime = timeFromIso(record.readyToSleepAt);
    if (!readyTime) {
      return false;
    }
    return timeToMinutes(readyTime) <= targetMinutes;
  }).length;
}

function averageSleepMinutes(records: SleepRecord[]): number | undefined {
  const values = records
    .map((record) => normalizedSleepMinutes(record.actualSleepTime))
    .filter((value): value is number => value !== undefined);

  if (!values.length) {
    return undefined;
  }

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function formatAverageDelta(delta?: number): Pick<GrowthStats, "averageLabel" | "averageCaption" | "statusLabel"> {
  if (delta === undefined) {
    return {
      averageLabel: "正在积累",
      averageCaption: "有了更多记录后，这里会显示你的变化。",
      statusLabel: "开始记录"
    };
  }

  if (delta < 0) {
    return {
      averageLabel: `提前 ${Math.abs(delta)} 分钟`,
      averageCaption: "平均入睡时间比之前更早。",
      statusLabel: "正在变好"
    };
  }

  if (delta > 0) {
    return {
      averageLabel: `晚了 ${delta} 分钟`,
      averageCaption: "这不是失败，只是提醒今晚早一点收尾。",
      statusLabel: "继续调整"
    };
  }

  return {
    averageLabel: "保持稳定",
    averageCaption: "和之前差不多，稳定本身也很重要。",
    statusLabel: "很稳定"
  };
}

function countCurrentStreak(records: SleepRecord[], currentDate = todayKey()): number {
  const successDates = new Set(records.filter((record) => record.success).map((record) => record.date));
  const current = dateFromKey(currentDate);
  let cursor = successDates.has(currentDate) ? current : addDays(current, -1);
  let count = 0;

  for (let index = 0; index < 365; index += 1) {
    if (!successDates.has(todayKey(cursor))) {
      break;
    }
    count += 1;
    cursor = addDays(cursor, -1);
  }

  return count;
}

function countLongestStreak(records: SleepRecord[]): number {
  const successDates = [...new Set(records.filter((record) => record.success).map((record) => record.date))].sort();
  let longest = 0;
  let current = 0;
  let previous: Date | null = null;

  successDates.forEach((date) => {
    const value = new Date(`${date}T00:00:00`);
    const expected = previous ? todayKey(addDays(value, -1)) : null;
    current = previous && todayKey(previous) === expected ? current + 1 : 1;
    longest = Math.max(longest, current);
    previous = value;
  });

  return longest;
}

function createWeekBars(records: SleepRecord[], weekStart: Date): TrendBar[] {
  return dayLabels.map((label, index) => {
    const date = todayKey(addDays(weekStart, index));
    const record = records.find((item) => item.date === date);
    const minutes = normalizedSleepMinutes(record?.actualSleepTime);

    if (minutes === undefined) {
      return { label, height: 128, active: false };
    }

    const baseline = 22 * 60;
    const capped = Math.min(Math.max(minutes, baseline), baseline + 240);
    return {
      label,
      height: 74 + Math.round(((capped - baseline) / 240) * 76),
      active: true
    };
  });
}

function countStartBeforeTarget(sessions: RescueSession[], config: UserConfig): number {
  const targetMinutes = timeToMinutes(config.targetSleepTime);
  return sessions.filter((session) => {
    if (!session.readyToSleepAt) {
      return false;
    }
    const readyAt = new Date(session.readyToSleepAt);
    const readyMinutes = readyAt.getHours() * 60 + readyAt.getMinutes();
    return readyMinutes <= targetMinutes;
  }).length;
}

function hasReviewSignal(
  date: string,
  sessionsByDate: Record<string, RescueSession>,
  reviewDates: Set<string>,
  record?: DailyExecutionRecord
): boolean {
  return Boolean(record?.reviewCompletedAt || sessionsByDate[date]?.todayReviewCompleted || reviewDates.has(date));
}

function countReviewDates(
  executionRecords: DailyExecutionRecord[],
  sessionsByDate: Record<string, RescueSession>,
  reviews: TodayReview[],
  includeDate: (date: string) => boolean
): number {
  const reviewDates = new Set(reviews.map((review) => review.date));
  const dates = new Set<string>();

  executionRecords.forEach((record) => {
    if (includeDate(record.date) && hasReviewSignal(record.date, sessionsByDate, reviewDates, record)) {
      dates.add(record.date);
    }
  });

  Object.values(sessionsByDate).forEach((session) => {
    if (includeDate(session.date) && session.todayReviewCompleted) {
      dates.add(session.date);
    }
  });

  reviews.forEach((review) => {
    if (includeDate(review.date)) {
      dates.add(review.date);
    }
  });

  return dates.size;
}

function countCompletedRescuePlanDates({
  executionRecords = [],
  sessionsByDate,
  legacySleepRecords = [],
  includeDate
}: {
  executionRecords?: DailyExecutionRecord[];
  sessionsByDate: Record<string, RescueSession>;
  legacySleepRecords?: SleepRecord[];
  includeDate: (date: string) => boolean;
}): number {
  const dates = new Set<string>();
  const coveredDates = new Set<string>();

  executionRecords.forEach((record) => {
    coveredDates.add(record.date);
    if (includeDate(record.date) && executionHasCompletedRescuePlan(record)) {
      dates.add(record.date);
    }
  });

  Object.values(sessionsByDate).forEach((session) => {
    coveredDates.add(session.date);
    if (includeDate(session.date) && sessionHasCompletedRescuePlan(session)) {
      dates.add(session.date);
    }
  });

  legacySleepRecords.forEach((record) => {
    if (includeDate(record.date) && !coveredDates.has(record.date) && record.success) {
      dates.add(record.date);
    }
  });

  return dates.size;
}

function createFourWeekPoints(records: SleepRecord[], monthStart: Date): TrendPoint[] {
  return [0, 1, 2, 3].map((index) => {
    const start = addDays(monthStart, index * 7);
    const end = addDays(start, 6);
    return {
      label: `W${index + 1}`,
      value: recordsInRange(records, start, end).filter((record) => record.success).length
    };
  });
}

function createSixMonthPoints(records: SleepRecord[], now: Date): TrendPoint[] {
  const firstMonth = addMonths(startOfMonth(now), -5);
  return [0, 1, 2, 3, 4, 5].map((index) => {
    const start = addMonths(firstMonth, index);
    const key = monthKey(start);
    return {
      label: `M${index + 1}`,
      value: records.filter((record) => record.date.startsWith(key) && record.success).length
    };
  });
}

export function buildGrowthStats(
  records: SleepRecord[],
  sessionsByDate: Record<string, RescueSession>,
  reviews: TodayReview[],
  config: UserConfig,
  currentDate = todayKey()
): GrowthStats {
  const sessions = Object.values(sessionsByDate);
  const sleepRecords = mergeSessionSleepRecords(records, sessions, config);
  const now = dateFromKey(currentDate);
  const weekStart = startOfGrowthWeek(now);
  const weekEnd = addDays(weekStart, 6);
  const previousWeekStart = addDays(weekStart, -7);
  const previousWeekEnd = addDays(weekStart, -1);
  const monthStart = startOfMonth(now);
  const monthEnd = addDays(addMonths(monthStart, 1), -1);
  const previousMonthStart = addMonths(monthStart, -1);
  const previousMonthEnd = addDays(monthStart, -1);

  const weeklyRecords = recordsInRange(sleepRecords, weekStart, weekEnd);
  const previousWeeklyRecords = recordsInRange(sleepRecords, previousWeekStart, previousWeekEnd);
  const monthlyRecords = recordsInRange(sleepRecords, monthStart, monthEnd);
  const previousMonthlyRecords = recordsInRange(sleepRecords, previousMonthStart, previousMonthEnd);

  const weeklyAverage = averageSleepMinutes(weeklyRecords);
  const previousWeeklyAverage = averageSleepMinutes(previousWeeklyRecords);
  const averageDeltaMinutes =
    weeklyAverage !== undefined && previousWeeklyAverage !== undefined ? weeklyAverage - previousWeeklyAverage : undefined;

  const monthlyAverage = averageSleepMinutes(monthlyRecords);
  const previousMonthlyAverage = averageSleepMinutes(previousMonthlyRecords);
  const monthlyDelta =
    monthlyAverage !== undefined && previousMonthlyAverage !== undefined ? monthlyAverage - previousMonthlyAverage : averageDeltaMinutes;

  const weekSessions = sessionsInRange(sessions, weekStart, weekEnd);
  const monthSessions = sessionsInRange(sessions, monthStart, monthEnd);
  const weekReviews = reviewsInRange(reviews, weekStart, weekEnd);
  const stableNightCount = countCompletedRescuePlanDates({
    sessionsByDate,
    legacySleepRecords: records,
    includeDate: (date) => inRange(date, monthStart, monthEnd)
  });
  const allStableNightCount = countCompletedRescuePlanDates({
    sessionsByDate,
    legacySleepRecords: records,
    includeDate: () => true
  });
  const previousFailures = previousMonthlyRecords.filter((record) => !record.success).length;
  const monthFailures = monthlyRecords.filter((record) => !record.success).length;
  const allFailures = sleepRecords.filter((record) => !record.success).length;
  const firstMonthRecords = sleepRecords.length
    ? sleepRecords.filter((record) => record.date.startsWith(sleepRecords[0].date.slice(0, 7)))
    : [];
  const firstMonthFailures = firstMonthRecords.filter((record) => !record.success).length;

  const monthlyAverageCopy = formatAverageDelta(monthlyDelta);

  return {
    averageDeltaMinutes,
    ...formatAverageDelta(averageDeltaMinutes),
    monthAverageLabel: monthlyAverageCopy.averageLabel,
    monthStatusLabel: monthlyAverageCopy.statusLabel,
    reviewCount: weekReviews.length,
    pauseCount: weekSessions.reduce((sum, session) => sum + sessionPauseCount(session), 0),
    goodMoodCount: weeklyRecords.filter((record) => goodMoodLabels.has(record.moodNextMorning ?? "")).length,
    stableNightCount,
    allStableNightCount,
    cumulativeReviewCount: reviews.length,
    longestStreak: countLongestStreak(sleepRecords),
    lessLateCount: Math.max(0, previousFailures - monthFailures, firstMonthFailures - allFailures),
    startBeforeTargetCount: countStartBeforeTarget(monthSessions.length ? monthSessions : sessions, config),
    weekBars: createWeekBars(sleepRecords, weekStart),
    monthPoints: createFourWeekPoints(sleepRecords, monthStart),
    allPoints: createSixMonthPoints(sleepRecords, now)
  };
}

export function buildGrowthStatsFromExecutionRecords(
  executionRecords: DailyExecutionRecord[],
  legacySleepRecords: SleepRecord[],
  sessionsByDate: Record<string, RescueSession>,
  reviews: TodayReview[],
  config: UserConfig,
  currentDate = todayKey()
): GrowthStats {
  const now = dateFromKey(currentDate);
  const weekStart = startOfGrowthWeek(now);
  const weekEnd = addDays(weekStart, 6);
  const monthStart = startOfMonth(now);
  const monthEnd = addDays(addMonths(monthStart, 1), -1);
  const executionDates = executionDateSet(executionRecords);
  const legacyRecords = legacySleepRecords.filter((record) => !executionDates.has(record.date));
  const sleepRecords = [...executionSleepRecords(executionRecords, sessionsByDate), ...legacyRecords].sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  const weeklyExecutions = executionRecords.filter((record) => inRange(record.date, weekStart, weekEnd));
  const monthlyExecutions = executionRecords.filter((record) => inRange(record.date, monthStart, monthEnd));
  const legacyReviews = reviews.filter((review) => !executionDates.has(review.date));
  const legacySessions = Object.values(sessionsByDate).filter((session) => !executionDates.has(session.date));
  const legacyStats = buildGrowthStats(sleepRecords, Object.fromEntries(legacySessions.map((session) => [session.date, session])), legacyReviews, config, currentDate);
  const weeklyPauseCount = weeklyExecutions.reduce(
    (sum, record) => sum + executionPauseCount(record, sessionsByDate),
    0
  );
  const weeklyGoodMoodCount = weeklyExecutions.filter(executionHasGoodMorningMood).length;
  const weeklyLegacyGoodMoodCount = recordsInRange(legacyRecords, weekStart, weekEnd).filter((record) =>
    goodMoodLabels.has(record.moodNextMorning ?? "")
  ).length;
  const weeklyReviewCount = countReviewDates(executionRecords, sessionsByDate, reviews, (date) => inRange(date, weekStart, weekEnd));
  const allReviewCount = countReviewDates(executionRecords, sessionsByDate, reviews, () => true);
  const stableNightCount = countCompletedRescuePlanDates({
    executionRecords,
    sessionsByDate,
    legacySleepRecords: legacyRecords,
    includeDate: (date) => inRange(date, monthStart, monthEnd)
  });
  const allStableNightCount = countCompletedRescuePlanDates({
    executionRecords,
    sessionsByDate,
    legacySleepRecords: legacyRecords,
    includeDate: () => true
  });

  return {
    ...legacyStats,
    reviewCount: weeklyReviewCount,
    pauseCount: weeklyPauseCount + legacyStats.pauseCount,
    goodMoodCount: weeklyGoodMoodCount + weeklyLegacyGoodMoodCount,
    stableNightCount,
    allStableNightCount,
    cumulativeReviewCount: allReviewCount,
    longestStreak: Math.max(countLongestExecutionStreak(executionRecords), legacyStats.longestStreak),
    startBeforeTargetCount: countExecutionStartBeforeTarget(monthlyExecutions.length ? monthlyExecutions : executionRecords, config) + legacyStats.startBeforeTargetCount,
    monthPoints: executionRecords.length ? createFourWeekExecutionPoints(executionRecords, monthStart) : legacyStats.monthPoints,
    allPoints: executionRecords.length ? createSixMonthExecutionPoints(executionRecords, now) : legacyStats.allPoints
  };
}

export function getCurrentSleepStreak(records: SleepRecord[], currentDate = todayKey()): number {
  return countCurrentStreak(records, currentDate);
}

export function getCurrentExecutionStreak(records: DailyExecutionRecord[], currentDate = todayKey()): number {
  return countExecutionStreak(records, currentDate);
}
