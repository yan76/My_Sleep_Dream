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
import { resolveCurrentCycleDate } from "@/storage/demoCycleDateStorage";
import { getUserConfig } from "@/storage/rescueSessionStorage";
import {
  DailyExecutionRecord,
  DailyExecutionStatus,
  LateNightReason,
  MorningMood,
  SleepAidPreference
} from "@/types/app";
import { dailyCycleHasCompletedReview } from "@/utils/dailyCycle";

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

function isTerminalDailyCycleStatus(status: DailyExecutionStatus): boolean {
  return status === "checked_in" || status === "feedback_viewed";
}

async function readLegacyExecutionMap(): Promise<StoredDailyExecutionRecords> {
  try {
    const value = await appStorage.getItem(storageKeys.dailyExecutionRecords);
    return value ? (JSON.parse(value) as StoredDailyExecutionRecords) : {};
  } catch (error) {
    console.warn("[storage] Failed to read legacy daily execution records", error);
    return {};
  }
}

function normalizeExecutionRecordMap(records: DailyExecutionRecord[]): StoredDailyExecutionRecords {
  return Object.fromEntries(
    records
      .map(normalizeDailyCycleRecord)
      .map((record) => [record.date, record])
  );
}

async function writeLegacyExecutionRecord(record: DailyExecutionRecord): Promise<void> {
  try {
    const records = await readLegacyExecutionMap();
    await appStorage.setItem(
      storageKeys.dailyExecutionRecords,
      JSON.stringify({
        ...records,
        [record.date]: record
      })
    );
  } catch (error) {
    console.warn("[storage] Failed to mirror daily execution record", error);
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
  const legacyRecords = normalizeExecutionRecordMap(Object.values(await readLegacyExecutionMap()));

  try {
    const sqliteRecords = await getDailyCyclesFromSQLite();
    return {
      ...legacyRecords,
      ...normalizeExecutionRecordMap(sqliteRecords)
    };
  } catch (error) {
    console.warn("[sqlite] Failed to read daily cycles", error);
    return legacyRecords;
  }
}

async function readExecutionRecord(date: string): Promise<DailyExecutionRecord | null> {
  await ensureLegacyDailyCyclesMigrated();

  try {
    const record = await getDailyCycleFromSQLiteByDate(date);
    if (record) {
      return normalizeDailyCycleRecord(record);
    }
  } catch (error) {
    console.warn("[sqlite] Failed to read daily cycle", error);
  }

  const legacyRecords = await readLegacyExecutionMap();
  const legacyRecord = legacyRecords[date];
  return legacyRecord ? normalizeDailyCycleRecord(legacyRecord) : null;
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
  await writeLegacyExecutionRecord(normalized);

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

async function resolveExecutionDate(date?: string): Promise<string> {
  return date ?? resolveCurrentCycleDate();
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

export async function ensureDailyExecutionRecord(date?: string): Promise<DailyExecutionRecord> {
  const targetDate = await resolveExecutionDate(date);
  const current = await readExecutionRecord(targetDate);

  if (current) {
    return current;
  }

  const next = await createDefaultRecord(targetDate);
  return persistExecutionRecord(next, { enqueueSync: false, syncStatus: "local_only" });
}

export async function markRitualStarted(date?: string): Promise<DailyExecutionRecord> {
  const targetDate = await resolveExecutionDate(date);
  const current = await readExecutionRecord(targetDate);
  const startedAt = nowIso();
  const record = isTerminalDailyCycleStatus(current?.status ?? "not_started")
    ? await persistExecutionRecord(
        applyDailyCycleUpdate(await createDefaultRecord(targetDate), { ritualStartedAt: startedAt }, "ritual_started", startedAt)
      )
    : await updateExecutionRecord(targetDate, { ritualStartedAt: startedAt }, "ritual_started");
  trackAppEvent("rescue_started", { date: targetDate }).catch(() => undefined);
  return record;
}

export async function markExternalClosed(date?: string): Promise<DailyExecutionRecord> {
  return updateExecutionRecord(await resolveExecutionDate(date), { externalClosedAt: nowIso() }, "external_closed");
}

export async function markReviewCompleted(date?: string): Promise<DailyExecutionRecord> {
  const targetDate = await resolveExecutionDate(date);
  const record = await updateExecutionRecord(targetDate, { reviewCompletedAt: nowIso() }, "review_completed");
  trackAppEvent("today_review_completed", { date: targetDate }).catch(() => undefined);
  return record;
}

export async function markSleepAidStarted(input: SleepAidInput = {}, date?: string): Promise<DailyExecutionRecord> {
  const targetDate = await resolveExecutionDate(date);
  const current = await ensureDailyExecutionRecord(targetDate);
  const aid = input.aid;
  const canAdvanceToSleepAidStep = dailyCycleHasCompletedReview(current);
  const record = await updateExecutionRecord(
    targetDate,
    {
      sleepAidStartedAt: nowIso(),
      usedSoundSpa: current.usedSoundSpa || aid === "sound_spa" || aid === "white_noise" || aid === "asmr",
      usedTreeHole: current.usedTreeHole || aid === "tree_hole",
      usedSleepGenerator: true
    },
    canAdvanceToSleepAidStep ? "sleep_aid_started" : undefined
  );
  trackAppEvent("sleep_aid_used", { date: targetDate, aid: typeof aid === "string" ? aid : "unknown" }).catch(() => undefined);
  return record;
}

export async function markReadyToSleep(date?: string): Promise<DailyExecutionRecord> {
  const targetDate = await resolveExecutionDate(date);
  const current = await readExecutionRecord(targetDate);

  if (!dailyCycleHasCompletedReview(current)) {
    throw new Error("Cannot mark ready to sleep before completing today's rescue review.");
  }

  return updateExecutionRecord(targetDate, { readyToSleepAt: nowIso() }, "ready_to_sleep");
}

export async function markNeedsCheckin(date: string): Promise<DailyExecutionRecord> {
  return updateExecutionRecord(date, {}, "needs_checkin");
}

export async function markSleepAudioEnabled(sessionId: string, date?: string): Promise<DailyExecutionRecord> {
  return updateExecutionRecord(await resolveExecutionDate(date), { sleepAudioEnabled: true, sleepAudioSessionId: sessionId });
}

export async function markSleepAudioDeleted(date?: string): Promise<DailyExecutionRecord> {
  return updateExecutionRecord(await resolveExecutionDate(date), { sleepAudioEnabled: false, sleepAudioSessionId: undefined });
}

export async function markRescuePause(date?: string): Promise<DailyExecutionRecord> {
  const targetDate = await resolveExecutionDate(date);
  const current = await ensureDailyExecutionRecord(targetDate);
  return updateExecutionRecord(targetDate, { rescuePauseCount: current.rescuePauseCount + 1 }, "ritual_started");
}

export async function markDailyShutdownChallengeCompleted(date?: string): Promise<DailyExecutionRecord> {
  const targetDate = await resolveExecutionDate(date);
  const current = await ensureDailyExecutionRecord(targetDate);
  return updateExecutionRecord(
    targetDate,
    { shutdownChallengeCount: current.shutdownChallengeCount + 1 },
    "ritual_started"
  );
}

export async function completeMorningCheckin(input: CheckinInput = {}): Promise<DailyExecutionRecord> {
  const date = await resolveExecutionDate(input.date);
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
