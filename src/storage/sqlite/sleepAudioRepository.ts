import { SleepAudioEvent, SleepAudioSession, SleepAudioSessionStatus } from "@/types/app";
import { getLocalDatabase, runLocalDatabaseMigrations } from "@/storage/sqlite/database";

type SleepAudioSessionRow = {
  id: string;
  daily_cycle_id: string;
  date: string;
  status: SleepAudioSessionStatus;
  started_at?: string | null;
  stopped_at?: string | null;
  local_audio_uri?: string | null;
  event_count: number;
  summary_json?: string | null;
  created_at: string;
  updated_at: string;
};

type SleepAudioEventRow = {
  id: string;
  started_at: string;
  duration_ms: number;
  type: SleepAudioEvent["type"];
  confidence?: number | null;
  local_clip_uri?: string | null;
};

const emptyToUndefined = <T>(value: T | null | undefined): T | undefined => value ?? undefined;

function dailyCycleIdForDate(date: string): string {
  return `daily-cycle:${date}`;
}

function parseSummary(value?: string | null): SleepAudioSession["summary"] {
  if (!value) {
    return undefined;
  }

  try {
    return JSON.parse(value) as SleepAudioSession["summary"];
  } catch {
    return undefined;
  }
}

async function getEventsForSession(sessionId: string): Promise<SleepAudioEvent[]> {
  const db = await getLocalDatabase();
  const rows = await db.getAllAsync<SleepAudioEventRow>(
    "select * from sleep_audio_events where sleep_audio_session_id = ? order by started_at asc",
    sessionId
  );

  return rows.map((row) => ({
    id: row.id,
    startedAt: row.started_at,
    durationMs: row.duration_ms,
    type: row.type,
    confidence: emptyToUndefined(row.confidence),
    localClipUri: emptyToUndefined(row.local_clip_uri)
  }));
}

async function mapRowToSleepAudioSession(row: SleepAudioSessionRow): Promise<SleepAudioSession> {
  const events = await getEventsForSession(row.id);

  return {
    id: row.id,
    date: row.date,
    status: row.status,
    startedAt: emptyToUndefined(row.started_at),
    stoppedAt: emptyToUndefined(row.stopped_at),
    localAudioUri: emptyToUndefined(row.local_audio_uri),
    eventCount: row.event_count,
    events,
    summary: parseSummary(row.summary_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function getSleepAudioSessionsFromSQLite(): Promise<SleepAudioSession[]> {
  await runLocalDatabaseMigrations();
  const db = await getLocalDatabase();
  const rows = await db.getAllAsync<SleepAudioSessionRow>(
    "select * from sleep_audio_sessions order by date asc"
  );
  return Promise.all(rows.map(mapRowToSleepAudioSession));
}

export async function upsertSleepAudioSessionToSQLite(session: SleepAudioSession): Promise<void> {
  await runLocalDatabaseMigrations();
  const db = await getLocalDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `
        insert into sleep_audio_sessions (
          id,
          daily_cycle_id,
          date,
          status,
          started_at,
          stopped_at,
          local_audio_uri,
          event_count,
          summary_json,
          created_at,
          updated_at,
          sync_status
        )
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        on conflict(id) do update set
          status = excluded.status,
          started_at = excluded.started_at,
          stopped_at = excluded.stopped_at,
          local_audio_uri = excluded.local_audio_uri,
          event_count = excluded.event_count,
          summary_json = excluded.summary_json,
          updated_at = excluded.updated_at,
          sync_status = 'pending'
      `,
      session.id,
      dailyCycleIdForDate(session.date),
      session.date,
      session.status,
      session.startedAt ?? null,
      session.stoppedAt ?? null,
      session.localAudioUri ?? null,
      session.eventCount,
      session.summary ? JSON.stringify(session.summary) : null,
      session.createdAt,
      session.updatedAt
    );

    await db.runAsync("delete from sleep_audio_events where sleep_audio_session_id = ?", session.id);
    for (const event of session.events) {
      await db.runAsync(
        `
          insert into sleep_audio_events (
            id,
            sleep_audio_session_id,
            started_at,
            duration_ms,
            type,
            confidence,
            local_clip_uri,
            created_at,
            sync_status
          )
          values (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        `,
        event.id,
        session.id,
        event.startedAt,
        event.durationMs,
        event.type,
        event.confidence ?? null,
        event.localClipUri ?? null,
        session.updatedAt
      );
    }
  });
}

export async function replaceSleepAudioSessionsInSQLite(sessions: SleepAudioSession[]): Promise<void> {
  await runLocalDatabaseMigrations();
  const db = await getLocalDatabase();
  await db.runAsync("delete from sleep_audio_events");
  await db.runAsync("delete from sleep_audio_sessions");

  for (const session of sessions) {
    await upsertSleepAudioSessionToSQLite(session);
  }
}

export async function clearSleepAudioSessionsFromSQLite(): Promise<void> {
  await runLocalDatabaseMigrations();
  const db = await getLocalDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync("delete from sleep_audio_events");
    await db.runAsync("delete from sleep_audio_sessions");
  });
}
