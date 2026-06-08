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

type ChatRequest = {
  conversationId?: string;
  dailyCycleId?: string;
  message: string;
  context?: ChatMessage[];
};

const MAX_DAILY_MESSAGES = 20;
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

function isSensitiveCrisis(text: string): boolean {
  return /自杀|轻生|不想活|伤害自己|结束生命|活不下去/.test(text);
}

function localFallbackReply(message: string): string {
  if (isSensitiveCrisis(message)) {
    return "我听见你现在很难受。这个时候先不要一个人扛着，请立刻联系身边可信任的人，或拨打当地紧急求助电话。你可以先把手机放在手边，去到有人的地方。";
  }

  return "我在。先不用把整件事讲清楚，能说一句已经很好。今晚我们只做一件事：把最占脑子的部分先放在这里，剩下的交给明天。";
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
  const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse({ message: "Supabase env is missing" }, 500);
  }

  const authorization = request.headers.get("Authorization") ?? "";
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authorization
      }
    }
  });

  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData.user;

  if (userError || !user) {
    return jsonResponse({ message: "Unauthorized" }, 401);
  }

  const payload = (await request.json()) as ChatRequest;
  const message = payload.message.trim();

  if (!message) {
    return jsonResponse({ message: "Message is required" }, 400);
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data: usage } = await supabase
    .from("ai_usage_limits")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", today)
    .maybeSingle();

  if ((usage?.chat_message_count ?? 0) >= MAX_DAILY_MESSAGES) {
    return jsonResponse({
      code: "USAGE_LIMIT_EXCEEDED",
      message: "今天的 AI 树洞次数已经用完，明天还可以继续。"
    }, 429);
  }

  let conversationId = payload.conversationId;
  if (!conversationId) {
    const { data: conversation, error } = await supabase
      .from("ai_conversations")
      .insert({
        user_id: user.id,
        daily_cycle_id: payload.dailyCycleId ?? null,
        mode: "tree_hole",
        status: "active",
        message_count: 0
      })
      .select("id")
      .single();

    if (error) {
      return jsonResponse({ message: error.message }, 500);
    }

    conversationId = conversation.id;
  }

  await supabase.from("ai_messages").insert({
    user_id: user.id,
    conversation_id: conversationId,
    role: "user",
    content: message,
    safety_label: isSensitiveCrisis(message) ? "crisis" : "normal"
  });

  const context = (payload.context ?? []).slice(-8);
  const assistantContent = openaiApiKey
    ? await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          messages: [
            {
              role: "system",
              content:
                "你是早睡自救局里的睡前陪伴 AI。语气温柔、有边界、不羞辱用户。不做医疗诊断、心理治疗、药物建议。用户表达危机时，优先建议联系现实中的人和紧急帮助。"
            },
            ...context,
            { role: "user", content: message }
          ],
          temperature: 0.8,
          max_tokens: 420
        })
      })
        .then((response) => response.json())
        .then((data) => data.choices?.[0]?.message?.content as string | undefined)
        .catch(() => undefined)
    : undefined;

  const reply = assistantContent?.trim() || localFallbackReply(message);

  await supabase.from("ai_messages").insert({
    user_id: user.id,
    conversation_id: conversationId,
    role: "assistant",
    content: reply,
    safety_label: isSensitiveCrisis(message) ? "crisis" : "normal"
  });

  await supabase.from("ai_usage_limits").upsert({
    user_id: user.id,
    date: today,
    chat_message_count: (usage?.chat_message_count ?? 0) + 1,
    sleep_script_count: usage?.sleep_script_count ?? 0,
    weekly_summary_count: usage?.weekly_summary_count ?? 0
  }, {
    onConflict: "user_id,date"
  });

  await supabase
    .from("ai_conversations")
    .update({
      message_count: (usage?.chat_message_count ?? 0) + 2,
      updated_at: new Date().toISOString()
    })
    .eq("id", conversationId)
    .eq("user_id", user.id);

  return jsonResponse({
    conversationId,
    message: reply
  });
});
