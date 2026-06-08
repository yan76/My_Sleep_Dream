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
  executionRecords?: Array<Record<string, unknown>>;
  sleepRecords?: Array<Record<string, unknown>>;
  reviews?: Array<Record<string, unknown>>;
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

  const completedCount = (payload.executionRecords ?? []).filter((record) =>
    Boolean(record.readyToSleepAt || record.checkinCompletedAt || record.status === "checked_in")
  ).length;
  const reviewCount = payload.reviews?.length ?? 0;
  const sleepRecordCount = payload.sleepRecords?.length ?? 0;
  const target = payload.targetSleepTime ?? "目标时间";

  return {
    title: "本周晚安总结",
    summary:
      completedCount > 0 || sleepRecordCount > 0
        ? `这周你留下了 ${Math.max(completedCount, sleepRecordCount)} 个夜晚的记录。它们不一定每次都完美，但已经在帮身体重新学习“夜晚可以结束”。`
        : "这周的数据还不多，但只要开始记录，夜晚就不再是一团模糊的自责。先从一次很小的收尾开始。",
    highlights: [
      reviewCount > 0 ? `你做了 ${reviewCount} 次复盘，把脑子里的事放到了屏幕外。` : "复盘记录还少，下周可以先写一句最占脑子的事。",
      `目标时间先维持在 ${target}，不要急着加码。`,
      "能完成最小闭环，比追求完美更重要。"
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
              "你是早睡自救局的周总结生成器。只基于用户睡前行为和记录做温柔、具体、非评判总结。不要医疗诊断、治疗承诺或药物建议。只输出严格 JSON：{\"title\":\"...\",\"summary\":\"...\",\"highlights\":[\"...\"],\"nextFocus\":\"...\"}。"
          },
          {
            role: "user",
            content: JSON.stringify(payload)
          }
        ]);
  const parsed = parseSummary(aiContent);
  const summary = parsed ?? fallback;

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
