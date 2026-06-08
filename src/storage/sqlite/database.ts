import * as SQLite from "expo-sqlite";
import { localSchemaMigrations } from "@/storage/sqlite/schema";

const DATABASE_NAME = "my_sleep_dream.db";

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
let migrationPromise: Promise<void> | null = null;

export function getLocalDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync(DATABASE_NAME);
  }

  return databasePromise;
}

export async function runLocalDatabaseMigrations(): Promise<void> {
  if (migrationPromise) {
    return migrationPromise;
  }

  migrationPromise = (async () => {
    const db = await getLocalDatabase();
    await db.execAsync("pragma foreign_keys = on;");
    await db.execAsync(`
      create table if not exists schema_migrations (
        version integer primary key,
        name text not null,
        applied_at text not null
      );
    `);

    const appliedRows = await db.getAllAsync<{ version: number }>(
      "select version from schema_migrations"
    );
    const appliedVersions = new Set(appliedRows.map((row) => row.version));

    for (const migration of localSchemaMigrations) {
      if (appliedVersions.has(migration.version)) {
        continue;
      }

      await db.withTransactionAsync(async () => {
        await db.execAsync(migration.sql);
        await db.runAsync(
          "insert into schema_migrations (version, name, applied_at) values (?, ?, ?)",
          migration.version,
          migration.name,
          new Date().toISOString()
        );
      });
    }
  })();

  return migrationPromise;
}
