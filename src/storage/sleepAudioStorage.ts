import { appStorage } from "@/storage/appStorage";
import {
  clearSleepAudioSessionsFromSQLite,
  getSleepAudioSessionsFromSQLite,
  replaceSleepAudioSessionsInSQLite
} from "@/storage/sqlite/sleepAudioRepository";
import { storageKeys } from "@/storage/storageKeys";
import { SleepAudioSession, SleepAudioSessionStatus } from "@/types/app";

type StoredSleepAudioSessions = Record<string, SleepAudioSession>;
type SleepAudioSessionPatch = Partial<Pick<SleepAudioSession, "events" | "eventCount" | "localAudioUri" | "summary">>;

const nowIso = () => new Date().toISOString();
const sleepAudioSessionIdForDate = (date: string) => `sleep-audio-session:${date}`;

async function readSleepAudioMap(): Promise<StoredSleepAudioSessions> {
  try {
    const value = await appStorage.getItem(storageKeys.sleepAudioSessions);
    const sessions = value ? (JSON.parse(value) as StoredSleepAudioSessions) : {};
    if (Object.keys(sessions).length > 0) {
      return sessions;
    }
  } catch (error) {
    console.warn("[storage] Failed to read sleep audio sessions", error);
  }

  try {
    const sqliteSessions = await getSleepAudioSessionsFromSQLite();
    return Object.fromEntries(sqliteSessions.map((session) => [session.date, session]));
  } catch (error) {
    console.warn("[sqlite] Failed to read sleep audio sessions", error);
    return {};
  }
}

async function writeSleepAudioMap(sessions: StoredSleepAudioSessions): Promise<void> {
  try {
    await appStorage.setItem(storageKeys.sleepAudioSessions, JSON.stringify(sessions));
  } catch (error) {
    console.warn("[storage] Failed to write sleep audio sessions", error);
  }

  try {
    await replaceSleepAudioSessionsInSQLite(Object.values(sessions).map(normalizeSession));
  } catch (error) {
    console.warn("[sqlite] Failed to write sleep audio sessions", error);
  }
}

function normalizeSession(session: SleepAudioSession): SleepAudioSession {
  return {
    ...session,
    status: session.status ?? "idle",
    eventCount: session.eventCount ?? session.events?.length ?? 0,
    events: session.events ?? [],
    localAudioUri: session.localAudioUri
  };
}

export async function getSleepAudioSessionByDate(date: string): Promise<SleepAudioSession | null> {
  const sessions = await readSleepAudioMap();
  return sessions[date] ? normalizeSession(sessions[date]) : null;
}

export async function getSleepAudioSessions(): Promise<SleepAudioSession[]> {
  const sessions = await readSleepAudioMap();
  return Object.values(sessions)
    .map(normalizeSession)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function createSleepAudioSession(
  date: string,
  patch: SleepAudioSessionPatch = {}
): Promise<SleepAudioSession> {
  const sessions = await readSleepAudioMap();
  const current = sessions[date] ? normalizeSession(sessions[date]) : null;
  const now = nowIso();
  const next: SleepAudioSession = {
    id: current?.id ?? sleepAudioSessionIdForDate(date),
    date,
    status: "recording",
    startedAt: current?.startedAt ?? now,
    stoppedAt: undefined,
    localAudioUri: patch.localAudioUri ?? current?.localAudioUri,
    eventCount: patch.eventCount ?? current?.eventCount ?? patch.events?.length ?? 0,
    events: patch.events ?? current?.events ?? [],
    summary: patch.summary ?? current?.summary,
    createdAt: current?.createdAt ?? now,
    updatedAt: now
  };

  await writeSleepAudioMap({ ...sessions, [date]: next });
  return next;
}

export async function updateSleepAudioSessionStatus(
  date: string,
  status: SleepAudioSessionStatus,
  patch: SleepAudioSessionPatch = {}
): Promise<SleepAudioSession> {
  const sessions = await readSleepAudioMap();
  const current = sessions[date] ? normalizeSession(sessions[date]) : await createSleepAudioSession(date);
  const now = nowIso();
  const next: SleepAudioSession = {
    ...current,
    ...patch,
    status,
    stoppedAt: status === "stopped" || status === "completed" ? now : current.stoppedAt,
    summary:
      status === "stopped" || status === "completed"
        ? current.summary ?? {
            hasVoiceLikeSound: (patch.events ?? current.events).some((event) => event.type === "voice_like"),
            hasSnoreLikeSound: (patch.events ?? current.events).some((event) => event.type === "snore_like"),
            quietScore: (patch.events ?? current.events).length === 0 ? 92 : undefined
          }
        : current.summary,
    updatedAt: now
  };

  await writeSleepAudioMap({ ...sessions, [date]: next });
  return next;
}

export async function deleteSleepAudioSession(date: string): Promise<void> {
  const sessions = await readSleepAudioMap();
  const nextSessions = { ...sessions };
  delete nextSessions[date];
  await writeSleepAudioMap(nextSessions);
}

export async function markSleepAudioPermissionDenied(date: string): Promise<SleepAudioSession> {
  const sessions = await readSleepAudioMap();
  const current = sessions[date] ? normalizeSession(sessions[date]) : null;
  const now = nowIso();
  const next: SleepAudioSession = {
    id: current?.id ?? sleepAudioSessionIdForDate(date),
    date,
    status: "permission_denied",
    eventCount: current?.eventCount ?? 0,
    events: current?.events ?? [],
    createdAt: current?.createdAt ?? now,
    updatedAt: now
  };

  await writeSleepAudioMap({ ...sessions, [date]: next });
  return next;
}

export async function clearSleepAudioSessions(): Promise<void> {
  await appStorage.removeItem(storageKeys.sleepAudioSessions);
  await clearSleepAudioSessionsFromSQLite();
}
