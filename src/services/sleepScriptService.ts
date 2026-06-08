import { getSupabaseClient } from "@/api/supabase";
import {
  AiGeneratedOutputSource,
  saveAiGeneratedOutput
} from "@/storage/aiGenerationStorage";
import { LateNightReason, SleepAidPreference, TodayReview } from "@/types/app";
import { todayKey } from "@/utils/date";
import {
  applySafetyBoundary,
  getSafetyLabel,
  SafetyLabel
} from "@/services/aiSafety";
import { trackAppEvent } from "@/services/analyticsService";

export type SleepScriptInput = {
  targetSleepTime?: string;
  lateNightReasons?: LateNightReason[];
  sleepAidPreferences?: SleepAidPreference[];
  review?: Partial<
    Pick<TodayReview, "happenedToday" | "completedToday" | "unfinishedToday" | "tomorrowPlan" | "minimalMode">
  > | null;
};

export type SleepScriptResult = {
  conversationId?: string;
  title: string;
  script: string;
  source: AiGeneratedOutputSource;
  safetyLabel: SafetyLabel;
  createdAt: string;
};

const reasonLabels: Record<LateNightReason, string> = {
  short_video: "短视频",
  social_media: "社交消息",
  gaming: "游戏",
  drama: "追剧或小说",
  work_study: "工作学习",
  revenge_bedtime: "报复性熬夜",
  anxiety: "焦虑停不下来",
  other: "其他原因"
};

const preferenceLabels: Record<SleepAidPreference, string> = {
  sound_spa: "声音 Spa",
  suggestion: "心理暗示",
  tree_hole: "AI 树洞",
  white_noise: "白噪音",
  asmr: "ASMR"
};

function reviewText(review: SleepScriptInput["review"]): string {
  if (!review) {
    return "";
  }

  return [
    review.happenedToday,
    review.completedToday,
    review.unfinishedToday,
    review.tomorrowPlan
  ]
    .filter(Boolean)
    .join("\n");
}

function describeReasons(reasons: LateNightReason[] = []): string {
  if (!reasons.length) {
    return "今晚没有特别标记晚睡原因";
  }

  return reasons.map((reason) => reasonLabels[reason]).join("、");
}

function describePreferences(preferences: SleepAidPreference[] = []): string {
  if (!preferences.length) {
    return "温和暗示";
  }

  return preferences.map((preference) => preferenceLabels[preference]).join("、");
}

export function createLocalSleepScript(input: SleepScriptInput, safetyLabel?: SafetyLabel): SleepScriptResult {
  const label = safetyLabel ?? getSafetyLabel(reviewText(input.review));
  const reasons = input.lateNightReasons ?? [];
  const reasonLine = describeReasons(reasons);
  const preferenceLine = describePreferences(input.sleepAidPreferences);
  const tomorrowPlan = input.review?.tomorrowPlan?.trim();
  const unfinished = input.review?.unfinishedToday?.trim();
  const target = input.targetSleepTime ?? "今晚的目标时间";

  const baseScript = [
    "先把肩膀放下来。今晚不是用来继续证明自己的。",
    `你已经看见了今晚最容易把自己带走的入口：${reasonLine}。看见它，就已经不是被它完全牵着走。`,
    unfinished ? `那件还没收完的事，先放在这里：${unfinished}。它可以等到明天，不需要今晚继续消耗你。` : "",
    tomorrowPlan ? `明天只先做这一件小事：${tomorrowPlan}。写到这里，今天就可以收尾。` : "",
    `接下来用 ${preferenceLine} 的节奏，把灯调暗，呼吸放慢。目标不是立刻睡着，而是在 ${target} 前后给身体一个停止工作的信号。`,
    "如果脑子又开始跑，就轻轻对自己说：今天已经够了，剩下的交给明天。"
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    title: "今晚的晚安暗示",
    script: applySafetyBoundary(baseScript, label),
    source: "fallback",
    safetyLabel: label,
    createdAt: new Date().toISOString()
  };
}

async function persistSleepScript(result: SleepScriptResult, input: SleepScriptInput): Promise<void> {
  await saveAiGeneratedOutput({
    mode: "sleep_script",
    date: todayKey(),
    title: result.title,
    content: result.script,
    source: result.source,
    safetyLabel: result.safetyLabel,
    remoteId: result.conversationId,
    metadata: {
      targetSleepTime: input.targetSleepTime,
      lateNightReasons: input.lateNightReasons,
      sleepAidPreferences: input.sleepAidPreferences
    }
  });
}

export async function generateSleepScript(input: SleepScriptInput): Promise<SleepScriptResult> {
  const safetyLabel = getSafetyLabel(reviewText(input.review));
  const fallback = createLocalSleepScript(input, safetyLabel);

  if (safetyLabel === "crisis" || safetyLabel === "medical_boundary") {
    await persistSleepScript(fallback, input);
    trackAppEvent("sleep_script_generated", { source: "fallback", safetyLabel }).catch(() => undefined);
    return fallback;
  }

  const supabase = getSupabaseClient();

  if (!supabase) {
    await persistSleepScript(fallback, input);
    trackAppEvent("sleep_script_generated", { source: "fallback", safetyLabel }).catch(() => undefined);
    return fallback;
  }

  const { data, error } = await supabase.functions.invoke<{
    conversationId?: string;
    title?: string;
    script?: string;
    source?: AiGeneratedOutputSource;
    safetyLabel?: SafetyLabel;
  }>("sleep-script", {
    body: input
  });

  if (error || !data?.script) {
    await persistSleepScript(fallback, input);
    trackAppEvent("sleep_script_generated", { source: "fallback", safetyLabel }).catch(() => undefined);
    return fallback;
  }

  const result: SleepScriptResult = {
    conversationId: data.conversationId,
    title: data.title ?? "今晚的晚安暗示",
    script: applySafetyBoundary(data.script, data.safetyLabel ?? safetyLabel),
    source: data.source ?? "cloud",
    safetyLabel: data.safetyLabel ?? safetyLabel,
    createdAt: new Date().toISOString()
  };

  await persistSleepScript(result, input);
  trackAppEvent("sleep_script_generated", { source: result.source, safetyLabel: result.safetyLabel }).catch(() => undefined);
  return result;
}
