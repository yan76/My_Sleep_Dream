import { runLocalDatabaseMigrations } from "@/storage/sqlite/database";
import { migrateLegacyDailyCyclesToSQLite } from "@/storage/sqlite/legacyMigration";

export async function initializeLocalDataLayer(): Promise<void> {
  await runLocalDatabaseMigrations();
  await migrateLegacyDailyCyclesToSQLite();
}
