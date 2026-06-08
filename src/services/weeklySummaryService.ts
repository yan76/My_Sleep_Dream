import { getSupabaseClient } from "@/api/supabase";
import {
  AiGeneratedOutputSource,
  saveAiGeneratedOutput
} from "@/storage/aiGenerationStorage";
import { DailyExecutionRecord, SleepRecord, TodayReview, UserConfig } from "@/types/app";
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
  reviews: TodayReview[];
  config: UserConfig;
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

function inLastSevenDays(date: string): boolean {
  const start = todayKey(addDays(new Date(), -6));
  const end = todayKey();
  return date >= start && date <= end;
}

function reviewCorpus(reviews: TodayReview[]): string {
  return reviews
    .filter((review) => inLastSevenDays(review.date))
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
  return Boolean(record.readyToSleepAt || record.checkinCompletedAt || record.status === "checked_in");
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
  const weekExecutions = input.executionRecords.filter((record) => inLastSevenDays(record.date));
  const weekRecords = input.records.filter((record) => inLastSevenDays(record.date));
  const weekReviews = input.reviews.filter((review) => inLastSevenDays(review.date));
  const completedCount = weekExecutions.filter(completedExecution).length || weekRecords.length;
  const reviewCount = weekReviews.length;
  const pauseCount = weekExecutions.reduce(
    (sum, record) => sum + record.rescuePauseCount + record.shutdownChallengeCount,
    0
  );
  const nearTargetCount =
    weekExecutions.filter((record) => record.sleepResult === "near_target").length ||
    weekRecords.filter((record) => record.success).length;

  const summary = applySafetyBoundary(
    completedCount > 0
      ? `这周你完成了 ${completedCount} 次睡前收尾。它们不一定每次都完美，但已经在帮身体重新学习“夜晚可以结束”。`
      : "这周的数据还不多，但只要开始记录，夜晚就不再是一团模糊的自责。先从一次很小的收尾开始。",
    label
  );

  return {
    title: "本周晚安总结",
    summary,
    highlights: [
      reviewCount > 0 ? `你做了 ${reviewCount} 次复盘，把脑子里的事放到了屏幕外。` : "复盘记录还少，下周可以先写一句最占脑子的事。",
      pauseCount > 0 ? `你有 ${pauseCount} 次在想继续刷时停了下来。` : "下次想继续刷时，只需要先暂停 2 分钟。",
      nearTargetCount > 0 ? `${nearTargetCount} 个夜晚接近了目标时间。` : `目标时间先维持在 ${input.config.targetSleepTime}，不要急着加码。`
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
      executionRecords: input.executionRecords.filter((record) => inLastSevenDays(record.date)),
      sleepRecords: input.records.filter((record) => inLastSevenDays(record.date)),
      reviews: input.reviews.filter((review) => inLastSevenDays(review.date))
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
    highlights: data.highlights?.length ? data.highlights.slice(0, 4) : fallback.highlights,
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
