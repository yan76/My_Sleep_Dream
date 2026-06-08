create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_sleep_time text not null default '23:30',
  wake_up_time text not null default '07:30',
  reminder_enabled boolean not null default true,
  reminder_time text not null default '22:50',
  reminder_minutes_before integer not null default 30,
  late_night_reasons jsonb not null default '[]'::jsonb,
  sleep_aid_preferences jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

create table if not exists public.daily_cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  status text not null check (
    status in (
      'not_started',
      'ritual_started',
      'external_closed',
      'review_completed',
      'sleep_aid_started',
      'ready_to_sleep',
      'needs_checkin',
      'checked_in',
      'feedback_viewed'
    )
  ),
  planned_sleep_time text not null,
  wake_up_time text not null,
  ritual_started_at timestamptz,
  external_closed_at timestamptz,
  review_completed_at timestamptz,
  sleep_aid_started_at timestamptz,
  ready_to_sleep_at timestamptz,
  checkin_completed_at timestamptz,
  feedback_viewed_at timestamptz,
  used_sound_spa boolean not null default false,
  used_tree_hole boolean not null default false,
  used_sleep_generator boolean not null default false,
  shutdown_challenge_count integer not null default 0,
  rescue_pause_count integer not null default 0,
  actual_sleep_time text,
  sleep_result text check (sleep_result is null or sleep_result in ('near_target', 'slightly_late', 'very_late')),
  morning_mood text check (morning_mood is null or morning_mood in ('good', 'okay', 'tired')),
  late_reason text,
  sleep_audio_enabled boolean not null default false,
  sleep_audio_session_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique(user_id, date)
);

create table if not exists public.today_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  daily_cycle_id uuid not null references public.daily_cycles(id) on delete cascade,
  date date not null,
  mood text,
  happened_today text not null default '',
  completed_today text not null default '',
  unfinished_today text not null default '',
  tomorrow_plan text not null default '',
  closing_note text not null default '',
  affirmation text,
  minimal_mode boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, date)
);

create table if not exists public.sleep_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  daily_cycle_id uuid not null references public.daily_cycles(id) on delete cascade,
  date date not null,
  planned_sleep_time text not null,
  actual_sleep_time text,
  sleep_result text check (sleep_result is null or sleep_result in ('near_target', 'slightly_late', 'very_late')),
  morning_mood text check (morning_mood is null or morning_mood in ('good', 'okay', 'tired')),
  late_reason text,
  reflection text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, date)
);

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  daily_cycle_id uuid references public.daily_cycles(id) on delete set null,
  mode text not null check (mode in ('tree_hole', 'sleep_script', 'weekly_summary')),
  title text,
  status text not null default 'active' check (status in ('active', 'completed', 'failed')),
  message_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  safety_label text check (safety_label is null or safety_label in ('normal', 'sensitive', 'crisis', 'medical_boundary')),
  created_at timestamptz not null default now()
);

create table if not exists public.ai_usage_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  chat_message_count integer not null default 0,
  sleep_script_count integer not null default 0,
  weekly_summary_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, date)
);

create table if not exists public.sleep_audio_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  daily_cycle_id uuid not null references public.daily_cycles(id) on delete cascade,
  date date not null,
  status text not null check (status in ('idle', 'permission_denied', 'recording', 'stopped', 'completed', 'failed')),
  started_at timestamptz,
  stopped_at timestamptz,
  event_count integer not null default 0,
  summary jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, date)
);

create table if not exists public.sleep_audio_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sleep_audio_session_id uuid not null references public.sleep_audio_sessions(id) on delete cascade,
  started_at timestamptz not null,
  duration_ms integer not null,
  type text not null check (type in ('voice_like', 'snore_like', 'noise_like', 'unknown')),
  confidence real,
  created_at timestamptz not null default now()
);

create table if not exists public.app_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  event_name text not null,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_daily_cycles_user_date on public.daily_cycles(user_id, date desc);
create index if not exists idx_today_reviews_user_date on public.today_reviews(user_id, date desc);
create index if not exists idx_sleep_records_user_date on public.sleep_records(user_id, date desc);
create index if not exists idx_ai_conversations_user_created on public.ai_conversations(user_id, created_at desc);
create index if not exists idx_ai_messages_conversation_created on public.ai_messages(conversation_id, created_at asc);
create index if not exists idx_sleep_audio_sessions_user_date on public.sleep_audio_sessions(user_id, date desc);
create index if not exists idx_app_events_user_created on public.app_events(user_id, created_at desc);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles',
    'user_preferences',
    'daily_cycles',
    'today_reviews',
    'sleep_records',
    'ai_conversations',
    'ai_messages',
    'ai_usage_limits',
    'sleep_audio_sessions',
    'sleep_audio_events',
    'app_events'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

create policy "profiles_select_own" on public.profiles
for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_delete_own" on public.profiles
for delete using (auth.uid() = id);

create policy "user_preferences_all_own" on public.user_preferences
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "daily_cycles_all_own" on public.daily_cycles
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "today_reviews_all_own" on public.today_reviews
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sleep_records_all_own" on public.sleep_records
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ai_conversations_all_own" on public.ai_conversations
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ai_messages_all_own" on public.ai_messages
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ai_usage_limits_all_own" on public.ai_usage_limits
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sleep_audio_sessions_all_own" on public.sleep_audio_sessions
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sleep_audio_events_all_own" on public.sleep_audio_events
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "app_events_all_own" on public.app_events
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();
create trigger user_preferences_set_updated_at
before update on public.user_preferences
for each row execute function public.set_updated_at();
create trigger daily_cycles_set_updated_at
before update on public.daily_cycles
for each row execute function public.set_updated_at();
create trigger today_reviews_set_updated_at
before update on public.today_reviews
for each row execute function public.set_updated_at();
create trigger sleep_records_set_updated_at
before update on public.sleep_records
for each row execute function public.set_updated_at();
create trigger ai_conversations_set_updated_at
before update on public.ai_conversations
for each row execute function public.set_updated_at();
create trigger ai_usage_limits_set_updated_at
before update on public.ai_usage_limits
for each row execute function public.set_updated_at();
create trigger sleep_audio_sessions_set_updated_at
before update on public.sleep_audio_sessions
for each row execute function public.set_updated_at();
