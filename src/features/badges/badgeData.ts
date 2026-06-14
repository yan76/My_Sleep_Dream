import type { ImageSourcePropType } from "react-native";
import { loadGrowthData, type GrowthData } from "@/features/growth/growthData";
import type { DailyExecutionRecord, RescueSession, SleepRecord } from "@/types/app";
import { addDays, todayKey } from "@/utils/date";
import {
  dailyCycleAtLeast,
  dailyCycleHasCompletedReview,
  dailyCycleHasStartedRitual,
  dailyCycleHasStartedSleepAidAfterReview,
  dailyCycleIsReadyToSleepAfterReview
} from "@/utils/dailyCycle";

export type AchievementBadgeId =
  | "first_ritual"
  | "first_review"
  | "first_rescue"
  | "first_sleep_aid"
  | "ready_to_sleep"
  | "first_checkin"
  | "three_night_streak"
  | "seven_night_streak"
  | "five_reviews"
  | "good_morning_three";

export type AchievementBadgeCategory = "start" | "review" | "rescue" | "sleep" | "streak" | "morning";

export type AchievementBadge = {
  id: AchievementBadgeId;
  title: string;
  description: string;
  lockedDescription: string;
  category: AchievementBadgeCategory;
  categoryLabel: string;
  image: ImageSourcePropType;
  unlocked: boolean;
  unlockedAt?: string;
  progressCurrent: number;
  progressTarget: number;
  progressLabel: string;
  sortOrder: number;
};

type Signal = {
  date: string;
  timestamp?: string;
};

type BadgeDefinition = {
  id: AchievementBadgeId;
  title: string;
  description: string;
  lockedDescription: string;
  category: AchievementBadgeCategory;
  categoryLabel: string;
  image: ImageSourcePropType;
  target: number;
  sortOrder: number;
  getSignals: (data: GrowthData) => Signal[];
  progressLabel: (current: number, target: number, unlocked: boolean) => string;
};

const badgeImages: Record<AchievementBadgeId, ImageSourcePropType> = {
  first_ritual: require("../../../assets/badges/badge-first-ritual.png"),
  first_review: require("../../../assets/badges/badge-first-review.png"),
  first_rescue: require("../../../assets/badges/badge-first-rescue.png"),
  first_sleep_aid: require("../../../assets/badges/badge-first-sleep-aid.png"),
  ready_to_sleep: require("../../../assets/badges/badge-ready-to-sleep.png"),
  first_checkin: require("../../../assets/badges/badge-first-checkin.png"),
  three_night_streak: require("../../../assets/badges/badge-three-night-streak.png"),
  seven_night_streak: require("../../../assets/badges/badge-seven-night-streak.png"),
  five_reviews: require("../../../assets/badges/badge-five-reviews.png"),
  good_morning_three: require("../../../assets/badges/badge-good-morning-three.png")
};

const goodMorningLabels = new Set(["精神不错", "还可以"]);

function dateStartIso(date: string): string {
  return `${date}T00:00:00.000`;
}

function sessionHasStartedSleepAid(session: RescueSession): boolean {
  return Boolean(
    session.relaxModeUsed ||
      session.sleepGeneratorUsed ||
      session.treeHoleUsed ||
      session.status === "in_relax_mode" ||
      session.status === "ready_to_sleep" ||
      session.status === "completed"
  );
}

function sessionIsReadyToSleep(session: RescueSession): boolean {
  return Boolean(session.readyToSleepAt || session.status === "ready_to_sleep" || session.status === "completed");
}

function executionIsCheckedIn(record: DailyExecutionRecord): boolean {
  return Boolean(record.checkinCompletedAt || dailyCycleAtLeast(record, "checked_in"));
}

function sleepRecordSignal(record: SleepRecord): Signal {
  return {
    date: record.date,
    timestamp: record.updatedAt ?? record.createdAt
  };
}

function uniqueSignals(signals: Signal[]): Signal[] {
  const byDate = new Map<string, Signal>();

  signals.forEach((signal) => {
    const current = byDate.get(signal.date);
    const nextTimestamp = signal.timestamp ?? dateStartIso(signal.date);
    const currentTimestamp = current?.timestamp ?? (current ? dateStartIso(current.date) : undefined);

    if (!current || (currentTimestamp && nextTimestamp < currentTimestamp)) {
      byDate.set(signal.date, {
        date: signal.date,
        timestamp: nextTimestamp
      });
    }
  });

  return [...byDate.values()].sort((left, right) => left.date.localeCompare(right.date));
}

function thresholdUnlockedAt(signals: Signal[], target: number): string | undefined {
  if (signals.length < target) {
    return undefined;
  }

  return signals[target - 1].timestamp ?? dateStartIso(signals[target - 1].date);
}

function countLongestDateStreak(signals: Signal[]): { count: number; unlockedAtByTarget: Record<number, string | undefined> } {
  const dates = uniqueSignals(signals).map((signal) => signal.date);
  let longest = 0;
  let running = 0;
  let previous: Date | null = null;
  const unlockedAtByTarget: Record<number, string | undefined> = {};

  dates.forEach((date) => {
    const current = new Date(`${date}T00:00:00`);
    const expectedPrevious = previous ? todayKey(addDays(current, -1)) : null;
    running = previous && todayKey(previous) === expectedPrevious ? running + 1 : 1;
    longest = Math.max(longest, running);

    if (!unlockedAtByTarget[running]) {
      unlockedAtByTarget[running] = dateStartIso(date);
    }

    previous = current;
  });

  return { count: longest, unlockedAtByTarget };
}

function simpleProgressLabel(current: number, target: number, unlocked: boolean): string {
  if (unlocked) {
    return "已经做到";
  }

  const remaining = Math.max(0, target - current);
  return remaining === 0 ? "快完成了" : `还差 ${remaining} 次`;
}

function nightProgressLabel(current: number, target: number, unlocked: boolean): string {
  if (unlocked) {
    return `已经连续 ${target} 晚`;
  }

  const remaining = Math.max(0, target - current);
  return remaining === 0 ? "快完成了" : `还差 ${remaining} 晚`;
}

function reviewProgressLabel(current: number, target: number, unlocked: boolean): string {
  if (unlocked) {
    return `已经写下 ${target} 次`;
  }

  const remaining = Math.max(0, target - current);
  return remaining === 0 ? "快完成了" : `还差 ${remaining} 次复盘`;
}

function getRitualSignals(data: GrowthData): Signal[] {
  const executionSignals = data.executionRecords
    .filter((record) => dailyCycleHasStartedRitual(record) || dailyCycleAtLeast(record, "ritual_started"))
    .map((record) => ({
      date: record.date,
      timestamp: record.ritualStartedAt ?? record.updatedAt
    }));
  const sessionSignals = Object.values(data.sessions).map((session) => ({
    date: session.date,
    timestamp: session.startedAt
  }));

  return uniqueSignals([...executionSignals, ...sessionSignals]);
}

function getReviewSignals(data: GrowthData): Signal[] {
  const executionSignals = data.executionRecords
    .filter((record) => dailyCycleHasCompletedReview(record) || dailyCycleAtLeast(record, "review_completed"))
    .map((record) => ({
      date: record.date,
      timestamp: record.reviewCompletedAt ?? record.updatedAt
    }));
  const sessionSignals = Object.values(data.sessions)
    .filter((session) => session.todayReviewCompleted || session.todayReviewCompletedAt)
    .map((session) => ({
      date: session.date,
      timestamp: session.todayReviewCompletedAt ?? session.startedAt
    }));
  const reviewSignals = data.reviews.map((review) => ({
    date: review.date,
    timestamp: review.updatedAt
  }));

  return uniqueSignals([...executionSignals, ...sessionSignals, ...reviewSignals]);
}

function getRescueSignals(data: GrowthData): Signal[] {
  const executionSignals = data.executionRecords
    .filter((record) => record.rescuePauseCount > 0 || record.shutdownChallengeCount > 0)
    .map((record) => ({
      date: record.date,
      timestamp: record.updatedAt
    }));
  const sessionSignals = Object.values(data.sessions)
    .filter((session) => session.hasUrgeToScroll || session.shutdownChallengeCompleted)
    .map((session) => ({
      date: session.date,
      timestamp: session.completedAt ?? session.readyToSleepAt ?? session.startedAt
    }));

  return uniqueSignals([...executionSignals, ...sessionSignals]);
}

function getSleepAidSignals(data: GrowthData): Signal[] {
  const executionSignals = data.executionRecords
    .filter(
      (record) =>
        dailyCycleHasStartedSleepAidAfterReview(record) ||
        record.usedSoundSpa ||
        record.usedTreeHole ||
        record.usedSleepGenerator ||
        dailyCycleAtLeast(record, "sleep_aid_started")
    )
    .map((record) => ({
      date: record.date,
      timestamp: record.sleepAidStartedAt ?? record.updatedAt
    }));
  const sessionSignals = Object.values(data.sessions)
    .filter(sessionHasStartedSleepAid)
    .map((session) => ({
      date: session.date,
      timestamp: session.readyToSleepAt ?? session.completedAt ?? session.startedAt
    }));

  return uniqueSignals([...executionSignals, ...sessionSignals]);
}

function getReadySignals(data: GrowthData): Signal[] {
  const executionSignals = data.executionRecords
    .filter((record) => dailyCycleIsReadyToSleepAfterReview(record) || dailyCycleAtLeast(record, "ready_to_sleep"))
    .map((record) => ({
      date: record.date,
      timestamp: record.readyToSleepAt ?? record.updatedAt
    }));
  const sessionSignals = Object.values(data.sessions)
    .filter(sessionIsReadyToSleep)
    .map((session) => ({
      date: session.date,
      timestamp: session.readyToSleepAt ?? session.completedAt ?? session.startedAt
    }));
  const sleepSignals = data.records.filter((record) => record.actualSleepTime).map(sleepRecordSignal);

  return uniqueSignals([...executionSignals, ...sessionSignals, ...sleepSignals]);
}

function getCheckinSignals(data: GrowthData): Signal[] {
  const executionSignals = data.executionRecords
    .filter(executionIsCheckedIn)
    .map((record) => ({
      date: record.date,
      timestamp: record.checkinCompletedAt ?? record.updatedAt
    }));
  const sleepSignals = data.records.map(sleepRecordSignal);

  return uniqueSignals([...executionSignals, ...sleepSignals]);
}

function getGoodMorningSignals(data: GrowthData): Signal[] {
  const executionSignals = data.executionRecords
    .filter((record) => executionIsCheckedIn(record) && (record.morningMood === "good" || record.morningMood === "okay"))
    .map((record) => ({
      date: record.date,
      timestamp: record.checkinCompletedAt ?? record.updatedAt
    }));
  const sleepSignals = data.records
    .filter((record) => goodMorningLabels.has(record.moodNextMorning ?? ""))
    .map(sleepRecordSignal);

  return uniqueSignals([...executionSignals, ...sleepSignals]);
}

const badgeDefinitions: BadgeDefinition[] = [
  {
    id: "first_ritual",
    title: "第一次开始收尾",
    description: "你给今晚留出了一个边界。",
    lockedDescription: "开始一次睡前自救后解锁。",
    category: "start",
    categoryLabel: "开始收尾",
    image: badgeImages.first_ritual,
    target: 1,
    sortOrder: 1,
    getSignals: getRitualSignals,
    progressLabel: simpleProgressLabel
  },
  {
    id: "first_review",
    title: "第一次放下今天",
    description: "你把脑子里的事轻轻放到纸面上。",
    lockedDescription: "完成一次睡前复盘后解锁。",
    category: "review",
    categoryLabel: "复盘记录",
    image: badgeImages.first_review,
    target: 1,
    sortOrder: 2,
    getSignals: getReviewSignals,
    progressLabel: simpleProgressLabel
  },
  {
    id: "first_rescue",
    title: "第一次拉回自己",
    description: "有点停不下来时，你还是往回拉了一点。",
    lockedDescription: "完成一次下线挑战或暂停后解锁。",
    category: "rescue",
    categoryLabel: "拉回自己",
    image: badgeImages.first_rescue,
    target: 1,
    sortOrder: 3,
    getSignals: getRescueSignals,
    progressLabel: simpleProgressLabel
  },
  {
    id: "first_sleep_aid",
    title: "第一次靠近睡意",
    description: "你选了一种方式，让身体慢慢安静下来。",
    lockedDescription: "使用一次声音 Spa、睡意生成或树洞后解锁。",
    category: "sleep",
    categoryLabel: "进入睡意",
    image: badgeImages.first_sleep_aid,
    target: 1,
    sortOrder: 4,
    getSignals: getSleepAidSignals,
    progressLabel: simpleProgressLabel
  },
  {
    id: "ready_to_sleep",
    title: "第一次准备睡觉",
    description: "今晚没有彻底滑走，你把结尾收住了。",
    lockedDescription: "点击一次“我准备睡了”或完成睡前收尾后解锁。",
    category: "sleep",
    categoryLabel: "进入睡意",
    image: badgeImages.ready_to_sleep,
    target: 1,
    sortOrder: 5,
    getSignals: getReadySignals,
    progressLabel: simpleProgressLabel
  },
  {
    id: "first_checkin",
    title: "第一次次日打卡",
    description: "你把昨晚真实地记了下来。",
    lockedDescription: "完成一次次日打卡后解锁。",
    category: "morning",
    categoryLabel: "醒来反馈",
    image: badgeImages.first_checkin,
    target: 1,
    sortOrder: 6,
    getSignals: getCheckinSignals,
    progressLabel: simpleProgressLabel
  },
  {
    id: "three_night_streak",
    title: "连续 3 晚收尾",
    description: "连续性开始出现了，这比单晚完美更重要。",
    lockedDescription: "连续 3 晚完成睡前收尾后解锁。",
    category: "streak",
    categoryLabel: "连续几晚",
    image: badgeImages.three_night_streak,
    target: 3,
    sortOrder: 7,
    getSignals: getReadySignals,
    progressLabel: nightProgressLabel
  },
  {
    id: "seven_night_streak",
    title: "连续 7 晚收尾",
    description: "一周里，你一直在把自己带回来。",
    lockedDescription: "连续 7 晚完成睡前收尾后解锁。",
    category: "streak",
    categoryLabel: "连续几晚",
    image: badgeImages.seven_night_streak,
    target: 7,
    sortOrder: 8,
    getSignals: getReadySignals,
    progressLabel: nightProgressLabel
  },
  {
    id: "five_reviews",
    title: "写下 5 次复盘",
    description: "你已经不止一次把今天放在这里。",
    lockedDescription: "累计完成 5 次睡前复盘后解锁。",
    category: "review",
    categoryLabel: "复盘记录",
    image: badgeImages.five_reviews,
    target: 5,
    sortOrder: 9,
    getSignals: getReviewSignals,
    progressLabel: reviewProgressLabel
  },
  {
    id: "good_morning_three",
    title: "3 次醒来还不错",
    description: "身体已经给过你几次温柔的回应。",
    lockedDescription: "累计 3 次记录醒来感觉不错或还可以后解锁。",
    category: "morning",
    categoryLabel: "醒来反馈",
    image: badgeImages.good_morning_three,
    target: 3,
    sortOrder: 10,
    getSignals: getGoodMorningSignals,
    progressLabel: simpleProgressLabel
  }
];

export const badgeCategoryOrder: AchievementBadgeCategory[] = ["start", "review", "rescue", "sleep", "streak", "morning"];

export const badgeCategoryLabels: Record<AchievementBadgeCategory, string> = {
  start: "开始收尾",
  review: "复盘记录",
  rescue: "拉回自己",
  sleep: "进入睡意",
  streak: "连续几晚",
  morning: "醒来反馈"
};

export function buildBadgeData(data: GrowthData): AchievementBadge[] {
  return badgeDefinitions.map((definition) => {
    const signals = definition.getSignals(data);
    const streakBadge = definition.id === "three_night_streak" || definition.id === "seven_night_streak";
    const streak = streakBadge ? countLongestDateStreak(signals) : null;
    const progressCurrent = streak ? Math.min(streak.count, definition.target) : Math.min(signals.length, definition.target);
    const unlocked = progressCurrent >= definition.target;
    const unlockedAt = streak
      ? streak.unlockedAtByTarget[definition.target]
      : thresholdUnlockedAt(signals, definition.target);

    return {
      id: definition.id,
      title: definition.title,
      description: definition.description,
      lockedDescription: definition.lockedDescription,
      category: definition.category,
      categoryLabel: definition.categoryLabel,
      image: definition.image,
      unlocked,
      unlockedAt: unlocked ? unlockedAt : undefined,
      progressCurrent,
      progressTarget: definition.target,
      progressLabel: definition.progressLabel(progressCurrent, definition.target, unlocked),
      sortOrder: definition.sortOrder
    };
  });
}

export async function loadBadgeData(): Promise<AchievementBadge[]> {
  return buildBadgeData(await loadGrowthData());
}
