import { DailyExecutionRecord, DailyExecutionStatus, LateNightReason, MorningMood, SleepResult } from "@/types/app";
import { getLocalDatabase, runLocalDatabaseMigrations } from "@/storage/sqlite/database";

export type LocalSyncStatus = "local_only" | "pending" | "synced";

type DailyCycleRow = {
  date: string;
  status: DailyExecutionStatus;
  planned_sleep_time: string;
  wake_up_time: string;
  ritual_started_at?: string | null;
  external_closed_at?: string | null;
  review_completed_at?: string | null;
  sleep_aid_started_at?: string | null;
  ready_to_sleep_at?: string | null;
  checkin_completed_at?: string | null;
  feedback_viewed_at?: string | null;
  used_sound_spa: number;
  used_tree_hole: number;
  used_sleep_generator: number;
  shutdown_challenge_count: number;
  rescue_pause_count: number;
  actual_sleep_time?: string | null;
  sleep_result?: SleepResult | null;
  morning_mood?: MorningMood | null;
  late_reason?: LateNightReason | null;
  sleep_audio_enabled: number;
  sleep_audio_session_id?: string | null;
  created_at: string;
  updated_at: string;
};

const toInteger = (value?: boolean) => (value ? 1 : 0);
const fromInteger = (value?: number | null) => Boolean(value);
const emptyToUndefined = <T>(value: T | null | undefined): T | undefined => value ?? undefined;

function dailyCycleIdForDate(date: string): string {
  return `daily-cycle:${date}`;
}

function mapRowToDailyCycle(row: DailyCycleRow): DailyExecutionRecord {
  return {
    date: row.date,
    plannedSleepTime: row.planned_sleep_time,
    wakeUpTime: row.wake_up_time,
    status: row.status,
    ritualStartedAt: emptyToUndefined(row.ritual_started_at),
    externalClosedAt: emptyToUndefined(row.external_closed_at),
    reviewCompletedAt: emptyToUndefined(row.review_completed_at),
    sleepAidStartedAt: emptyToUndefined(row.sleep_aid_started_at),
    readyToSleepAt: emptyToUndefined(row.ready_to_sleep_at),
    checkinCompletedAt: emptyToUndefined(row.checkin_completed_at),
    feedbackViewedAt: emptyToUndefined(row.feedback_viewed_at),
    usedSoundSpa: fromInteger(row.used_sound_spa),
    usedTreeHole: fromInteger(row.used_tree_hole),
    usedSleepGenerator: fromInteger(row.used_sleep_generator),
    shutdownChallengeCount: row.shutdown_challenge_count,
    rescuePauseCount: row.rescue_pause_count,
    actualSleepTime: emptyToUndefined(row.actual_sleep_time),
    sleepResult: emptyToUndefined(row.sleep_result),
    morningMood: emptyToUndefined(row.morning_mood),
    lateReason: emptyToUndefined(row.late_reason),
    sleepAudioEnabled: fromInteger(row.sleep_audio_enabled),
    sleepAudioSessionId: emptyToUndefined(row.sleep_audio_session_id),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function getDailyCyclesFromSQLite(): Promise<DailyExecutionRecord[]> {
  await runLocalDatabaseMigrations();
  const db = await getLocalDatabase();
  const rows = await db.getAllAsync<DailyCycleRow>(
    "select * from daily_cycles where deleted_at is null order by date asc"
  );
  return rows.map(mapRowToDailyCycle);
}

export async function getDailyCycleFromSQLiteByDate(date: string): Promise<DailyExecutionRecord | null> {
  await runLocalDatabaseMigrations();
  const db = await getLocalDatabase();
  const row = await db.getFirstAsync<DailyCycleRow>(
    "select * from daily_cycles where date = ? and deleted_at is null",
    date
  );
  return row ? mapRowToDailyCycle(row) : null;
}

export async function upsertDailyCycleToSQLite(
  record: DailyExecutionRecord,
  options: { syncStatus?: LocalSyncStatus } = {}
): Promise<void> {
  await runLocalDatabaseMigrations();
  const db = await getLocalDatabase();
  const syncStatus = options.syncStatus ?? "pending";
  await db.runAsync(
    `
      insert into daily_cycles (
        id,
        date,
        status,
        planned_sleep_time,
        wake_up_time,
        ritual_started_at,
        external_closed_at,
        review_completed_at,
        sleep_aid_started_at,
        ready_to_sleep_at,
        checkin_completed_at,
        feedback_viewed_at,
        used_sound_spa,
        used_tree_hole,
        used_sleep_generator,
        shutdown_challenge_count,
        rescue_pause_count,
        actual_sleep_time,
        sleep_result,
        morning_mood,
        late_reason,
        sleep_audio_enabled,
        sleep_audio_session_id,
        created_at,
        updated_at,
        sync_status
      )
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      on conflict(date) do update set
        status = excluded.status,
        planned_sleep_time = excluded.planned_sleep_time,
        wake_up_time = excluded.wake_up_time,
        ritual_started_at = excluded.ritual_started_at,
        external_closed_at = excluded.external_closed_at,
        review_completed_at = excluded.review_completed_at,
        sleep_aid_started_at = excluded.sleep_aid_started_at,
        ready_to_sleep_at = excluded.ready_to_sleep_at,
        checkin_completed_at = excluded.checkin_completed_at,
        feedback_viewed_at = excluded.feedback_viewed_at,
        used_sound_spa = excluded.used_sound_spa,
        used_tree_hole = excluded.used_tree_hole,
        used_sleep_generator = excluded.used_sleep_generator,
        shutdown_challenge_count = excluded.shutdown_challenge_count,
        rescue_pause_count = excluded.rescue_pause_count,
        actual_sleep_time = excluded.actual_sleep_time,
        sleep_result = excluded.sleep_result,
        morning_mood = excluded.morning_mood,
        late_reason = excluded.late_reason,
        sleep_audio_enabled = excluded.sleep_audio_enabled,
        sleep_audio_session_id = excluded.sleep_audio_session_id,
        updated_at = excluded.updated_at,
        sync_status = ?
    `,
    dailyCycleIdForDate(record.date),
    record.date,
    record.status,
    record.plannedSleepTime,
    record.wakeUpTime,
    record.ritualStartedAt ?? null,
    record.externalClosedAt ?? null,
    record.reviewCompletedAt ?? null,
    record.sleepAidStartedAt ?? null,
    record.readyToSleepAt ?? null,
    record.checkinCompletedAt ?? null,
    record.feedbackViewedAt ?? null,
    toInteger(record.usedSoundSpa),
    toInteger(record.usedTreeHole),
    toInteger(record.usedSleepGenerator),
    record.shutdownChallengeCount,
    record.rescuePauseCount,
    record.actualSleepTime ?? null,
    record.sleepResult ?? null,
    record.morningMood ?? null,
    record.lateReason ?? null,
    toInteger(record.sleepAudioEnabled),
    record.sleepAudioSessionId ?? null,
    record.createdAt,
    record.updatedAt,
    syncStatus,
    syncStatus
  );
}

export async function replaceDailyCyclesInSQLite(
  records: DailyExecutionRecord[],
  options: { syncStatus?: LocalSyncStatus } = {}
): Promise<void> {
  await runLocalDatabaseMigrations();
  const db = await getLocalDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync("delete from daily_cycles");
    for (const record of records) {
      await upsertDailyCycleToSQLite(record, options);
    }
  });
}

export async function clearDailyCyclesFromSQLite(): Promise<void> {
  await runLocalDatabaseMigrations();
  const db = await getLocalDatabase();
  await db.runAsync("delete from daily_cycles");
}
