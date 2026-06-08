import { appStorage } from "@/storage/appStorage";
import { replaceDailyCyclesInSQLite } from "@/storage/sqlite/dailyCycleRepository";
import { replaceSleepAudioSessionsInSQLite } from "@/storage/sqlite/sleepAudioRepository";
import { replaceSleepRecordsInSQLite } from "@/storage/sqlite/sleepRecordRepository";
import { replaceTodayReviewsInSQLite } from "@/storage/sqlite/todayReviewRepository";
import { storageKeys } from "@/storage/storageKeys";
import { DailyExecutionRecord, SleepAudioSession, SleepRecord, TodayReview } from "@/types/app";

const SQLITE_MIGRATION_VERSION = "daily-cycles-v1";

export async function migrateLegacyDailyCyclesToSQLite(): Promise<void> {
  const currentVersion = await appStorage.getItem(storageKeys.sqliteMigrationVersion);

  if (currentVersion === SQLITE_MIGRATION_VERSION) {
    return;
  }

  try {
    const legacyValue = await appStorage.getItem(storageKeys.dailyExecutionRecords);
    const legacyRecords = legacyValue
      ? (Object.values(JSON.parse(legacyValue)) as DailyExecutionRecord[])
      : [];

    const legacyReviewsValue = await appStorage.getItem(storageKeys.todayReviews);
    const legacyReviews = legacyReviewsValue
      ? (Object.values(JSON.parse(legacyReviewsValue)) as TodayReview[])
      : [];
    const legacySleepRecordsValue = await appStorage.getItem(storageKeys.sleepRecords);
    const legacySleepRecords = legacySleepRecordsValue
      ? (Object.values(JSON.parse(legacySleepRecordsValue)) as SleepRecord[])
      : [];
    const legacySleepAudioSessionsValue = await appStorage.getItem(storageKeys.sleepAudioSessions);
    const legacySleepAudioSessions = legacySleepAudioSessionsValue
      ? (Object.values(JSON.parse(legacySleepAudioSessionsValue)) as SleepAudioSession[])
      : [];

    if (legacyRecords.length > 0) {
      await replaceDailyCyclesInSQLite(legacyRecords);
    }

    if (legacyReviews.length > 0) {
      await replaceTodayReviewsInSQLite(legacyReviews);
    }

    if (legacySleepRecords.length > 0) {
      await replaceSleepRecordsInSQLite(legacySleepRecords);
    }

    if (legacySleepAudioSessions.length > 0) {
      await replaceSleepAudioSessionsInSQLite(legacySleepAudioSessions);
    }

    await appStorage.setItem(storageKeys.sqliteMigrationVersion, SQLITE_MIGRATION_VERSION);
  } catch (error) {
    console.warn("[sqlite] Failed to migrate legacy daily cycles", error);
  }
}
