import { getSupabaseClient, isSupabaseConfigured } from "@/api/supabase";

export type AuthState =
  | { status: "unconfigured" }
  | { status: "authenticated"; userId: string; anonymous: boolean }
  | { status: "signed_out" };

export async function getAuthState(): Promise<AuthState> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { status: "unconfigured" };
  }

  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;

  if (!user) {
    return { status: "signed_out" };
  }

  return {
    status: "authenticated",
    userId: user.id,
    anonymous: Boolean(user.is_anonymous)
  };
}

export async function ensureAnonymousSession(): Promise<AuthState> {
  const supabase = getSupabaseClient();

  if (!supabase || !isSupabaseConfigured()) {
    return { status: "unconfigured" };
  }

  const current = await getAuthState();
  if (current.status === "authenticated") {
    return current;
  }

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    throw error;
  }

  const user = data.user;
  if (!user) {
    return { status: "signed_out" };
  }

  await supabase.from("profiles").upsert({
    id: user.id,
    updated_at: new Date().toISOString()
  });

  return {
    status: "authenticated",
    userId: user.id,
    anonymous: Boolean(user.is_anonymous)
  };
}

export async function signOut(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return;
  }

  await supabase.auth.signOut();
}

export async function requestAccountDeletion(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return;
  }

  await supabase.functions.invoke("delete-account");
}
