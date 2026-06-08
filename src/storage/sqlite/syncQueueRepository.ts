import { getLocalDatabase, runLocalDatabaseMigrations } from "@/storage/sqlite/database";

export type SyncOperation = "create" | "update" | "delete";

export type SyncQueueItem = {
  id: string;
  entityType: string;
  entityId: string;
  operation: SyncOperation;
  payloadJson: string;
  attempts: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
};

type SyncQueueRow = {
  id: string;
  entity_type: string;
  entity_id: string;
  operation: SyncOperation;
  payload_json: string;
  attempts: number;
  last_error?: string | null;
  created_at: string;
  updated_at: string;
};

function mapRow(row: SyncQueueRow): SyncQueueItem {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    operation: row.operation,
    payloadJson: row.payload_json,
    attempts: row.attempts,
    lastError: row.last_error ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function enqueueSyncItem(input: {
  entityType: string;
  entityId: string;
  operation: SyncOperation;
  payload: unknown;
}): Promise<SyncQueueItem> {
  await runLocalDatabaseMigrations();
  const db = await getLocalDatabase();
  const now = new Date().toISOString();
  const item: SyncQueueItem = {
    id: `sync:${input.entityType}:${input.entityId}:${Date.now()}`,
    entityType: input.entityType,
    entityId: input.entityId,
    operation: input.operation,
    payloadJson: JSON.stringify(input.payload),
    attempts: 0,
    createdAt: now,
    updatedAt: now
  };

  await db.runAsync(
    "delete from sync_queue where entity_type = ? and entity_id = ?",
    input.entityType,
    input.entityId
  );

  await db.runAsync(
    `
      insert into sync_queue (
        id,
        entity_type,
        entity_id,
        operation,
        payload_json,
        attempts,
        last_error,
        created_at,
        updated_at
      )
      values (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    item.id,
    item.entityType,
    item.entityId,
    item.operation,
    item.payloadJson,
    item.attempts,
    null,
    item.createdAt,
    item.updatedAt
  );

  return item;
}

export async function getPendingSyncItems(limit = 50): Promise<SyncQueueItem[]> {
  await runLocalDatabaseMigrations();
  const db = await getLocalDatabase();
  const rows = await db.getAllAsync<SyncQueueRow>(
    "select * from sync_queue order by created_at asc limit ?",
    limit
  );
  return rows.map(mapRow);
}

export async function markSyncAttempt(itemId: string, lastError?: string): Promise<void> {
  await runLocalDatabaseMigrations();
  const db = await getLocalDatabase();
  await db.runAsync(
    "update sync_queue set attempts = attempts + 1, last_error = ?, updated_at = ? where id = ?",
    lastError ?? null,
    new Date().toISOString(),
    itemId
  );
}

export async function removeSyncItem(itemId: string): Promise<void> {
  await runLocalDatabaseMigrations();
  const db = await getLocalDatabase();
  await db.runAsync("delete from sync_queue where id = ?", itemId);
}

export async function clearSyncQueue(): Promise<void> {
  await runLocalDatabaseMigrations();
  const db = await getLocalDatabase();
  await db.runAsync("delete from sync_queue");
}
