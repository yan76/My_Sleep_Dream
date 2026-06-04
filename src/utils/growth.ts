import { DailyExecutionRecord, RescueSession, SleepRecord, TodayReview, UserConfig } from "@/types/app";
import { addDays, todayKey, timeToMinutes } from "@/utils/date";

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

function startOfWeek(date: Date): Date {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  next.setHours(0, 0, 0, 0);
  return next;
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

function executionDateSet(records: DailyExecutionRecord[]): Set<string> {
  return new Set(records.map((record) => record.date));
}

function didMeetPlannedSleepTime(actualSleepTime: string, plannedSleepTime: string): boolean {
  const actual = normalizedSleepMinutes(actualSleepTime);
  const planned = normalizedSleepMinutes(plannedSleepTime);

  return actual !== undefined && planned !== undefined && actual <= planned;
}

function executionSleepRecords(records: DailyExecutionRecord[]): SleepRecord[] {
  const sleepRecords: SleepRecord[] = [];

  records.forEach((record) => {
    const actualSleepTime = record.actualSleepTime ?? timeFromIso(record.readyToSleepAt);

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
      moodNextMorning:
        record.morningMood === "good" ? "精神不错" : record.morningMood === "okay" ? "还可以" : undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    });
  });

  return sleepRecords;
}

function countExecutionStreak(records: DailyExecutionRecord[]): number {
  const completedDates = new Set(records.filter(executionHasCompletedWindDown).map((record) => record.date));
  let cursor = completedDates.has(todayKey()) ? new Date() : addDays(new Date(), -1);
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

function countCurrentStreak(records: SleepRecord[]): number {
  const successDates = new Set(records.filter((record) => record.success).map((record) => record.date));
  let cursor = successDates.has(todayKey()) ? new Date() : addDays(new Date(), -1);
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
  config: UserConfig
): GrowthStats {
  const sessions = Object.values(sessionsByDate);
  const now = new Date();
  const weekStart = startOfWeek(now);
  const weekEnd = addDays(weekStart, 6);
  const previousWeekStart = addDays(weekStart, -7);
  const previousWeekEnd = addDays(weekStart, -1);
  const monthStart = startOfMonth(now);
  const monthEnd = addDays(addMonths(monthStart, 1), -1);
  const previousMonthStart = addMonths(monthStart, -1);
  const previousMonthEnd = addDays(monthStart, -1);

  const weeklyRecords = recordsInRange(records, weekStart, weekEnd);
  const previousWeeklyRecords = recordsInRange(records, previousWeekStart, previousWeekEnd);
  const monthlyRecords = recordsInRange(records, monthStart, monthEnd);
  const previousMonthlyRecords = recordsInRange(records, previousMonthStart, previousMonthEnd);

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
  const previousFailures = previousMonthlyRecords.filter((record) => !record.success).length;
  const monthFailures = monthlyRecords.filter((record) => !record.success).length;
  const allFailures = records.filter((record) => !record.success).length;
  const firstMonthRecords = records.length ? records.filter((record) => record.date.startsWith(records[0].date.slice(0, 7))) : [];
  const firstMonthFailures = firstMonthRecords.filter((record) => !record.success).length;

  const monthlyAverageCopy = formatAverageDelta(monthlyDelta);

  return {
    averageDeltaMinutes,
    ...formatAverageDelta(averageDeltaMinutes),
    monthAverageLabel: monthlyAverageCopy.averageLabel,
    monthStatusLabel: monthlyAverageCopy.statusLabel,
    reviewCount: weekReviews.length,
    pauseCount: weekSessions.filter((session) => session.shutdownChallengeCompleted || session.hasUrgeToScroll).length,
    goodMoodCount: weeklyRecords.filter((record) => goodMoodLabels.has(record.moodNextMorning ?? "")).length,
    stableNightCount: monthlyRecords.filter((record) => record.success).length,
    cumulativeReviewCount: reviews.length,
    longestStreak: countLongestStreak(records),
    lessLateCount: Math.max(0, previousFailures - monthFailures, firstMonthFailures - allFailures),
    startBeforeTargetCount: countStartBeforeTarget(monthSessions.length ? monthSessions : sessions, config),
    weekBars: createWeekBars(records, weekStart),
    monthPoints: createFourWeekPoints(records, monthStart),
    allPoints: createSixMonthPoints(records, now)
  };
}

export function buildGrowthStatsFromExecutionRecords(
  executionRecords: DailyExecutionRecord[],
  legacySleepRecords: SleepRecord[],
  sessionsByDate: Record<string, RescueSession>,
  reviews: TodayReview[],
  config: UserConfig
): GrowthStats {
  const now = new Date();
  const weekStart = startOfWeek(now);
  const weekEnd = addDays(weekStart, 6);
  const monthStart = startOfMonth(now);
  const monthEnd = addDays(addMonths(monthStart, 1), -1);
  const executionDates = executionDateSet(executionRecords);
  const legacyRecords = legacySleepRecords.filter((record) => !executionDates.has(record.date));
  const sleepRecords = [...executionSleepRecords(executionRecords), ...legacyRecords].sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  const weeklyExecutions = executionRecords.filter((record) => inRange(record.date, weekStart, weekEnd));
  const monthlyExecutions = executionRecords.filter((record) => inRange(record.date, monthStart, monthEnd));
  const legacyReviews = reviews.filter((review) => !executionDates.has(review.date));
  const legacySessions = Object.values(sessionsByDate).filter((session) => !executionDates.has(session.date));
  const legacyStats = buildGrowthStats(sleepRecords, Object.fromEntries(legacySessions.map((session) => [session.date, session])), legacyReviews, config);
  const weeklyPauseCount = weeklyExecutions.reduce(
    (sum, record) => sum + record.rescuePauseCount + record.shutdownChallengeCount,
    0
  );
  const monthlyCompletedCount = monthlyExecutions.filter(executionHasCompletedWindDown).length;
  const weeklyGoodMoodCount = weeklyExecutions.filter((record) => record.morningMood === "good" || record.morningMood === "okay").length;
  const weeklyReviewCount = weeklyExecutions.filter((record) => Boolean(record.reviewCompletedAt)).length;
  const allReviewCount = executionRecords.filter((record) => Boolean(record.reviewCompletedAt)).length;

  return {
    ...legacyStats,
    reviewCount: weeklyReviewCount + legacyStats.reviewCount,
    pauseCount: weeklyPauseCount + legacyStats.pauseCount,
    goodMoodCount: weeklyGoodMoodCount + legacyStats.goodMoodCount,
    stableNightCount: monthlyCompletedCount + legacyStats.stableNightCount,
    cumulativeReviewCount: allReviewCount + legacyReviews.length,
    longestStreak: Math.max(countLongestExecutionStreak(executionRecords), legacyStats.longestStreak),
    startBeforeTargetCount: countExecutionStartBeforeTarget(monthlyExecutions.length ? monthlyExecutions : executionRecords, config) + legacyStats.startBeforeTargetCount,
    monthPoints: executionRecords.length ? createFourWeekExecutionPoints(executionRecords, monthStart) : legacyStats.monthPoints,
    allPoints: executionRecords.length ? createSixMonthExecutionPoints(executionRecords, now) : legacyStats.allPoints
  };
}

export function getCurrentSleepStreak(records: SleepRecord[]): number {
  return countCurrentStreak(records);
}

export function getCurrentExecutionStreak(records: DailyExecutionRecord[]): number {
  return countExecutionStreak(records);
}
