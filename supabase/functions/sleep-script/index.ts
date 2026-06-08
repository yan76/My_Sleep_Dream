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

type SleepScriptRequest = {
  targetSleepTime?: string;
  lateNightReasons?: string[];
  sleepAidPreferences?: string[];
  review?: {
    happenedToday?: string;
    completedToday?: string;
    unfinishedToday?: string;
    tomorrowPlan?: string;
    minimalMode?: boolean;
  } | null;
};

type SafetyLabel = "normal" | "sensitive" | "crisis" | "medical_boundary";

const MAX_DAILY_SLEEP_SCRIPTS = 8;
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

function reviewText(payload: SleepScriptRequest): string {
  return [
    payload.review?.happenedToday,
    payload.review?.completedToday,
    payload.review?.unfinishedToday,
    payload.review?.tomorrowPlan
  ]
    .filter(Boolean)
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

function crisisReply(): string {
  return "我听见你现在真的很难受。这个时刻请先不要一个人扛着，尽快联系身边可信任的人，或拨打当地紧急求助电话。先让自己去到有人的地方，把手机放在手边，好吗？";
}

function localFallbackScript(payload: SleepScriptRequest, safetyLabel: SafetyLabel): string {
  if (safetyLabel === "crisis") {
    return crisisReply();
  }

  if (safetyLabel === "medical_boundary") {
    return "我可以陪你做睡前收束和情绪安放，但不能提供医疗诊断、药物剂量或心理治疗建议。如果你正在经历持续失眠、强烈焦虑或身体不适，请联系专业医生或心理健康服务。\n\n今晚先只做一件温和的小事：把灯调暗，放下屏幕，给身体一个不用继续解决问题的信号。";
  }

  const reasons = payload.lateNightReasons?.length ? payload.lateNightReasons.join("、") : "今晚没有特别标记原因";
  const preferences = payload.sleepAidPreferences?.length ? payload.sleepAidPreferences.join("、") : "温和暗示";
  const unfinished = payload.review?.unfinishedToday?.trim();
  const tomorrowPlan = payload.review?.tomorrowPlan?.trim();
  return [
    "先把肩膀放下来。今晚不是用来继续证明自己的。",
    `你已经看见了今晚最容易把自己带走的入口：${reasons}。看见它，就已经不是被它完全牵着走。`,
    unfinished ? `那件还没收完的事，先放在这里：${unfinished}。它可以等到明天。` : "",
    tomorrowPlan ? `明天只先做这一件小事：${tomorrowPlan}。写到这里，今天就可以收尾。` : "",
    `接下来用 ${preferences} 的节奏，把灯调暗，呼吸放慢。目标不是立刻睡着，而是给身体一个停止工作的信号。`,
    "如果脑子又开始跑，就轻轻对自己说：今天已经够了，剩下的交给明天。"
  ]
    .filter(Boolean)
    .join("\n\n");
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
      temperature: 0.75,
      max_tokens: 560
    })
  })
    .then((response) => (response.ok ? response.json() : undefined))
    .then((data) => data?.choices?.[0]?.message?.content as string | undefined)
    .catch(() => undefined);
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

  const payload = (await request.json()) as SleepScriptRequest;
  const safetyLabel = getSafetyLabel(reviewText(payload));
  const today = new Date().toISOString().slice(0, 10);
  const { data: usage } = await supabase
    .from("ai_usage_limits")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", today)
    .maybeSingle();

  if ((usage?.sleep_script_count ?? 0) >= MAX_DAILY_SLEEP_SCRIPTS) {
    return jsonResponse({
      code: "USAGE_LIMIT_EXCEEDED",
      message: "今天的睡意生成次数已经用完，明天还可以继续。"
    }, 429);
  }

  const { data: conversation, error: conversationError } = await supabase
    .from("ai_conversations")
    .insert({
      user_id: user.id,
      mode: "sleep_script",
      title: "今晚的晚安暗示",
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
    content: JSON.stringify(payload).slice(0, 8000),
    safety_label: safetyLabel
  });

  const fallback = localFallbackScript(payload, safetyLabel);
  const assistantContent =
    safetyLabel === "crisis" || safetyLabel === "medical_boundary"
      ? fallback
      : (await callOpenAI([
          {
            role: "system",
            content:
              "你是早睡自救局的睡前暗示生成器。语气温柔、短句、非评判。不要提供医疗诊断、药物建议或心理治疗承诺。输出一段 180-260 字中文晚安暗示，帮助用户把今天收尾并进入睡意。"
          },
          {
            role: "user",
            content: JSON.stringify(payload)
          }
        ]))?.trim() || fallback;

  await supabase.from("ai_messages").insert({
    user_id: user.id,
    conversation_id: conversation.id,
    role: "assistant",
    content: assistantContent,
    safety_label: safetyLabel
  });

  await supabase.from("ai_usage_limits").upsert({
    user_id: user.id,
    date: today,
    chat_message_count: usage?.chat_message_count ?? 0,
    sleep_script_count: (usage?.sleep_script_count ?? 0) + 1,
    weekly_summary_count: usage?.weekly_summary_count ?? 0
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
    title: "今晚的晚安暗示",
    script: assistantContent,
    source: assistantContent === fallback ? "fallback" : "cloud",
    safetyLabel
  });
});
