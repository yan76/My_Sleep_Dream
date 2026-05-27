import { DailyRecord, DailyStatus } from "@/types/app";
import { addDays, todayKey, timeToMinutes } from "@/utils/date";

export const statusLabels: Record<DailyStatus, string> = {
  not_started: "未开始",
  contracted: "已立约",
  reviewed: "已复盘",
  bedtime_mode: "睡前模式中",
  slept_on_time: "按时睡",
  slept_late: "晚睡",
  rescued: "已补救"
};

export function didSleepOnTime(actualTime: string, plannedBedtime: string): boolean {
  const actual = timeToMinutes(actualTime);
  const planned = timeToMinutes(plannedBedtime);
  const normalizedActual = actual < 12 * 60 ? actual + 24 * 60 : actual;
  const normalizedPlanned = planned < 12 * 60 ? planned + 24 * 60 : planned;
  return normalizedActual <= normalizedPlanned;
}

export function getLastSevenDays(records: Record<string, DailyRecord[]> | Record<string, DailyRecord>) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = todayKey(addDays(new Date(), index - 6));
    const record = (records as Record<string, DailyRecord>)[date];
    return { date, record };
  });
}

export function getCurrentStreak(records: Record<string, DailyRecord>): number {
  let streak = 0;
  for (let offset = 0; offset < 30; offset += 1) {
    const date = todayKey(addDays(new Date(), -offset));
    const record = records[date];
    if (!record || record.status !== "slept_on_time") {
      break;
    }
    streak += 1;
  }
  return streak;
}
