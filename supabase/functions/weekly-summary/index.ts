import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type WeeklySummaryRequest = {
  targetSleepTime?: string;
  wakeUpTime?: string;
  metrics?: Partial<WeeklySummaryMetrics>;
  executionRecords?: Array<Record<string, unknown>>;
  sleepRecords?: Array<Record<string, unknown>>;
  sessions?: Array<Record<string, unknown>> | Record<string, Record<string, unknown>>;
  reviews?: Array<Record<string, unknown>>;
};

type WeeklySummaryMetrics = {
  completedCycleDays: number;
  reviewDays: number;
  pauseCount: number;
  nearTargetDays: number;
};

type WeeklySummaryPayload = {
  title: string;
  summary: string;
  highlights: string[];
  nextFocus: string;
};

type SafetyLabel = "normal" | "sensitive" | "crisis" | "medical_boundary";

const MAX_DAILY_WEEKLY_SUMMARIES = 5;
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

function reviewText(payload: WeeklySummaryRequest): string {
  return (payload.reviews ?? [])
    .flatMap((review) => [
      review.happenedToday,
      review.completedToday,
      review.unfinishedToday,
      review.tomorrowPlan
    ])
    .filter((value): value is string => typeof value === "string")
    .join("\n");
}

function uniqueDates(dates: string[]): Set<string> {
  return new Set(dates.filter(Boolean));
}

function stringValue(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

function numberValue(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function booleanValue(record: Record<string, unknown>, key: string): boolean {
  return Boolean(record[key]);
}

function sessionRecords(payload: WeeklySummaryRequest): Array<Record<string, unknown>> {
  if (Array.isArray(payload.sessions)) {
    return payload.sessions;
  }

  if (payload.sessions && typeof payload.sessions === "object") {
    return Object.values(payload.sessions);
  }

  return [];
}

function completedExecution(record: Record<string, unknown>): boolean {
  const status = stringValue(record, "status");
  return Boolean(
    record.readyToSleepAt ||
      record.checkinCompletedAt ||
      ["ready_to_sleep", "needs_checkin", "checked_in", "feedback_viewed"].includes(status)
  );
}

function completedSession(record: Record<string, unknown>): boolean {
  const status = stringValue(record, "status");
  return Boolean(record.readyToSleepAt || ["ready_to_sleep", "completed"].includes(status));
}

function reviewedExecution(record: Record<string, unknown>): boolean {
  const status = stringValue(record, "status");
  return Boolean(
    record.reviewCompletedAt ||
      ["review_completed", "sleep_aid_started", "ready_to_sleep", "needs_checkin", "checked_in", "feedback_viewed"].includes(status)
  );
}

function countCompletedCycleDates(payload: WeeklySummaryRequest): number {
  return uniqueDates([
    ...(payload.executionRecords ?? []).filter(completedExecution).map((record) => stringValue(record, "date")),
    ...sessionRecords(payload).filter(completedSession).map((record) => stringValue(record, "date")),
    ...(payload.sleepRecords ?? []).map((record) => stringValue(record, "date"))
  ]).size;
}

function countReviewDates(payload: WeeklySummaryRequest): number {
  return uniqueDates([
    ...(payload.executionRecords ?? []).filter(reviewedExecution).map((record) => stringValue(record, "date")),
    ...sessionRecords(payload).filter((record) => booleanValue(record, "todayReviewCompleted")).map((record) => stringValue(record, "date")),
    ...(payload.reviews ?? []).map((review) => stringValue(review, "date"))
  ]).size;
}

function countPauseActions(payload: WeeklySummaryRequest): number {
  const executionByDate = new Map((payload.executionRecords ?? []).map((record) => [stringValue(record, "date"), record]));
  const sessionByDate = new Map(sessionRecords(payload).map((record) => [stringValue(record, "date"), record]));
  const dates = uniqueDates([...executionByDate.keys(), ...sessionByDate.keys()]);

  return [...dates].reduce((sum, date) => {
    const execution = executionByDate.get(date);
    const session = sessionByDate.get(date);
    const executionCount = execution ? numberValue(execution, "rescuePauseCount") + numberValue(execution, "shutdownChallengeCount") : 0;
    const sessionCount = session && (booleanValue(session, "shutdownChallengeCompleted") || booleanValue(session, "hasUrgeToScroll")) ? 1 : 0;
    return sum + Math.max(executionCount, sessionCount);
  }, 0);
}

function countNearTargetDates(payload: WeeklySummaryRequest): number {
  return uniqueDates([
    ...(payload.executionRecords ?? [])
      .filter((record) => stringValue(record, "sleepResult") === "near_target")
      .map((record) => stringValue(record, "date")),
    ...(payload.sleepRecords ?? [])
      .filter((record) => booleanValue(record, "success"))
      .map((record) => stringValue(record, "date"))
  ]).size;
}

function numberMetric(metrics: Partial<WeeklySummaryMetrics> | undefined, key: keyof WeeklySummaryMetrics): number | undefined {
  const value = metrics?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function resolveWeeklyMetrics(payload: WeeklySummaryRequest): WeeklySummaryMetrics {
  return {
    completedCycleDays: numberMetric(payload.metrics, "completedCycleDays") ?? countCompletedCycleDates(payload),
    reviewDays: numberMetric(payload.metrics, "reviewDays") ?? countReviewDates(payload),
    pauseCount: numberMetric(payload.metrics, "pauseCount") ?? countPauseActions(payload),
    nearTargetDays: numberMetric(payload.metrics, "nearTargetDays") ?? countNearTargetDates(payload)
  };
}

function getSafetyLabel(text: string): SafetyLabel {
  if (/自杀|轻生|不想活|活不下去|结束生命|伤害自己|自残|suicide|kill myself|self[-\s]?harm/i.test(text)) {
    return "crisis";
  }

  if (/诊断|治疗|药物|药量|安眠药|处方|抑郁症|焦虑症|therapy|medication|dosage|prescription/i.test(text)) {
    return "medical_boundary";
  }

  if (/崩溃|绝望|撑不住|恐慌|panic|despair|hopeless/i.test(text)) {
    return "sensitive";
  }

  return "normal";
}

function crisisReply(): WeeklySummaryPayload {
  return {
    title: "先保证安全",
    summary: "我听见你现在真的很难受。这个时刻请先不要一个人扛着，尽快联系身边可信任的人，或拨打当地紧急求助电话。",
    highlights: ["先去到有人的地方。", "把手机放在手边。", "联系一个现实中可信任的人。"],
    nextFocus: "今晚先不做复盘，先保证自己安全。"
  };
}

function localFallbackSummary(payload: WeeklySummaryRequest, safetyLabel: SafetyLabel): WeeklySummaryPayload {
  if (safetyLabel === "crisis") {
    return crisisReply();
  }

  if (safetyLabel === "medical_boundary") {
    return {
      title: "本周晚安总结",
      summary: "我可以帮你总结睡前行为和情绪收束，但不能提供医疗诊断、药物剂量或心理治疗建议。如果睡眠问题持续影响生活，请联系专业医生或心理健康服务。",
      highlights: ["你已经开始记录自己的夜晚。", "记录能帮你看见模式，而不是只剩自责。", "今晚先做温和收尾，不给自己加码。"],
      nextFocus: "下周只观察睡前 30 分钟发生了什么，不做医疗判断。"
    };
  }

  const metrics = resolveWeeklyMetrics(payload);
  const completedCount = metrics.completedCycleDays;
  const reviewCount = metrics.reviewDays;
  const pauseCount = metrics.pauseCount;

  return {
    title: "本周晚安总结",
    summary:
      completedCount > 0
        ? `这周你完成了 ${completedCount} 次睡前收尾。它们不一定每次都完美，但已经在帮身体重新学习“夜晚可以结束”。`
        : "这周的数据还不多，但只要开始记录，夜晚就不再是一团模糊的自责。先从一次很小的收尾开始。",
    highlights: [
      completedCount > 0 ? `你完成了 ${completedCount} 次睡前收尾，让夜晚有了更清楚的结束。` : "睡前收尾记录还少，下周先完成一次最小闭环就很好。",
      reviewCount > 0 ? `你做了 ${reviewCount} 次复盘，把脑子里的事放到了屏幕外。` : "复盘记录还少，下周可以先写一句最占脑子的事。",
      pauseCount > 0 ? `你有 ${pauseCount} 次在想继续刷时停了下来。` : "下次想继续刷时，只需要先暂停 2 分钟。"
    ],
    nextFocus: "提前 10 分钟开始收尾，只完成“收住外界、写一句、选一个助眠入口”这三个最小动作。"
  };
}

async function callOpenAI(messages: ChatMessage[]): Promise<string | undefined> {
  const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

  if (!openaiApiKey) {
    return undefined;
  }

  return fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages,
      temperature: 0.65,
      max_tokens: 620
    })
  })
    .then((response) => (response.ok ? response.json() : undefined))
    .then((data) => data?.choices?.[0]?.message?.content as string | undefined)
    .catch(() => undefined);
}

function parseSummary(content: string | undefined): WeeklySummaryPayload | null {
  if (!content) {
    return null;
  }

  try {
    const parsed = JSON.parse(content) as Partial<WeeklySummaryPayload>;
    if (parsed.summary) {
      return {
        title: parsed.title ?? "本周晚安总结",
        summary: parsed.summary,
        highlights: Array.isArray(parsed.highlights) ? parsed.highlights.slice(0, 4) : [],
        nextFocus: parsed.nextFocus ?? "下周先完成一次最小睡前闭环。"
      };
    }
  } catch {
    return null;
  }

  return null;
}

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ message: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse({ message: "Supabase env is missing" }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: request.headers.get("Authorization") ?? ""
      }
    }
  });
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData.user;

  if (userError || !user) {
    return jsonResponse({ message: "Unauthorized" }, 401);
  }

  const payload = (await request.json()) as WeeklySummaryRequest;
  const safetyLabel = getSafetyLabel(reviewText(payload));
  const today = new Date().toISOString().slice(0, 10);
  const { data: usage } = await supabase
    .from("ai_usage_limits")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", today)
    .maybeSingle();

  if ((usage?.weekly_summary_count ?? 0) >= MAX_DAILY_WEEKLY_SUMMARIES) {
    return jsonResponse({
      code: "USAGE_LIMIT_EXCEEDED",
      message: "今天的周总结生成次数已经用完，明天还可以继续。"
    }, 429);
  }

  const { data: conversation, error: conversationError } = await supabase
    .from("ai_conversations")
    .insert({
      user_id: user.id,
      mode: "weekly_summary",
      title: "本周晚安总结",
      status: "active",
      message_count: 0
    })
    .select("id")
    .single();

  if (conversationError) {
    return jsonResponse({ message: conversationError.message }, 500);
  }

  await supabase.from("ai_messages").insert({
    user_id: user.id,
    conversation_id: conversation.id,
    role: "user",
    content: JSON.stringify(payload).slice(0, 9000),
    safety_label: safetyLabel
  });

  const fallback = localFallbackSummary(payload, safetyLabel);
  const aiContent =
    safetyLabel === "crisis" || safetyLabel === "medical_boundary"
      ? undefined
      : await callOpenAI([
          {
            role: "system",
            content:
              "你是早睡自救局的周总结生成器。只基于用户睡前行为和记录做温柔、具体、非评判总结。必须直接使用 payload.metrics 中的 completedCycleDays（睡前收尾）、reviewDays（复盘）、pauseCount（停止刷手机）、nearTargetDays（接近目标时间），不要编造或改写这些数量。不要医疗诊断、治疗承诺或药物建议。只输出严格 JSON：{\"title\":\"...\",\"summary\":\"...\",\"highlights\":[\"...\"],\"nextFocus\":\"...\"}。"
          },
          {
            role: "user",
            content: JSON.stringify(payload)
          }
        ]);
  const parsed = parseSummary(aiContent);
  const summary = parsed ? { ...parsed, highlights: fallback.highlights } : fallback;

  await supabase.from("ai_messages").insert({
    user_id: user.id,
    conversation_id: conversation.id,
    role: "assistant",
    content: JSON.stringify(summary),
    safety_label: safetyLabel
  });

  await supabase.from("ai_usage_limits").upsert({
    user_id: user.id,
    date: today,
    chat_message_count: usage?.chat_message_count ?? 0,
    sleep_script_count: usage?.sleep_script_count ?? 0,
    weekly_summary_count: (usage?.weekly_summary_count ?? 0) + 1
  }, {
    onConflict: "user_id,date"
  });

  await supabase
    .from("ai_conversations")
    .update({
      message_count: 2,
      status: "completed",
      updated_at: new Date().toISOString()
    })
    .eq("id", conversation.id)
    .eq("user_id", user.id);

  return jsonResponse({
    conversationId: conversation.id,
    ...summary,
    source: parsed ? "cloud" : "fallback",
    safetyLabel
  });
});
