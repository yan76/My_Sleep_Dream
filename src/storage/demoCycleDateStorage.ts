import { isDemoMode } from "@/constants/demo";
import { appStorage } from "@/storage/appStorage";
import { storageKeys } from "@/storage/storageKeys";
import type { DailyExecutionRecord, RescueSession } from "@/types/app";
import { addDays, todayKey } from "@/utils/date";

type StoredRescueSessions = Record<string, RescueSession>;
type StoredDailyExecutionRecords = Record<string, DailyExecutionRecord>;

function isTerminalExecution(record: DailyExecutionRecord | null | undefined): boolean {
  return record?.status === "checked_in" || record?.status === "feedback_viewed";
}

function isInactiveSession(session: RescueSession | null | undefined): boolean {
  return Boolean(session && ["completed", "abandoned"].includes(session.status));
}

function hasOpenCycle(
  executionRecord: DailyExecutionRecord | null | undefined,
  session: RescueSession | null | undefined
): boolean {
  return Boolean(
    (executionRecord && !isTerminalExecution(executionRecord)) ||
      (session && !isInactiveSession(session))
  );
}

function nextDateKey(date: string): string {
  return todayKey(addDays(new Date(`${date}T00:00:00`), 1));
}

function findFirstUnusedDate(existingDates: Set<string>, fallbackDate: string): string {
  let candidate = fallbackDate;

  for (let index = 0; index < 370; index += 1) {
    if (!existingDates.has(candidate)) {
      return candidate;
    }

    candidate = nextDateKey(candidate);
  }

  return candidate;
}

export async function getStoredDemoCycleDate(): Promise<string | null> {
  if (!isDemoMode) {
    return null;
  }

  return appStorage.getItem(storageKeys.demoActiveCycleDate);
}

export async function setStoredDemoCycleDate(date: string): Promise<void> {
  if (!isDemoMode) {
    return;
  }

  await appStorage.setItem(storageKeys.demoActiveCycleDate, date);
}

export async function clearStoredDemoCycleDate(): Promise<void> {
  await appStorage.removeItem(storageKeys.demoActiveCycleDate);
}

export async function resolveCurrentCycleDate(fallbackDate = todayKey()): Promise<string> {
  if (!isDemoMode) {
    return fallbackDate;
  }

  return (await getStoredDemoCycleDate()) ?? fallbackDate;
}

export async function resolveDemoStartCycleDate({
  sessions,
  executionRecords,
  fallbackDate = todayKey()
}: {
  sessions: StoredRescueSessions;
  executionRecords: StoredDailyExecutionRecords;
  fallbackDate?: string;
}): Promise<string> {
  if (!isDemoMode) {
    return fallbackDate;
  }

  const storedDate = await getStoredDemoCycleDate();

  if (storedDate) {
    const storedExecution = executionRecords[storedDate];
    const storedSession = sessions[storedDate];
    const hasStoredCycle = Boolean(storedExecution || storedSession);

    if (!hasStoredCycle || hasOpenCycle(storedExecution, storedSession)) {
      return storedDate;
    }
  }

  const fallbackExecution = executionRecords[fallbackDate];
  const fallbackSession = sessions[fallbackDate];
  const hasFallbackCycle = Boolean(fallbackExecution || fallbackSession);

  if (!hasFallbackCycle || hasOpenCycle(fallbackExecution, fallbackSession)) {
    await setStoredDemoCycleDate(fallbackDate);
    return fallbackDate;
  }

  const existingDates = new Set([
    ...Object.keys(sessions),
    ...Object.keys(executionRecords),
    fallbackDate
  ]);
  const nextDate = findFirstUnusedDate(existingDates, fallbackDate);
  await setStoredDemoCycleDate(nextDate);
  return nextDate;
}
