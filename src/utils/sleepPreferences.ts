import { SleepAidOption, sleepAidOptions } from "@/constants/sleepAidPreferences";
import { LateNightReason, SleepAidPreference } from "@/types/app";
import { formatMinutes, isValidTime, timeToMinutes } from "@/utils/date";

export function getSleepWindow(targetBedtime: string, wakeUpTime: string): string {
  if (!isValidTime(targetBedtime) || !isValidTime(wakeUpTime)) {
    return "输入完整时间后，会自动估算睡眠窗口";
  }

  const bedtimeMinutes = timeToMinutes(targetBedtime);
  const wakeMinutes = timeToMinutes(wakeUpTime);
  const duration = wakeMinutes <= bedtimeMinutes ? wakeMinutes + 24 * 60 - bedtimeMinutes : wakeMinutes - bedtimeMinutes;
  return formatMinutes(duration);
}

export function getSuggestedRescueTime(targetBedtime: string, reminderMinutesBefore: number): string {
  if (!isValidTime(targetBedtime)) {
    return "--:--";
  }

  const targetMinutes = timeToMinutes(targetBedtime);
  const suggested = (targetMinutes - reminderMinutesBefore + 24 * 60) % (24 * 60);
  const hours = Math.floor(suggested / 60);
  const minutes = suggested % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function getReasonBasedRescueHint(reasons: LateNightReason[]): string {
  if (reasons.includes("anxiety")) {
    return "今天已经非常棒啦！清空其他想法做自己吧";
  }

  if (reasons.includes("short_video") || reasons.includes("social_media")) {
    return "先别再开新的内容，把外面的刺激停在这里，夜晚会慢慢安静下来。";
  }

  if (reasons.includes("work_study")) {
    return "没做完的事可以先停在这里，明天的你会比现在更适合处理它。";
  }

  if (reasons.includes("revenge_bedtime")) {
    return "这不是你不自律，只是太累后想把时间拿回来。今晚先别继续消耗自己。";
  }

  if (reasons.includes("gaming") || reasons.includes("drama")) {
    return "故事和关卡都可以明天继续，今晚先把这一段温柔收住。";
  }

  return "不用立刻睡，也不用立刻变好。先做一个能做到的小停顿。";
}

export function getRecommendedSleepAids(
  reasons: LateNightReason[],
  preferences: SleepAidPreference[]
): SleepAidOption[] {
  const scoreById = new Map<SleepAidPreference, number>();
  sleepAidOptions.forEach((option) => scoreById.set(option.id, 0));

  preferences.forEach((preference, index) => {
    scoreById.set(preference, (scoreById.get(preference) ?? 0) + 30 - index);
  });

  const addScore = (id: SleepAidPreference, score: number) => {
    scoreById.set(id, (scoreById.get(id) ?? 0) + score);
  };

  if (reasons.includes("anxiety")) {
    addScore("suggestion", 24);
    addScore("tree_hole", 20);
  }

  if (reasons.includes("short_video") || reasons.includes("social_media")) {
    addScore("white_noise", 24);
    addScore("sound_spa", 14);
  }

  if (reasons.includes("work_study")) {
    addScore("tree_hole", 24);
    addScore("suggestion", 16);
  }

  if (reasons.includes("revenge_bedtime")) {
    addScore("suggestion", 22);
    addScore("sound_spa", 18);
  }

  if (reasons.includes("gaming") || reasons.includes("drama")) {
    addScore("white_noise", 18);
    addScore("asmr", 14);
  }

  return [...sleepAidOptions].sort((left, right) => {
    const scoreDiff = (scoreById.get(right.id) ?? 0) - (scoreById.get(left.id) ?? 0);
    if (scoreDiff !== 0) {
      return scoreDiff;
    }
    return sleepAidOptions.findIndex((option) => option.id === left.id) - sleepAidOptions.findIndex((option) => option.id === right.id);
  });
}
