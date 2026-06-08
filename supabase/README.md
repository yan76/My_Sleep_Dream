# Supabase 上线基建

## 客户端配置

客户端只允许配置公开变量：

```txt
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_API_URL=https://your-project.functions.supabase.co
```

不要把 service role key、AI key、数据库密码放进 `EXPO_PUBLIC_` 变量。

## 迁移顺序

1. 创建 Supabase 项目。
2. 在 SQL Editor 或 Supabase CLI 中应用 `migrations/20260605_0001_launch_schema.sql`。
3. 打开 Auth 匿名登录，或配置邮箱登录。
4. 在客户端配置 `.env`，重新启动 Expo。
5. 部署 `supabase/functions/` 下的 Edge Functions。

## Edge Functions

当前函数：

- `ai-chat`：树洞对话。
- `sleep-script`：根据晚睡原因、助眠偏好、今日复盘生成晚安暗示。
- `weekly-summary`：根据最近一周记录生成成长总结。

服务端 secret 示例：

```txt
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

客户端不要配置 OpenAI key；未配置服务端 key 时，Edge Function 和客户端都会走兜底文案。

## 安全边界

- 所有用户私有表已启用 RLS。
- 用户只能读写 `auth.uid() = user_id` 的记录。
- `profiles` 使用 `id = auth.uid()` 访问。
- 原始睡眠音频不进入 Supabase，本迁移只保存摘要元数据。
- AI 输出只提供睡前收束和行为总结，不提供医疗诊断、药物剂量或心理治疗建议。
