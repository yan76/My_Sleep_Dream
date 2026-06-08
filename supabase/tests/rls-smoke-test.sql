-- 第 14 周 RLS smoke test
-- 在 Supabase SQL Editor 或本地测试库中执行。
-- 目标：验证所有用户数据表只允许 auth.uid() 对应用户访问。

begin;

select plan(22);

select has_table('public', 'profiles', 'profiles exists');
select has_table('public', 'user_preferences', 'user_preferences exists');
select has_table('public', 'daily_cycles', 'daily_cycles exists');
select has_table('public', 'today_reviews', 'today_reviews exists');
select has_table('public', 'sleep_records', 'sleep_records exists');
select has_table('public', 'ai_conversations', 'ai_conversations exists');
select has_table('public', 'ai_messages', 'ai_messages exists');
select has_table('public', 'ai_usage_limits', 'ai_usage_limits exists');
select has_table('public', 'sleep_audio_sessions', 'sleep_audio_sessions exists');
select has_table('public', 'sleep_audio_events', 'sleep_audio_events exists');
select has_table('public', 'app_events', 'app_events exists');

select is((select relrowsecurity from pg_class where oid = 'public.profiles'::regclass), true, 'profiles RLS enabled');
select is((select relrowsecurity from pg_class where oid = 'public.user_preferences'::regclass), true, 'user_preferences RLS enabled');
select is((select relrowsecurity from pg_class where oid = 'public.daily_cycles'::regclass), true, 'daily_cycles RLS enabled');
select is((select relrowsecurity from pg_class where oid = 'public.today_reviews'::regclass), true, 'today_reviews RLS enabled');
select is((select relrowsecurity from pg_class where oid = 'public.sleep_records'::regclass), true, 'sleep_records RLS enabled');
select is((select relrowsecurity from pg_class where oid = 'public.ai_conversations'::regclass), true, 'ai_conversations RLS enabled');
select is((select relrowsecurity from pg_class where oid = 'public.ai_messages'::regclass), true, 'ai_messages RLS enabled');
select is((select relrowsecurity from pg_class where oid = 'public.ai_usage_limits'::regclass), true, 'ai_usage_limits RLS enabled');
select is((select relrowsecurity from pg_class where oid = 'public.sleep_audio_sessions'::regclass), true, 'sleep_audio_sessions RLS enabled');
select is((select relrowsecurity from pg_class where oid = 'public.sleep_audio_events'::regclass), true, 'sleep_audio_events RLS enabled');
select is((select relrowsecurity from pg_class where oid = 'public.app_events'::regclass), true, 'app_events RLS enabled');

select * from finish();

rollback;
