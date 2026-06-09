import { isDemoMode } from "@/constants/demo";
import { appStorage } from "@/storage/appStorage";
import { storageKeys } from "@/storage/storageKeys";
import type { DailyExecutionRecord, RescueSession } from "@/types/app";
import { addDays, startOfGrowthWeek, todayKey } from "@/utils/date";

type StoredRescueSessions = Record<string, RescueSession>;
type StoredDailyExecutionRecords = Record<string, DailyExecutionRecord>;
export type DemoPendingWeekRollover = {
  completedWeekDate: string;
  nextDate: string;
};
export type DemoStartCycleResolution = {
  date: string;
  startedNewGrowthWeek: boolean;
};

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

export function demoNaturalDateStartKey(date = new Date()): string {
  return todayKey(startOfGrowthWeek(date));
}

export function findFirstAvailableDemoDate(existingDates: Set<string>, fallbackDate = demoNaturalDateStartKey()): string {
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
  await clearDemoPendingWeekRollover();
}

export async function getDemoPendingWeekRollover(): Promise<DemoPendingWeekRollover | null> {
  if (!isDemoMode) {
    return null;
  }

  const value = await appStorage.getItem(storageKeys.demoPendingWeekRollover);
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as DemoPendingWeekRollover;
  } catch {
    await appStorage.removeItem(storageKeys.demoPendingWeekRollover);
    return null;
  }
}

export async function setDemoPendingWeekRollover(value: DemoPendingWeekRollover): Promise<void> {
  if (!isDemoMode) {
    return;
  }

  await appStorage.setItem(storageKeys.demoPendingWeekRollover, JSON.stringify(value));
}

export async function clearDemoPendingWeekRollover(): Promise<void> {
  await appStorage.removeItem(storageKeys.demoPendingWeekRollover);
}

export async function resolveCurrentCycleDate(fallbackDate = todayKey()): Promise<string> {
  if (!isDemoMode) {
    return fallbackDate;
  }

  return (await getStoredDemoCycleDate()) ?? demoNaturalDateStartKey();
}

export async function resolveGrowthTodayKey(): Promise<string> {
  if (!isDemoMode) {
    return todayKey();
  }

  const pendingWeekRollover = await getDemoPendingWeekRollover();
  if (pendingWeekRollover) {
    return pendingWeekRollover.completedWeekDate;
  }

  const storedDate = await getStoredDemoCycleDate();
  if (storedDate) {
    return storedDate;
  }

  const initialDate = demoNaturalDateStartKey();
  await setStoredDemoCycleDate(initialDate);
  return initialDate;
}

export async function resolveDemoStartCycleDate({
  sessions,
  executionRecords,
  occupiedDates = [],
  fallbackDate
}: {
  sessions: StoredRescueSessions;
  executionRecords: StoredDailyExecutionRecords;
  occupiedDates?: Iterable<string>;
  fallbackDate?: string;
}): Promise<string> {
  const resolution = await resolveDemoStartCycleDateWithNotice({
    sessions,
    executionRecords,
    occupiedDates,
    fallbackDate
  });
  return resolution.date;
}

export async function resolveDemoStartCycleDateWithNotice({
  sessions,
  executionRecords,
  occupiedDates = [],
  fallbackDate
}: {
  sessions: StoredRescueSessions;
  executionRecords: StoredDailyExecutionRecords;
  occupiedDates?: Iterable<string>;
  fallbackDate?: string;
}): Promise<DemoStartCycleResolution> {
  if (!isDemoMode) {
    return {
      date: fallbackDate ?? todayKey(),
      startedNewGrowthWeek: false
    };
  }

  const demoFallbackDate = fallbackDate ?? demoNaturalDateStartKey();
  const storedDate = await getStoredDemoCycleDate();
  const pendingWeekRollover = await getDemoPendingWeekRollover();

  if (storedDate) {
    const storedExecution = executionRecords[storedDate];
    const storedSession = sessions[storedDate];

    if (hasOpenCycle(storedExecution, storedSession)) {
      return {
        date: storedDate,
        startedNewGrowthWeek: false
      };
    }
  }

  if (pendingWeekRollover) {
    await setStoredDemoCycleDate(pendingWeekRollover.nextDate);
    await clearDemoPendingWeekRollover();
    return {
      date: pendingWeekRollover.nextDate,
      startedNewGrowthWeek: true
    };
  }

  const existingDates = new Set([
    ...Object.keys(sessions),
    ...Object.keys(executionRecords),
    ...occupiedDates
  ]);
  const nextDate = findFirstAvailableDemoDate(existingDates, demoFallbackDate);
  const nextExecution = executionRecords[nextDate];
  const nextSession = sessions[nextDate];

  if (hasOpenCycle(nextExecution, nextSession)) {
    await setStoredDemoCycleDate(nextDate);
    return {
      date: nextDate,
      startedNewGrowthWeek: false
    };
  }

  await setStoredDemoCycleDate(nextDate);
  return {
    date: nextDate,
    startedNewGrowthWeek: false
  };
}
