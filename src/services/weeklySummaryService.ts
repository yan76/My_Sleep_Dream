import { getSupabaseClient } from "@/api/supabase";
import {
  AiGeneratedOutputSource,
  saveAiGeneratedOutput
} from "@/storage/aiGenerationStorage";
import { DailyExecutionRecord, RescueSession, SleepRecord, TodayReview, UserConfig } from "@/types/app";
import { addDays, todayKey } from "@/utils/date";
import {
  applySafetyBoundary,
  getSafetyLabel,
  SafetyLabel
} from "@/services/aiSafety";
import { trackAppEvent } from "@/services/analyticsService";

export type WeeklySummaryInput = {
  records: SleepRecord[];
  executionRecords: DailyExecutionRecord[];
  sessions: Record<string, RescueSession>;
  reviews: TodayReview[];
  config: UserConfig;
};

type WeeklySummaryMetrics = {
  completedCycleDays: number;
  reviewDays: number;
  pauseCount: number;
  nearTargetDays: number;
};

export type WeeklySummaryResult = {
  conversationId?: string;
  title: string;
  summary: string;
  highlights: string[];
  nextFocus: string;
  source: AiGeneratedOutputSource;
  safetyLabel: SafetyLabel;
  createdAt: string;
};

function startOfWeek(date: Date): Date {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  next.setHours(0, 0, 0, 0);
  return next;
}

function inCurrentWeek(date: string): boolean {
  const start = todayKey(startOfWeek(new Date()));
  const end = todayKey(addDays(new Date(`${start}T00:00:00`), 6));
  return date >= start && date <= end;
}

function reviewCorpus(reviews: TodayReview[]): string {
  return reviews
    .filter((review) => inCurrentWeek(review.date))
    .flatMap((review) => [
      review.happenedToday,
      review.completedToday,
      review.unfinishedToday,
      review.tomorrowPlan
    ])
    .filter(Boolean)
    .join("\n");
}

function completedExecution(record: DailyExecutionRecord): boolean {
  return Boolean(
    record.readyToSleepAt ||
      record.checkinCompletedAt ||
      ["ready_to_sleep", "needs_checkin", "checked_in", "feedback_viewed"].includes(record.status)
  );
}

function uniqueDates(dates: string[]): Set<string> {
  return new Set(dates.filter(Boolean));
}

function countCompletedCycleDates(
  executionRecords: DailyExecutionRecord[],
  sleepRecords: SleepRecord[],
  sessionsByDate: Record<string, RescueSession>
): number {
  return uniqueDates([
    ...executionRecords.filter(completedExecution).map((record) => record.date),
    ...Object.values(sessionsByDate)
      .filter((session) => Boolean(session.readyToSleepAt || ["ready_to_sleep", "completed"].includes(session.status)))
      .map((session) => session.date),
    ...sleepRecords.map((record) => record.date)
  ]).size;
}

function countReviewDates(
  executionRecords: DailyExecutionRecord[],
  sessionsByDate: Record<string, RescueSession>,
  reviews: TodayReview[]
): number {
  return uniqueDates([
    ...executionRecords
      .filter((record) => Boolean(record.reviewCompletedAt || ["review_completed", "sleep_aid_started", "ready_to_sleep", "needs_checkin", "checked_in", "feedback_viewed"].includes(record.status)))
      .map((record) => record.date),
    ...Object.values(sessionsByDate)
      .filter((session) => Boolean(session.todayReviewCompleted))
      .map((session) => session.date),
    ...reviews.map((review) => review.date)
  ]).size;
}

function countPauseActions(
  executionRecords: DailyExecutionRecord[],
  sessionsByDate: Record<string, RescueSession>
): number {
  const dates = uniqueDates([
    ...executionRecords.map((record) => record.date),
    ...Object.values(sessionsByDate).map((session) => session.date)
  ]);

  return [...dates].reduce((sum, date) => {
    const record = executionRecords.find((item) => item.date === date);
    const session = sessionsByDate[date];
    const executionCount = (record?.rescuePauseCount ?? 0) + (record?.shutdownChallengeCount ?? 0);
    const sessionCount = session?.shutdownChallengeCompleted || session?.hasUrgeToScroll ? 1 : 0;
    return sum + Math.max(executionCount, sessionCount);
  }, 0);
}

function countNearTargetDates(
  executionRecords: DailyExecutionRecord[],
  sleepRecords: SleepRecord[]
): number {
  return uniqueDates([
    ...executionRecords.filter((record) => record.sleepResult === "near_target").map((record) => record.date),
    ...sleepRecords.filter((record) => record.success).map((record) => record.date)
  ]).size;
}

function createWeeklySummaryMetrics(input: WeeklySummaryInput): WeeklySummaryMetrics {
  const weekExecutions = input.executionRecords.filter((record) => inCurrentWeek(record.date));
  const weekRecords = input.records.filter((record) => inCurrentWeek(record.date));
  const weekSessions = Object.fromEntries(
    Object.entries(input.sessions).filter(([date]) => inCurrentWeek(date))
  );
  const weekReviews = input.reviews.filter((review) => inCurrentWeek(review.date));

  return {
    completedCycleDays: countCompletedCycleDates(weekExecutions, weekRecords, weekSessions),
    reviewDays: countReviewDates(weekExecutions, weekSessions, weekReviews),
    pauseCount: countPauseActions(weekExecutions, weekSessions),
    nearTargetDays: countNearTargetDates(weekExecutions, weekRecords)
  };
}

function createContent(result: WeeklySummaryResult): string {
  return [
    result.summary,
    "",
    "本周看见的变化：",
    ...result.highlights.map((highlight) => `- ${highlight}`),
    "",
    `下周先做：${result.nextFocus}`
  ].join("\n");
}

export function createLocalWeeklySummary(input: WeeklySummaryInput, safetyLabel?: SafetyLabel): WeeklySummaryResult {
  const label = safetyLabel ?? getSafetyLabel(reviewCorpus(input.reviews));
  const metrics = createWeeklySummaryMetrics(input);

  const summary = applySafetyBoundary(
    metrics.completedCycleDays > 0
      ? `这周你完成了 ${metrics.completedCycleDays} 次睡前收尾。它们不一定每次都完美，但已经在帮身体重新学习“夜晚可以结束”。`
      : "这周的数据还不多，但只要开始记录，夜晚就不再是一团模糊的自责。先从一次很小的收尾开始。",
    label
  );

  return {
    title: "本周晚安总结",
    summary,
    highlights: [
      metrics.completedCycleDays > 0 ? `你完成了 ${metrics.completedCycleDays} 次睡前收尾，让夜晚有了更清楚的结束。` : "睡前收尾记录还少，下周先完成一次最小闭环就很好。",
      metrics.reviewDays > 0 ? `你做了 ${metrics.reviewDays} 次复盘，把脑子里的事放到了屏幕外。` : "复盘记录还少，下周可以先写一句最占脑子的事。",
      metrics.pauseCount > 0 ? `你有 ${metrics.pauseCount} 次在想继续刷时停了下来。` : "下次想继续刷时，只需要先暂停 2 分钟。"
    ],
    nextFocus: "提前 10 分钟开始收尾，只完成“收住外界、写一句、选一个助眠入口”这三个最小动作。",
    source: "fallback",
    safetyLabel: label,
    createdAt: new Date().toISOString()
  };
}

async function persistWeeklySummary(result: WeeklySummaryResult): Promise<void> {
  await saveAiGeneratedOutput({
    mode: "weekly_summary",
    date: todayKey(),
    title: result.title,
    content: createContent(result),
    source: result.source,
    safetyLabel: result.safetyLabel,
    remoteId: result.conversationId,
    metadata: {
      highlightCount: result.highlights.length
    }
  });
}

export async function generateWeeklySummary(input: WeeklySummaryInput): Promise<WeeklySummaryResult> {
  const safetyLabel = getSafetyLabel(reviewCorpus(input.reviews));
  const fallback = createLocalWeeklySummary(input, safetyLabel);
  const metrics = createWeeklySummaryMetrics(input);
  const weekExecutions = input.executionRecords.filter((record) => inCurrentWeek(record.date));
  const weekRecords = input.records.filter((record) => inCurrentWeek(record.date));
  const weekReviews = input.reviews.filter((review) => inCurrentWeek(review.date));
  const weekSessions = Object.fromEntries(
    Object.entries(input.sessions).filter(([date]) => inCurrentWeek(date))
  );

  if (safetyLabel === "crisis" || safetyLabel === "medical_boundary") {
    await persistWeeklySummary(fallback);
    trackAppEvent("weekly_summary_generated", { source: "fallback", safetyLabel }).catch(() => undefined);
    return fallback;
  }

  const supabase = getSupabaseClient();

  if (!supabase) {
    await persistWeeklySummary(fallback);
    trackAppEvent("weekly_summary_generated", { source: "fallback", safetyLabel }).catch(() => undefined);
    return fallback;
  }

  const { data, error } = await supabase.functions.invoke<{
    conversationId?: string;
    title?: string;
    summary?: string;
    highlights?: string[];
    nextFocus?: string;
    source?: AiGeneratedOutputSource;
    safetyLabel?: SafetyLabel;
  }>("weekly-summary", {
    body: {
      targetSleepTime: input.config.targetSleepTime,
      wakeUpTime: input.config.wakeUpTime,
      metrics,
      executionRecords: weekExecutions,
      sleepRecords: weekRecords,
      sessions: weekSessions,
      reviews: weekReviews
    }
  });

  if (error || !data?.summary) {
    await persistWeeklySummary(fallback);
    trackAppEvent("weekly_summary_generated", { source: "fallback", safetyLabel }).catch(() => undefined);
    return fallback;
  }

  const result: WeeklySummaryResult = {
    conversationId: data.conversationId,
    title: data.title ?? "本周晚安总结",
    summary: applySafetyBoundary(data.summary, data.safetyLabel ?? safetyLabel),
    highlights: fallback.highlights,
    nextFocus: data.nextFocus ?? fallback.nextFocus,
    source: data.source ?? "cloud",
    safetyLabel: data.safetyLabel ?? safetyLabel,
    createdAt: new Date().toISOString()
  };

  await persistWeeklySummary(result);
  trackAppEvent("weekly_summary_generated", { source: result.source, safetyLabel: result.safetyLabel }).catch(() => undefined);
  return result;
}

export function formatWeeklySummary(result: WeeklySummaryResult): string {
  return createContent(result);
}
