import { DailyCycleStatus, DailyExecutionRecord, SleepResult, UserConfig } from "@/types/app";
import { timeToMinutes } from "@/utils/date";

export const dailyCycleStatusRank: Record<DailyCycleStatus, number> = {
  not_started: 0,
  ritual_started: 1,
  external_closed: 2,
  review_completed: 3,
  sleep_aid_started: 4,
  ready_to_sleep: 5,
  needs_checkin: 6,
  checked_in: 7,
  feedback_viewed: 8
};

export function strongerDailyCycleStatus(
  current: DailyCycleStatus,
  next: DailyCycleStatus
): DailyCycleStatus {
  return dailyCycleStatusRank[next] > dailyCycleStatusRank[current] ? next : current;
}

export function dailyCycleAtLeast(
  record: Pick<DailyExecutionRecord, "status"> | null | undefined,
  status: DailyCycleStatus
): boolean {
  return Boolean(record && dailyCycleStatusRank[record.status] >= dailyCycleStatusRank[status]);
}

export function classifySleepResult(actualSleepTime: string, plannedSleepTime: string): SleepResult {
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

export function createDefaultDailyCycle(
  date: string,
  config: Pick<UserConfig, "targetSleepTime" | "wakeUpTime">,
  createdAt = new Date().toISOString()
): DailyExecutionRecord {
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
    createdAt,
    updatedAt: createdAt
  };
}

export function normalizeDailyCycleRecord(record: DailyExecutionRecord): DailyExecutionRecord {
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

export function applyDailyCycleUpdate(
  current: DailyExecutionRecord,
  patch: Partial<DailyExecutionRecord>,
  nextStatus?: DailyCycleStatus,
  updatedAt = new Date().toISOString()
): DailyExecutionRecord {
  return normalizeDailyCycleRecord({
    ...current,
    ...patch,
    status: nextStatus ? strongerDailyCycleStatus(current.status, nextStatus) : current.status,
    updatedAt
  });
}
