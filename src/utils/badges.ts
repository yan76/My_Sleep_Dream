import { badgeDefinitions } from "@/constants/badgeDefinitions";
import { Badge, BadgeId, DailyRecord } from "@/types/app";
import { getCurrentStreak, getLastSevenDays } from "@/utils/sleep";

export function createInitialBadges(): Record<BadgeId, Badge> {
  return badgeDefinitions.reduce((acc, badge) => {
    acc[badge.id] = badge;
    return acc;
  }, {} as Record<BadgeId, Badge>);
}

export function updateBadges(records: Record<string, DailyRecord>, badges: Record<BadgeId, Badge>) {
  const next = { ...badges };
  const now = new Date().toISOString();
  const values = Object.values(records);
  const streak = getCurrentStreak(records);
  const lastSeven = getLastSevenDays(records);
  const lateDays = lastSeven.filter(({ record }) => record?.status === "slept_late").length;

  const unlock = (id: BadgeId, condition: boolean) => {
    if (condition && !next[id].unlocked) {
      next[id] = { ...next[id], unlocked: true, unlockedAt: now };
    }
  };

  unlock("first_contract", values.some((record) => Boolean(record.contractConfirmedAt)));
  unlock("first_on_time_sleep", values.some((record) => record.status === "slept_on_time"));
  unlock("three_day_streak", streak >= 3);
  unlock("seven_day_streak", streak >= 7);
  unlock("first_rescue", values.some((record) => record.rescueSuccess));
  unlock("less_late_week", values.length >= 3 && lateDays <= 2);

  return next;
}
