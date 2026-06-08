import { getSupabaseClient } from "@/api/supabase";
import {
  applySafetyBoundary,
  createCrisisSafetyReply,
  getSafetyLabel
} from "@/services/aiSafety";
import { trackAppEvent } from "@/services/analyticsService";

export type TreeHoleMessage = {
  role: "user" | "assistant";
  content: string;
};

export type SendTreeHoleMessageInput = {
  conversationId?: string;
  message: string;
  context?: TreeHoleMessage[];
};

export type SendTreeHoleMessageResult = {
  conversationId?: string;
  message: string;
  source: "cloud" | "fallback";
};

export function createTreeHoleFallbackReply(message: string): string {
  const safetyLabel = getSafetyLabel(message);

  if (safetyLabel === "crisis") {
    return createCrisisSafetyReply();
  }

  return applySafetyBoundary(
    "我在。先不用把它讲完整，能把最占脑子的那一句放在这里，就已经是在给今晚减一点重量。我们先不解决人生，只把今天收好。",
    safetyLabel
  );
}

export async function sendTreeHoleMessage(
  input: SendTreeHoleMessageInput
): Promise<SendTreeHoleMessageResult> {
  const supabase = getSupabaseClient();
  const trimmed = input.message.trim();

  if (!trimmed) {
    return {
      message: "你可以只写几个字，我会在这里接住。",
      source: "fallback"
    };
  }

  if (!supabase) {
    trackAppEvent("tree_hole_message_sent", { source: "fallback" }).catch(() => undefined);
    return {
      conversationId: input.conversationId,
      message: createTreeHoleFallbackReply(trimmed),
      source: "fallback"
    };
  }

  const { data, error } = await supabase.functions.invoke<{
    conversationId?: string;
    message?: string;
  }>("ai-chat", {
    body: {
      conversationId: input.conversationId,
      message: trimmed,
      context: input.context?.slice(-8)
    }
  });

  if (error || !data?.message) {
    trackAppEvent("tree_hole_message_sent", { source: "fallback" }).catch(() => undefined);
    return {
      conversationId: input.conversationId,
      message: createTreeHoleFallbackReply(trimmed),
      source: "fallback"
    };
  }

  trackAppEvent("tree_hole_message_sent", { source: "cloud" }).catch(() => undefined);
  return {
    conversationId: data.conversationId ?? input.conversationId,
    message: data.message,
    source: "cloud"
  };
}
