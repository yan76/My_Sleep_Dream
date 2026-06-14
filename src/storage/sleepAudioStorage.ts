import { appStorage } from "@/storage/appStorage";
import {
  clearSleepAudioSessionsFromSQLite,
  getSleepAudioSessionsFromSQLite,
  replaceSleepAudioSessionsInSQLite
} from "@/storage/sqlite/sleepAudioRepository";
import { storageKeys } from "@/storage/storageKeys";
import { SleepAudioEvent, SleepAudioSession, SleepAudioSessionStatus } from "@/types/app";

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
  const events = session.events ?? [];

  return {
    ...session,
    status: session.status ?? "idle",
    eventCount: session.eventCount ?? events.length,
    events,
    localAudioUri: session.localAudioUri
  };
}

function countEvents(events: SleepAudioEvent[], type: SleepAudioEvent["type"]): number {
  return events.filter((event) => event.type === type).length;
}

function durationForEvents(events: SleepAudioEvent[], type: SleepAudioEvent["type"]): number {
  return events
    .filter((event) => event.type === type)
    .reduce((sum, event) => sum + event.durationMs, 0);
}

function peakDbForEvents(events: SleepAudioEvent[]): number | undefined {
  const values = events
    .map((event) => event.peakDb)
    .filter((value): value is number => typeof value === "number");

  return values.length ? Math.max(...values) : undefined;
}

function createSleepAudioSummary(events: SleepAudioEvent[]): SleepAudioSession["summary"] {
  const totalEventDurationMs = events.reduce((sum, event) => sum + event.durationMs, 0);
  const eventCount = events.length;

  return {
    hasVoiceLikeSound: events.some((event) => event.type === "voice_like"),
    hasSnoreLikeSound: events.some((event) => event.type === "snore_like"),
    eventCount,
    voiceLikeCount: countEvents(events, "voice_like"),
    snoreLikeCount: countEvents(events, "snore_like"),
    coughLikeCount: countEvents(events, "cough_like"),
    movementLikeCount: countEvents(events, "movement_like"),
    noiseLikeCount: countEvents(events, "noise_like"),
    totalEventDurationMs,
    totalVoiceLikeDurationMs: durationForEvents(events, "voice_like"),
    totalSnoreLikeDurationMs: durationForEvents(events, "snore_like"),
    peakDb: peakDbForEvents(events),
    quietScore: eventCount === 0 ? 92 : Math.max(20, Math.min(88, 88 - eventCount * 4 - Math.floor(totalEventDurationMs / 60000)))
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
        ? patch.summary ?? createSleepAudioSummary(patch.events ?? current.events)
        : patch.summary ?? current.summary,
    updatedAt: now
  };

  await writeSleepAudioMap({ ...sessions, [date]: next });
  return next;
}

export async function updateSleepAudioSessionFiles(
  date: string,
  patch: Pick<SleepAudioSessionPatch, "events" | "localAudioUri">
): Promise<SleepAudioSession | null> {
  const sessions = await readSleepAudioMap();
  const current = sessions[date] ? normalizeSession(sessions[date]) : null;
  if (!current) {
    return null;
  }

  const events = patch.events ?? current.events;
  const next: SleepAudioSession = {
    ...current,
    events,
    eventCount: events.length,
    localAudioUri: patch.localAudioUri,
    summary: createSleepAudioSummary(events),
    updatedAt: nowIso()
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
