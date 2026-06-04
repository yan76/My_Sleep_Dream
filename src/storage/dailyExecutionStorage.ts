import { appStorage } from "@/storage/appStorage";
import { storageKeys } from "@/storage/storageKeys";
import { getUserConfig } from "@/storage/rescueSessionStorage";
import {
  DailyExecutionRecord,
  DailyExecutionStatus,
  LateNightReason,
  MorningMood,
  SleepAidPreference,
  SleepResult
} from "@/types/app";
import { timeToMinutes, todayKey } from "@/utils/date";

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

const statusRank: Record<DailyExecutionStatus, number> = {
  not_started: 0,
  ritual_started: 1,
  external_closed: 2,
  review_completed: 3,
  sleep_aid_started: 4,
  ready_to_sleep: 5,
  needs_checkin: 6,
  checked_in: 7
};

async function readExecutionMap(): Promise<StoredDailyExecutionRecords> {
  try {
    const value = await appStorage.getItem(storageKeys.dailyExecutionRecords);
    return value ? (JSON.parse(value) as StoredDailyExecutionRecords) : {};
  } catch (error) {
    console.warn("[storage] Failed to read daily execution records", error);
    return {};
  }
}

async function writeExecutionMap(records: StoredDailyExecutionRecords): Promise<void> {
  try {
    await appStorage.setItem(storageKeys.dailyExecutionRecords, JSON.stringify(records));
  } catch (error) {
    console.warn("[storage] Failed to write daily execution records", error);
  }
}

function strongerStatus(current: DailyExecutionStatus, next: DailyExecutionStatus): DailyExecutionStatus {
  return statusRank[next] > statusRank[current] ? next : current;
}

function classifySleepResult(actualSleepTime: string, plannedSleepTime: string): SleepResult {
  const actual = timeToMinutes(actualSleepTime);
  const planned = timeToMinutes(plannedSleepTime);
  const normalizedActual = actual < 12 * 60 ? actual + 24 * 60 : actual;
  const normalizedPlanned = planned < 12 * 60 ? planned + 24 * 60 : planned;
  const delta = normalizedActual - normalizedPlanned;

  if (delta <= 15) {
    return "near_target";
  }

  if (delta <= 30) {
    return "slightly_late";
  }

  return "very_late";
}

async function createDefaultRecord(date: string): Promise<DailyExecutionRecord> {
  const config = await getUserConfig();
  const now = nowIso();

  return {
    date,
    plannedSleepTime: config.targetSleepTime,
    wakeUpTime: config.wakeUpTime,
    status: "not_started",
    usedSoundSpa: false,
    usedTreeHole: false,
    usedSleepGenerator: false,
    shutdownChallengeCount: 0,
    rescuePauseCount: 0,
    createdAt: now,
    updatedAt: now
  };
}

function normalizeRecord(record: DailyExecutionRecord): DailyExecutionRecord {
  return {
    ...record,
    status: record.status ?? "not_started",
    usedSoundSpa: record.usedSoundSpa ?? false,
    usedTreeHole: record.usedTreeHole ?? false,
    usedSleepGenerator: record.usedSleepGenerator ?? false,
    shutdownChallengeCount: record.shutdownChallengeCount ?? 0,
    rescuePauseCount: record.rescuePauseCount ?? 0,
    sleepAudioEnabled: record.sleepAudioEnabled ?? false
  };
}

async function updateExecutionRecord(
  date: string,
  patch: Partial<DailyExecutionRecord>,
  nextStatus?: DailyExecutionStatus
): Promise<DailyExecutionRecord> {
  const records = await readExecutionMap();
  const current = records[date] ? normalizeRecord(records[date]) : await createDefaultRecord(date);
  const updated: DailyExecutionRecord = {
    ...current,
    ...patch,
    status: nextStatus ? strongerStatus(current.status, nextStatus) : current.status,
    updatedAt: nowIso()
  };

  await writeExecutionMap({ ...records, [date]: updated });
  return updated;
}

export async function getDailyExecutionRecords(): Promise<DailyExecutionRecord[]> {
  const records = await readExecutionMap();
  return Object.values(records)
    .map(normalizeRecord)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getDailyExecutionRecordByDate(date: string): Promise<DailyExecutionRecord | null> {
  const records = await readExecutionMap();
  return records[date] ? normalizeRecord(records[date]) : null;
}

export async function ensureDailyExecutionRecord(date = todayKey()): Promise<DailyExecutionRecord> {
  const records = await readExecutionMap();
  const current = records[date];

  if (current) {
    return normalizeRecord(current);
  }

  const next = await createDefaultRecord(date);
  await writeExecutionMap({ ...records, [date]: next });
  return next;
}

export async function markRitualStarted(date = todayKey()): Promise<DailyExecutionRecord> {
  return updateExecutionRecord(date, { ritualStartedAt: nowIso() }, "ritual_started");
}

export async function markExternalClosed(date = todayKey()): Promise<DailyExecutionRecord> {
  return updateExecutionRecord(date, { externalClosedAt: nowIso() }, "external_closed");
}

export async function markReviewCompleted(date = todayKey()): Promise<DailyExecutionRecord> {
  return updateExecutionRecord(date, { reviewCompletedAt: nowIso() }, "review_completed");
}

export async function markSleepAidStarted(input: SleepAidInput = {}, date = todayKey()): Promise<DailyExecutionRecord> {
  const current = await ensureDailyExecutionRecord(date);
  const aid = input.aid;
  return updateExecutionRecord(
    date,
    {
      sleepAidStartedAt: nowIso(),
      usedSoundSpa: current.usedSoundSpa || aid === "sound_spa" || aid === "white_noise" || aid === "asmr",
      usedTreeHole: current.usedTreeHole || aid === "tree_hole",
      usedSleepGenerator: true
    },
    "sleep_aid_started"
  );
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

  return updateExecutionRecord(
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
}

export async function clearDailyExecutionRecords(): Promise<void> {
  await appStorage.removeItem(storageKeys.dailyExecutionRecords);
}

export { classifySleepResult };
