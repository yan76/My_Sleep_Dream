import { markSleepAudioDeleted, markSleepAudioEnabled } from "@/storage/dailyExecutionStorage";
import {
  createSleepAudioSession,
  deleteSleepAudioSession,
  getSleepAudioSessions,
  getSleepAudioSessionByDate,
  markSleepAudioPermissionDenied,
  updateSleepAudioSessionFiles,
  updateSleepAudioSessionStatus
} from "@/storage/sleepAudioStorage";
import {
  deleteSleepAudioRecording,
  deleteSleepAudioRecordings,
  requestSleepAudioPermission
} from "@/services/sleepAudioRecorder";
import {
  isNativeSleepAudioMonitoringAvailable,
  NativeSleepMonitoringEvent,
  NativeSleepMonitoringStatus,
  nativeDeleteSleepMonitoringSession,
  nativeGetSleepMonitoringStatus,
  nativeStartSleepMonitoring,
  nativeStopSleepMonitoring
} from "@/services/sleepAudioMonitoringNative";
import { SleepAudioEvent, SleepAudioEventType, SleepAudioSession } from "@/types/app";

export type SleepMonitoringStatus = {
  isRunning: boolean;
  session: SleepAudioSession | null;
  eventCount: number;
  lastError?: string;
};

const validEventTypes = new Set<SleepAudioEventType>([
  "voice_like",
  "snore_like",
  "cough_like",
  "movement_like",
  "noise_like",
  "unknown"
]);

const audioClipRetentionDays = 14;

function fallbackEventId(date: string, index: number): string {
  return `sleep-audio-event:${date}:${index}`;
}

function normalizeNativeEvent(date: string, event: NativeSleepMonitoringEvent, index: number): SleepAudioEvent {
  const type = event.type && validEventTypes.has(event.type) ? event.type : "unknown";

  return {
    id: event.id ?? fallbackEventId(date, index),
    startedAt: event.startedAt ?? new Date().toISOString(),
    durationMs: Math.max(0, Math.round(event.durationMs ?? 0)),
    type,
    confidence: event.confidence,
    localClipUri: event.localClipUri,
    peakDb: event.peakDb,
    averageDb: event.averageDb
  };
}

function statusFromSession(session: SleepAudioSession | null, lastError?: string): SleepMonitoringStatus {
  return {
    isRunning: session?.status === "recording",
    session,
    eventCount: session?.eventCount ?? session?.events.length ?? 0,
    lastError
  };
}

function daysBetween(left: Date, right: Date): number {
  return Math.floor((left.getTime() - right.getTime()) / (24 * 60 * 60 * 1000));
}

function dateFromSessionDate(value: string): Date | null {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function cleanupStaleSleepAudioFiles(currentDate = new Date()): Promise<void> {
  const sessions = await getSleepAudioSessions();

  for (const session of sessions) {
    const sessionDate = dateFromSessionDate(session.date);
    if (!sessionDate || daysBetween(currentDate, sessionDate) < audioClipRetentionDays) {
      continue;
    }

    const hasFiles = Boolean(session.localAudioUri || session.events.some((event) => event.localClipUri));
    if (!hasFiles) {
      continue;
    }

    await deleteSleepAudioRecordings(session.events);
    await deleteSleepAudioRecording(session.localAudioUri);
    await updateSleepAudioSessionFiles(session.date, {
      localAudioUri: undefined,
      events: session.events.map((event) => ({ ...event, localClipUri: undefined }))
    });
  }
}

async function persistNativeStatus(
  date: string,
  nativeStatus: NativeSleepMonitoringStatus,
  fallbackStatus: SleepAudioSession["status"]
): Promise<SleepAudioSession> {
  const events = (nativeStatus.events ?? []).map((event, index) => normalizeNativeEvent(date, event, index));
  const status = nativeStatus.isRunning ? "recording" : fallbackStatus;

  return updateSleepAudioSessionStatus(date, status, {
    eventCount: nativeStatus.eventCount ?? events.length,
    events,
    summary: nativeStatus.summary
  });
}

export async function startSleepMonitoring(date: string): Promise<SleepMonitoringStatus> {
  await cleanupStaleSleepAudioFiles().catch(() => undefined);

  const permission = await requestSleepAudioPermission();
  if (permission !== "granted") {
    return statusFromSession(await markSleepAudioPermissionDenied(date));
  }

  const session = await createSleepAudioSession(date);
  await markSleepAudioEnabled(session.id, date);

  if (!isNativeSleepAudioMonitoringAvailable()) {
    return statusFromSession(session, "Android 原生监听模块不可用，当前仅保留本机会话状态。");
  }

  try {
    const nativeStatus = await nativeStartSleepMonitoring({ date, sessionId: session.id });
    return statusFromSession(await persistNativeStatus(date, nativeStatus, "recording"), nativeStatus.lastError);
  } catch (error) {
    const failed = await updateSleepAudioSessionStatus(date, "failed");
    return statusFromSession(failed, error instanceof Error ? error.message : "监听启动失败。");
  }
}

export async function stopSleepMonitoring(date: string): Promise<SleepMonitoringStatus> {
  if (!isNativeSleepAudioMonitoringAvailable()) {
    return statusFromSession(await updateSleepAudioSessionStatus(date, "completed"));
  }

  try {
    const nativeStatus = await nativeStopSleepMonitoring(date);
    const targetDate = nativeStatus.date ?? date;
    return statusFromSession(await persistNativeStatus(targetDate, nativeStatus, "completed"), nativeStatus.lastError);
  } catch (error) {
    const failed = await updateSleepAudioSessionStatus(date, "failed");
    return statusFromSession(failed, error instanceof Error ? error.message : "停止监听失败。");
  }
}

export async function getSleepMonitoringStatus(date: string): Promise<SleepMonitoringStatus> {
  const localSession = await getSleepAudioSessionByDate(date);

  if (!isNativeSleepAudioMonitoringAvailable()) {
    return statusFromSession(localSession);
  }

  try {
    const nativeStatus = await nativeGetSleepMonitoringStatus(date);
    if (!nativeStatus.date || nativeStatus.date !== date) {
      if (localSession?.status === "recording" && !nativeStatus.isRunning) {
        return statusFromSession(
          await updateSleepAudioSessionStatus(date, "failed"),
          "上次监听可能被系统中断，已停止本机监听状态。"
        );
      }

      return statusFromSession(localSession, nativeStatus.lastError);
    }

    return statusFromSession(await persistNativeStatus(date, nativeStatus, nativeStatus.isRunning ? "recording" : "completed"));
  } catch (error) {
    return statusFromSession(localSession, error instanceof Error ? error.message : "读取监听状态失败。");
  }
}

export async function deleteSleepMonitoringSession(date: string): Promise<void> {
  const session = await getSleepAudioSessionByDate(date);
  await nativeDeleteSleepMonitoringSession(date);
  await deleteSleepAudioRecordings(session?.events);
  await deleteSleepAudioRecording(session?.localAudioUri);
  await deleteSleepAudioSession(date);
  await markSleepAudioDeleted(date);
}
