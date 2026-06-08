import {
  applyDailyCycleUpdate,
  classifySleepResult,
  createDefaultDailyCycle,
  normalizeDailyCycleRecord
} from "@/features/daily-cycle/dailyCycleModel";
import { trackAppEvent } from "@/services/analyticsService";
import { appStorage } from "@/storage/appStorage";
import {
  clearDailyCyclesFromSQLite,
  getDailyCycleFromSQLiteByDate,
  getDailyCyclesFromSQLite,
  replaceDailyCyclesInSQLite,
  upsertDailyCycleToSQLite
} from "@/storage/sqlite/dailyCycleRepository";
import { enqueueSyncItem } from "@/storage/sqlite/syncQueueRepository";
import { storageKeys } from "@/storage/storageKeys";
import { getUserConfig } from "@/storage/rescueSessionStorage";
import {
  DailyExecutionRecord,
  DailyExecutionStatus,
  LateNightReason,
  MorningMood,
  SleepAidPreference
} from "@/types/app";
import { todayKey } from "@/utils/date";

type StoredDailyExecutionRecords = Record<string, DailyExecutionRecord>;

type SleepAidUsage = SleepAidPreference | "sleep_generator";

type SleepAidInput = {
  aid?: SleepAidUsage | string;
};

type CheckinInput = {
  date?: string;
  actualSleepTime?: string;
  morningMood?: MorningMood;
  lateReason?: LateNightReason;
};

const nowIso = () => new Date().toISOString();

let legacyDailyCycleMigrationChecked = false;

async function readLegacyExecutionMap(): Promise<StoredDailyExecutionRecords> {
  try {
    const value = await appStorage.getItem(storageKeys.dailyExecutionRecords);
    return value ? (JSON.parse(value) as StoredDailyExecutionRecords) : {};
  } catch (error) {
    console.warn("[storage] Failed to read legacy daily execution records", error);
    return {};
  }
}

async function ensureLegacyDailyCyclesMigrated(): Promise<void> {
  if (legacyDailyCycleMigrationChecked) {
    return;
  }

  legacyDailyCycleMigrationChecked = true;

  try {
    const sqliteRecords = await getDailyCyclesFromSQLite();
    if (sqliteRecords.length > 0) {
      return;
    }

    const legacyRecords = Object.values(await readLegacyExecutionMap()).map(normalizeDailyCycleRecord);
    if (legacyRecords.length > 0) {
      await replaceDailyCyclesInSQLite(legacyRecords, { syncStatus: "pending" });
    }
  } catch (error) {
    console.warn("[sqlite] Failed to migrate legacy daily cycles on demand", error);
  }
}

async function readExecutionMap(): Promise<StoredDailyExecutionRecords> {
  await ensureLegacyDailyCyclesMigrated();

  try {
    const sqliteRecords = await getDailyCyclesFromSQLite();
    return Object.fromEntries(sqliteRecords.map((record) => [record.date, normalizeDailyCycleRecord(record)]));
  } catch (error) {
    console.warn("[sqlite] Failed to read daily cycles", error);
    return {};
  }
}

async function readExecutionRecord(date: string): Promise<DailyExecutionRecord | null> {
  await ensureLegacyDailyCyclesMigrated();

  try {
    const record = await getDailyCycleFromSQLiteByDate(date);
    return record ? normalizeDailyCycleRecord(record) : null;
  } catch (error) {
    console.warn("[sqlite] Failed to read daily cycle", error);
    return null;
  }
}

async function createDefaultRecord(date: string): Promise<DailyExecutionRecord> {
  const config = await getUserConfig();
  return createDefaultDailyCycle(date, {
    targetSleepTime: config.targetSleepTime,
    wakeUpTime: config.wakeUpTime
  });
}

async function persistExecutionRecord(
  record: DailyExecutionRecord,
  options: { enqueueSync?: boolean; syncStatus?: "local_only" | "pending" | "synced" } = {}
): Promise<DailyExecutionRecord> {
  const normalized = normalizeDailyCycleRecord(record);
  const enqueueSync = options.enqueueSync ?? true;

  await upsertDailyCycleToSQLite(normalized, { syncStatus: options.syncStatus ?? (enqueueSync ? "pending" : "local_only") });

  if (enqueueSync) {
    await enqueueSyncItem({
      entityType: "daily_cycle",
      entityId: normalized.date,
      operation: "update",
      payload: normalized
    }).catch((error) => {
      console.warn("[sync] Failed to enqueue daily cycle", error);
    });
  }

  return normalized;
}

async function updateExecutionRecord(
  date: string,
  patch: Partial<DailyExecutionRecord>,
  nextStatus?: DailyExecutionStatus
): Promise<DailyExecutionRecord> {
  const current = (await readExecutionRecord(date)) ?? (await createDefaultRecord(date));
  const updated = applyDailyCycleUpdate(current, patch, nextStatus, nowIso());
  return persistExecutionRecord(updated);
}

export async function getDailyExecutionRecords(): Promise<DailyExecutionRecord[]> {
  const records = await readExecutionMap();
  return Object.values(records)
    .map(normalizeDailyCycleRecord)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getDailyExecutionRecordByDate(date: string): Promise<DailyExecutionRecord | null> {
  return readExecutionRecord(date);
}

export async function ensureDailyExecutionRecord(date = todayKey()): Promise<DailyExecutionRecord> {
  const current = await readExecutionRecord(date);

  if (current) {
    return current;
  }

  const next = await createDefaultRecord(date);
  return persistExecutionRecord(next, { enqueueSync: false, syncStatus: "local_only" });
}

export async function markRitualStarted(date = todayKey()): Promise<DailyExecutionRecord> {
  const record = await updateExecutionRecord(date, { ritualStartedAt: nowIso() }, "ritual_started");
  trackAppEvent("rescue_started", { date }).catch(() => undefined);
  return record;
}

export async function markExternalClosed(date = todayKey()): Promise<DailyExecutionRecord> {
  return updateExecutionRecord(date, { externalClosedAt: nowIso() }, "external_closed");
}

export async function markReviewCompleted(date = todayKey()): Promise<DailyExecutionRecord> {
  const record = await updateExecutionRecord(date, { reviewCompletedAt: nowIso() }, "review_completed");
  trackAppEvent("today_review_completed", { date }).catch(() => undefined);
  return record;
}

export async function markSleepAidStarted(input: SleepAidInput = {}, date = todayKey()): Promise<DailyExecutionRecord> {
  const current = await ensureDailyExecutionRecord(date);
  const aid = input.aid;
  const record = await updateExecutionRecord(
    date,
    {
      sleepAidStartedAt: nowIso(),
      usedSoundSpa: current.usedSoundSpa || aid === "sound_spa" || aid === "white_noise" || aid === "asmr",
      usedTreeHole: current.usedTreeHole || aid === "tree_hole",
      usedSleepGenerator: true
    },
    "sleep_aid_started"
  );
  trackAppEvent("sleep_aid_used", { date, aid: typeof aid === "string" ? aid : "unknown" }).catch(() => undefined);
  return record;
}

export async function markReadyToSleep(date = todayKey()): Promise<DailyExecutionRecord> {
  return updateExecutionRecord(date, { readyToSleepAt: nowIso() }, "ready_to_sleep");
}

export async function markNeedsCheckin(date: string): Promise<DailyExecutionRecord> {
  return updateExecutionRecord(date, {}, "needs_checkin");
}

export async function markSleepAudioEnabled(sessionId: string, date = todayKey()): Promise<DailyExecutionRecord> {
  return updateExecutionRecord(date, { sleepAudioEnabled: true, sleepAudioSessionId: sessionId });
}

export async function markSleepAudioDeleted(date = todayKey()): Promise<DailyExecutionRecord> {
  return updateExecutionRecord(date, { sleepAudioEnabled: false, sleepAudioSessionId: undefined });
}

export async function markRescuePause(date = todayKey()): Promise<DailyExecutionRecord> {
  const current = await ensureDailyExecutionRecord(date);
  return updateExecutionRecord(date, { rescuePauseCount: current.rescuePauseCount + 1 }, "ritual_started");
}

export async function markDailyShutdownChallengeCompleted(date = todayKey()): Promise<DailyExecutionRecord> {
  const current = await ensureDailyExecutionRecord(date);
  return updateExecutionRecord(
    date,
    { shutdownChallengeCount: current.shutdownChallengeCount + 1 },
    "ritual_started"
  );
}

export async function completeMorningCheckin(input: CheckinInput = {}): Promise<DailyExecutionRecord> {
  const date = input.date ?? todayKey();
  const current = await ensureDailyExecutionRecord(date);
  const actualSleepTime = input.actualSleepTime?.trim();

  const record = await updateExecutionRecord(
    date,
    {
      checkinCompletedAt: nowIso(),
      actualSleepTime: actualSleepTime || current.actualSleepTime,
      sleepResult: actualSleepTime
        ? classifySleepResult(actualSleepTime, current.plannedSleepTime)
        : current.sleepResult,
      morningMood: input.morningMood ?? current.morningMood,
      lateReason: input.lateReason ?? current.lateReason
    },
    "checked_in"
  );
  trackAppEvent("checkin_completed", { date, sleepResult: record.sleepResult ?? null }).catch(() => undefined);
  return record;
}

export async function markFeedbackViewed(date: string): Promise<DailyExecutionRecord> {
  return updateExecutionRecord(date, { feedbackViewedAt: nowIso() }, "feedback_viewed");
}

export async function clearDailyExecutionRecords(): Promise<void> {
  await appStorage.removeItem(storageKeys.dailyExecutionRecords);
  await clearDailyCyclesFromSQLite();
}

export { classifySleepResult };
