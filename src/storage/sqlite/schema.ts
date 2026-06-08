export type LocalSchemaMigration = {
  version: number;
  name: string;
  sql: string;
};

export const localSchemaMigrations: LocalSchemaMigration[] = [
  {
    version: 1,
    name: "create_launch_ready_local_schema",
    sql: `
      create table if not exists user_preferences (
        id text primary key,
        user_id text,
        target_sleep_time text not null,
        wake_up_time text not null,
        reminder_enabled integer not null default 1,
        reminder_time text not null,
        reminder_minutes_before integer not null default 30,
        late_night_reasons_json text not null,
        sleep_aid_preferences_json text not null,
        created_at text not null,
        updated_at text not null,
        sync_status text not null default 'local_only'
      );

      create table if not exists daily_cycles (
        id text primary key,
        user_id text,
        date text not null unique,
        status text not null,
        planned_sleep_time text not null,
        wake_up_time text not null,
        ritual_started_at text,
        external_closed_at text,
        review_completed_at text,
        sleep_aid_started_at text,
        ready_to_sleep_at text,
        checkin_completed_at text,
        feedback_viewed_at text,
        used_sound_spa integer not null default 0,
        used_tree_hole integer not null default 0,
        used_sleep_generator integer not null default 0,
        shutdown_challenge_count integer not null default 0,
        rescue_pause_count integer not null default 0,
        actual_sleep_time text,
        sleep_result text,
        morning_mood text,
        late_reason text,
        sleep_audio_enabled integer not null default 0,
        sleep_audio_session_id text,
        created_at text not null,
        updated_at text not null,
        deleted_at text,
        sync_status text not null default 'local_only'
      );

      create table if not exists today_reviews (
        id text primary key,
        user_id text,
        daily_cycle_id text not null,
        date text not null,
        mood text,
        happened_today text not null,
        completed_today text not null,
        unfinished_today text not null,
        tomorrow_plan text not null,
        closing_note text not null,
        affirmation text,
        minimal_mode integer not null default 0,
        created_at text not null,
        updated_at text not null,
        sync_status text not null default 'local_only'
      );

      create table if not exists sleep_records (
        id text primary key,
        user_id text,
        daily_cycle_id text not null,
        date text not null,
        planned_sleep_time text not null,
        actual_sleep_time text,
        sleep_result text,
        morning_mood text,
        late_reason text,
        reflection text,
        created_at text not null,
        updated_at text not null,
        sync_status text not null default 'local_only'
      );

      create table if not exists ai_conversations (
        id text primary key,
        user_id text,
        daily_cycle_id text,
        mode text not null,
        title text,
        status text not null,
        message_count integer not null default 0,
        created_at text not null,
        updated_at text not null,
        sync_status text not null default 'local_only'
      );

      create table if not exists ai_messages (
        id text primary key,
        conversation_id text not null,
        role text not null,
        content text not null,
        safety_label text,
        created_at text not null,
        sync_status text not null default 'local_only'
      );

      create table if not exists sleep_audio_sessions (
        id text primary key,
        user_id text,
        daily_cycle_id text not null,
        date text not null,
        status text not null,
        started_at text,
        stopped_at text,
        local_audio_uri text,
        event_count integer not null default 0,
        summary_json text,
        created_at text not null,
        updated_at text not null,
        sync_status text not null default 'local_only'
      );

      create table if not exists sleep_audio_events (
        id text primary key,
        sleep_audio_session_id text not null,
        started_at text not null,
        duration_ms integer not null,
        type text not null,
        confidence real,
        local_clip_uri text,
        created_at text not null,
        sync_status text not null default 'local_only'
      );

      create table if not exists sync_queue (
        id text primary key,
        entity_type text not null,
        entity_id text not null,
        operation text not null,
        payload_json text not null,
        attempts integer not null default 0,
        created_at text not null,
        updated_at text not null
      );

      create index if not exists idx_daily_cycles_date on daily_cycles(date);
      create index if not exists idx_today_reviews_date on today_reviews(date);
      create index if not exists idx_sleep_records_date on sleep_records(date);
      create index if not exists idx_ai_messages_conversation_id on ai_messages(conversation_id);
      create index if not exists idx_sleep_audio_sessions_date on sleep_audio_sessions(date);
      create index if not exists idx_sync_queue_entity on sync_queue(entity_type, entity_id);
    `
  },
  {
    version: 2,
    name: "add_sync_queue_last_error",
    sql: `
      alter table sync_queue add column last_error text;
    `
  }
];
