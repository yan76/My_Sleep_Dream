import { SleepRecord } from "@/types/app";
import { getLocalDatabase, runLocalDatabaseMigrations } from "@/storage/sqlite/database";
import type { LocalSyncStatus } from "@/storage/sqlite/dailyCycleRepository";

type SleepRecordRow = {
  id: string;
  daily_cycle_id: string;
  date: string;
  planned_sleep_time: string;
  actual_sleep_time?: string | null;
  sleep_result?: string | null;
  morning_mood?: string | null;
  late_reason?: string | null;
  reflection?: string | null;
  created_at: string;
  updated_at: string;
};

const emptyToUndefined = <T>(value: T | null | undefined): T | undefined => value ?? undefined;

function dailyCycleIdForDate(date: string): string {
  return `daily-cycle:${date}`;
}

function mapRowToSleepRecord(row: SleepRecordRow): SleepRecord {
  return {
    id: row.id,
    date: row.date,
    sessionId: row.daily_cycle_id,
    plannedSleepTime: row.planned_sleep_time,
    actualSleepTime: emptyToUndefined(row.actual_sleep_time),
    success: row.sleep_result === "near_target",
    reasonIfFailed: emptyToUndefined(row.late_reason ?? row.reflection),
    moodNextMorning:
      row.morning_mood === "good" ? "精神不错" : row.morning_mood === "okay" ? "还可以" : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function getSleepRecordsFromSQLite(): Promise<SleepRecord[]> {
  await runLocalDatabaseMigrations();
  const db = await getLocalDatabase();
  const rows = await db.getAllAsync<SleepRecordRow>(
    "select * from sleep_records order by date asc"
  );
  return rows.map(mapRowToSleepRecord);
}

export async function upsertSleepRecordToSQLite(
  record: SleepRecord,
  options: { syncStatus?: LocalSyncStatus } = {}
): Promise<void> {
  await runLocalDatabaseMigrations();
  const db = await getLocalDatabase();
  const syncStatus = options.syncStatus ?? "pending";
  await db.runAsync(
    `
      insert into sleep_records (
        id,
        daily_cycle_id,
        date,
        planned_sleep_time,
        actual_sleep_time,
        sleep_result,
        morning_mood,
        late_reason,
        reflection,
        created_at,
        updated_at,
        sync_status
      )
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      on conflict(id) do update set
        planned_sleep_time = excluded.planned_sleep_time,
        actual_sleep_time = excluded.actual_sleep_time,
        sleep_result = excluded.sleep_result,
        morning_mood = excluded.morning_mood,
        late_reason = excluded.late_reason,
        reflection = excluded.reflection,
        updated_at = excluded.updated_at,
        sync_status = ?
    `,
    record.id,
    dailyCycleIdForDate(record.date),
    record.date,
    record.plannedSleepTime,
    record.actualSleepTime ?? null,
    record.success ? "near_target" : "very_late",
    record.moodNextMorning === "精神不错" ? "good" : record.moodNextMorning === "还可以" ? "okay" : null,
    record.reasonIfFailed ?? null,
    record.reasonIfFailed ?? null,
    record.createdAt,
    record.updatedAt,
    syncStatus,
    syncStatus
  );
}

export async function replaceSleepRecordsInSQLite(
  records: SleepRecord[],
  options: { syncStatus?: LocalSyncStatus } = {}
): Promise<void> {
  await runLocalDatabaseMigrations();
  const db = await getLocalDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync("delete from sleep_records");
    for (const record of records) {
      await upsertSleepRecordToSQLite(record, options);
    }
  });
}

export async function clearSleepRecordsFromSQLite(): Promise<void> {
  await runLocalDatabaseMigrations();
  const db = await getLocalDatabase();
  await db.runAsync("delete from sleep_records");
}
