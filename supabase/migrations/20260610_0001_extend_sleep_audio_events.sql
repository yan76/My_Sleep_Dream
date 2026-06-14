alter table public.sleep_audio_events
  add column if not exists peak_db double precision,
  add column if not exists average_db double precision;

alter table public.sleep_audio_events
  drop constraint if exists sleep_audio_events_type_check;

alter table public.sleep_audio_events
  add constraint sleep_audio_events_type_check
  check (type in ('voice_like', 'snore_like', 'cough_like', 'movement_like', 'noise_like', 'unknown'));
