type WebSupabaseClient = {
  auth: never;
  functions: never;
  from: never;
};

export function isSupabaseConfigured(): boolean {
  return false;
}

export function getSupabaseClient(): WebSupabaseClient | null {
  return null;
}

export function requireSupabaseClient(): WebSupabaseClient {
  throw new Error("Web demo 未配置 Supabase，云端同步与 AI 将使用本地兜底。");
}
