import { getDailyExecutionRecords } from "@/storage/dailyExecutionStorage";
import {
  getRescueSessions,
  getSleepRecords,
  getTodayReviews,
  getUserConfig,
  seedGrowthTestData
} from "@/storage/rescueSessionStorage";
import { DailyExecutionRecord, RescueSession, SleepRecord, TodayReview, UserConfig } from "@/types/app";
import { buildGrowthStatsFromExecutionRecords, GrowthStats } from "@/utils/growth";

export type GrowthData = {
  records: SleepRecord[];
  executionRecords: DailyExecutionRecord[];
  sessions: Record<string, RescueSession>;
  reviews: TodayReview[];
  config: UserConfig;
};

export async function loadGrowthData(): Promise<GrowthData> {
  const [records, executionRecords, sessions, reviews, config] = await Promise.all([
    getSleepRecords(),
    getDailyExecutionRecords(),
    getRescueSessions(),
    getTodayReviews(),
    getUserConfig()
  ]);

  return { records, executionRecords, sessions, reviews, config };
}

export function buildGrowthStats(data: GrowthData): GrowthStats {
  return buildGrowthStatsFromExecutionRecords(
    data.executionRecords,
    data.records,
    data.sessions,
    data.reviews,
    data.config
  );
}

export { seedGrowthTestData };
