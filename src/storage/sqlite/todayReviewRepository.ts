import { TodayReview } from "@/types/app";
import { getLocalDatabase, runLocalDatabaseMigrations } from "@/storage/sqlite/database";
import type { LocalSyncStatus } from "@/storage/sqlite/dailyCycleRepository";

type TodayReviewRow = {
  id: string;
  daily_cycle_id: string;
  date: string;
  mood?: string | null;
  happened_today: string;
  completed_today: string;
  unfinished_today: string;
  tomorrow_plan: string;
  closing_note: string;
  affirmation?: string | null;
  minimal_mode: number;
  created_at: string;
  updated_at: string;
};

const fromInteger = (value?: number | null) => Boolean(value);
const toInteger = (value?: boolean) => (value ? 1 : 0);
const emptyToUndefined = <T>(value: T | null | undefined): T | undefined => value ?? undefined;

function dailyCycleIdForDate(date: string): string {
  return `daily-cycle:${date}`;
}

function mapRowToTodayReview(row: TodayReviewRow): TodayReview {
  return {
    id: row.id,
    date: row.date,
    sessionId: row.daily_cycle_id,
    mood: emptyToUndefined(row.mood),
    happenedToday: row.happened_today,
    completedToday: row.completed_today,
    unfinishedToday: row.unfinished_today,
    tomorrowPlan: row.tomorrow_plan,
    closingNote: row.closing_note,
    affirmation: emptyToUndefined(row.affirmation),
    minimalMode: fromInteger(row.minimal_mode),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function getTodayReviewsFromSQLite(): Promise<TodayReview[]> {
  await runLocalDatabaseMigrations();
  const db = await getLocalDatabase();
  const rows = await db.getAllAsync<TodayReviewRow>(
    "select * from today_reviews order by date asc"
  );
  return rows.map(mapRowToTodayReview);
}

export async function upsertTodayReviewToSQLite(
  review: TodayReview,
  options: { syncStatus?: LocalSyncStatus } = {}
): Promise<void> {
  await runLocalDatabaseMigrations();
  const db = await getLocalDatabase();
  const syncStatus = options.syncStatus ?? "pending";
  await db.runAsync(
    `
      insert into today_reviews (
        id,
        daily_cycle_id,
        date,
        mood,
        happened_today,
        completed_today,
        unfinished_today,
        tomorrow_plan,
        closing_note,
        affirmation,
        minimal_mode,
        created_at,
        updated_at,
        sync_status
      )
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      on conflict(id) do update set
        mood = excluded.mood,
        happened_today = excluded.happened_today,
        completed_today = excluded.completed_today,
        unfinished_today = excluded.unfinished_today,
        tomorrow_plan = excluded.tomorrow_plan,
        closing_note = excluded.closing_note,
        affirmation = excluded.affirmation,
        minimal_mode = excluded.minimal_mode,
        updated_at = excluded.updated_at,
        sync_status = ?
    `,
    review.id,
    dailyCycleIdForDate(review.date),
    review.date,
    review.mood ?? null,
    review.happenedToday,
    review.completedToday,
    review.unfinishedToday,
    review.tomorrowPlan,
    review.closingNote,
    review.affirmation ?? null,
    toInteger(review.minimalMode),
    review.createdAt,
    review.updatedAt,
    syncStatus,
    syncStatus
  );
}

export async function replaceTodayReviewsInSQLite(
  reviews: TodayReview[],
  options: { syncStatus?: LocalSyncStatus } = {}
): Promise<void> {
  await runLocalDatabaseMigrations();
  const db = await getLocalDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync("delete from today_reviews");
    for (const review of reviews) {
      await upsertTodayReviewToSQLite(review, options);
    }
  });
}

export async function clearTodayReviewsFromSQLite(): Promise<void> {
  await runLocalDatabaseMigrations();
  const db = await getLocalDatabase();
  await db.runAsync("delete from today_reviews");
}
