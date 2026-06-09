import { isDemoMode } from "@/constants/demo";
import { getDailyExecutionRecords } from "@/storage/dailyExecutionStorage";
import {
  DemoPendingWeekRollover,
  getDemoPendingWeekRollover,
  resolveGrowthTodayKey,
  setDemoPendingWeekRollover,
  setStoredDemoCycleDate
} from "@/storage/demoCycleDateStorage";
import {
  getRescueSessions,
  getSleepRecords,
  getTodayReviews,
  getUserConfig,
  seedGrowthTestData
} from "@/storage/rescueSessionStorage";
import { DailyExecutionRecord, RescueSession, SleepRecord, TodayReview, UserConfig } from "@/types/app";
import { addDays, startOfGrowthWeek, todayKey } from "@/utils/date";
import { buildGrowthStatsFromExecutionRecords, GrowthStats } from "@/utils/growth";

export type GrowthData = {
  records: SleepRecord[];
  executionRecords: DailyExecutionRecord[];
  sessions: Record<string, RescueSession>;
  reviews: TodayReview[];
  config: UserConfig;
  currentDate: string;
  hasPendingWeekRollover: boolean;
};

function dateFromKey(date: string): Date {
  return new Date(`${date}T00:00:00`);
}

function isCompletedExecution(record: DailyExecutionRecord | undefined): boolean {
  return record?.status === "checked_in" || record?.status === "feedback_viewed" || Boolean(record?.checkinCompletedAt);
}

function hasAnyGrowthSignal(date: string, data: Pick<GrowthData, "records" | "executionRecords" | "sessions" | "reviews">): boolean {
  return Boolean(
    data.records.some((record) => record.date === date) ||
      data.executionRecords.some((record) => record.date === date) ||
      data.sessions[date] ||
      data.reviews.some((review) => review.date === date)
  );
}

function hasCompletedGrowthSignal(date: string, data: Pick<GrowthData, "records" | "executionRecords" | "sessions">): boolean {
  const executionRecord = data.executionRecords.find((record) => record.date === date);
  return Boolean(
    data.records.some((record) => record.date === date) ||
      isCompletedExecution(executionRecord) ||
      data.sessions[date]?.status === "completed"
  );
}

async function restoreDemoPendingWeekRolloverIfNeeded(
  currentDate: string,
  data: Pick<GrowthData, "records" | "executionRecords" | "sessions" | "reviews">
): Promise<DemoPendingWeekRollover | null> {
  if (!isDemoMode) {
    return null;
  }

  const currentDateValue = dateFromKey(currentDate);
  const currentWeekStart = todayKey(startOfGrowthWeek(currentDateValue));
  if (currentDate !== currentWeekStart || hasAnyGrowthSignal(currentDate, data)) {
    return null;
  }

  const completedWeekDate = todayKey(addDays(currentDateValue, -1));
  if (!hasCompletedGrowthSignal(completedWeekDate, data)) {
    return null;
  }

  const pendingWeekRollover = {
    completedWeekDate,
    nextDate: currentDate
  };
  await setStoredDemoCycleDate(completedWeekDate);
  await setDemoPendingWeekRollover(pendingWeekRollover);
  return pendingWeekRollover;
}

export async function loadGrowthData(): Promise<GrowthData> {
  const [records, executionRecords, sessions, reviews, config, currentDate, pendingWeekRollover] = await Promise.all([
    getSleepRecords(),
    getDailyExecutionRecords(),
    getRescueSessions(),
    getTodayReviews(),
    getUserConfig(),
    resolveGrowthTodayKey(),
    getDemoPendingWeekRollover()
  ]);
  const restoredPendingWeekRollover = pendingWeekRollover ?? await restoreDemoPendingWeekRolloverIfNeeded(currentDate, {
    records,
    executionRecords,
    sessions,
    reviews
  });
  const effectivePendingWeekRollover = pendingWeekRollover ?? restoredPendingWeekRollover;
  const effectiveCurrentDate = effectivePendingWeekRollover?.completedWeekDate ?? currentDate;

  return {
    records,
    executionRecords,
    sessions,
    reviews,
    config,
    currentDate: effectiveCurrentDate,
    hasPendingWeekRollover: Boolean(effectivePendingWeekRollover)
  };
}

export function buildGrowthStats(data: GrowthData): GrowthStats {
  return buildGrowthStatsFromExecutionRecords(
    data.executionRecords,
    data.records,
    data.sessions,
    data.reviews,
    data.config,
    data.currentDate
  );
}

export { seedGrowthTestData };
