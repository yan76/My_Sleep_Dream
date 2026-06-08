# 可上线版本数据模型与状态流设计 06-05

## 目标

本文件用于第 1 周上线化改造，目标是把当前 demo 的多套状态与存储收敛为一条可长期迭代的数据主线。

当前代码里同时存在：

- `DailyRecord`：早期打卡/徽章状态。
- `RescueSession`：睡前自救流程状态。
- `DailyExecutionRecord`：新主流程的每日执行状态。
- `SleepRecord`：次日睡眠结果。
- `TodayReview`：今日复盘。
- `SleepAudioSession`：睡眠监听摘要。

上线版本统一以 `DailyCycle` 为每日闭环主模型。其它模型作为内容明细表，通过 `daily_cycle_id` 或 `date` 关联，不再各自表达一套主流程状态。

## 保留、合并、废弃

### 保留

- `UserConfig` 的核心字段：目标睡觉时间、起床时间、提醒提前量、晚睡原因、助眠偏好。
- `TodayReview` 的复盘内容：占脑子的事、肯定自己的事、遗憾/未完成、明天一件小事、极简模式。
- `SleepRecord` 的次日结果：实际入睡时间、睡眠结果、醒来感受、晚睡原因。
- `SleepAudioSession` 的摘要字段：监听状态、开始/结束时间、事件数量、摘要，不上传原始音频。

### 合并

- `DailyRecord.status`、`RescueSession.status`、`DailyExecutionRecord.status` 合并为 `DailyCycle.status`。
- `RescueSession.shutdownChallengeCompleted` 与 `DailyExecutionRecord.shutdownChallengeCount` 合并为 `DailyCycle.shutdown_challenge_count`。
- `RescueSession.relaxModeUsed`、`sleepGeneratorUsed`、`treeHoleUsed` 合并为 `DailyCycle.used_sound_spa`、`used_tree_hole`、`used_sleep_generator`。
- `SleepRecord.success` 与 `DailyExecutionRecord.sleepResult` 合并为 `SleepRecord.sleep_result`，不再使用强烈成功/失败表达作为主反馈。

### 废弃

- `DailyRecord.status` 的 `contracted`、`reviewed`、`bedtime_mode`、`slept_on_time`、`slept_late`、`rescued` 不再作为上线版主状态。
- `RescueSessionStatus` 的 `idle`、`started`、`in_rescue_flow`、`in_shutdown_challenge`、`in_relax_mode`、`completed`、`abandoned` 不再作为首页 CTA 判断来源。
- 旧徽章逻辑只保留为成长页的辅助装饰，不作为成长页核心数据来源。

## 正式类型草案

### DailyCycle

```ts
type DailyCycleStatus =
  | "not_started"
  | "ritual_started"
  | "external_closed"
  | "review_completed"
  | "sleep_aid_started"
  | "ready_to_sleep"
  | "needs_checkin"
  | "checked_in"
  | "feedback_viewed";

type DailyCycle = {
  id: string;
  userId?: string;
  date: string;
  status: DailyCycleStatus;
  plannedSleepTime: string;
  wakeUpTime: string;
  ritualStartedAt?: string;
  externalClosedAt?: string;
  reviewCompletedAt?: string;
  sleepAidStartedAt?: string;
  readyToSleepAt?: string;
  checkinCompletedAt?: string;
  feedbackViewedAt?: string;
  usedSoundSpa: boolean;
  usedTreeHole: boolean;
  usedSleepGenerator: boolean;
  shutdownChallengeCount: number;
  rescuePauseCount: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  syncStatus?: "local_only" | "pending" | "synced" | "conflict";
};
```

### UserPreference

```ts
type UserPreference = {
  id: string;
  userId?: string;
  targetSleepTime: string;
  wakeUpTime: string;
  reminderEnabled: boolean;
  reminderTime: string;
  reminderMinutesBefore: number;
  lateNightReasons: LateNightReason[];
  sleepAidPreferences: SleepAidPreference[];
  createdAt: string;
  updatedAt: string;
};
```

### TodayReview

```ts
type TodayReview = {
  id: string;
  userId?: string;
  dailyCycleId: string;
  date: string;
  mood?: string;
  happenedToday: string;
  completedToday: string;
  unfinishedToday: string;
  tomorrowPlan: string;
  closingNote: string;
  affirmation?: string;
  minimalMode: boolean;
  createdAt: string;
  updatedAt: string;
};
```

### SleepRecord

```ts
type SleepResult = "near_target" | "slightly_late" | "very_late";
type MorningMood = "good" | "okay" | "tired";

type SleepRecord = {
  id: string;
  userId?: string;
  dailyCycleId: string;
  date: string;
  plannedSleepTime: string;
  actualSleepTime?: string;
  sleepResult?: SleepResult;
  morningMood?: MorningMood;
  lateReason?: LateNightReason;
  reflection?: string;
  createdAt: string;
  updatedAt: string;
};
```

### AIConversation

```ts
type AIConversation = {
  id: string;
  userId: string;
  dailyCycleId?: string;
  title?: string;
  mode: "tree_hole" | "sleep_script" | "weekly_summary";
  status: "active" | "completed" | "failed";
  messageCount: number;
  createdAt: string;
  updatedAt: string;
};

type AIMessage = {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  safetyLabel?: "normal" | "sensitive" | "crisis" | "medical_boundary";
  createdAt: string;
};
```

### SleepAudioSession

```ts
type SleepAudioSession = {
  id: string;
  userId?: string;
  dailyCycleId: string;
  date: string;
  status: "idle" | "permission_denied" | "recording" | "stopped" | "completed" | "failed";
  startedAt?: string;
  stoppedAt?: string;
  localAudioUri?: string;
  eventCount: number;
  summary?: {
    hasVoiceLikeSound: boolean;
    hasSnoreLikeSound: boolean;
    quietScore?: number;
  };
  createdAt: string;
  updatedAt: string;
};
```

## 状态流

```txt
not_started
  -> ritual_started
  -> external_closed
  -> review_completed
  -> sleep_aid_started
  -> ready_to_sleep
  -> needs_checkin
  -> checked_in
  -> feedback_viewed
```

状态推进规则：

- 状态只能前进，不能由后面的状态回退到前面的状态。
- `needs_checkin` 可以由时间窗口自动推导，也可以在 demo 模式下手动快进。
- `feedback_viewed` 必须在用户进入并成功查看昨晚反馈后写入。
- 下线挑战只增加 `shutdown_challenge_count`，不改变主状态到独立分支。
- AI 树洞、声音 Spa、睡意生成器都只推进到 `sleep_aid_started`，不直接代表已经准备睡觉。
- “我准备睡了”是唯一推进到 `ready_to_sleep` 的主动作。

## 页面到数据字段映射

| 页面 | 读取 | 写入 |
| --- | --- | --- |
| `app/onboarding.tsx` | 默认配置 | `UserPreference`、首次 `DailyCycle` 默认值 |
| `app/index.tsx` | `UserPreference`、今日 `DailyCycle`、最近 `SleepRecord`、统计 | `ritual_started`、demo `needs_checkin` |
| `app/rescue.tsx` | 今日 `DailyCycle`、`TodayReview` | `ritual_started`、`external_closed`、`ready_to_sleep` |
| `app/today-review.tsx` | 今日 `TodayReview` | `TodayReview`、`review_completed` |
| `app/sleep-generator.tsx` | `UserPreference`、今日 `DailyCycle` | `sleep_aid_started`、使用入口字段 |
| `app/tree-hole.tsx` | 今日 `DailyCycle`、`AIConversation` | `AIConversation`、`AIMessage`、`sleep_aid_started` |
| `app/bedtime.tsx` | 今日 `DailyCycle` | `sleep_aid_started`、`ready_to_sleep` |
| `app/shutdown-challenge.tsx` | 今日 `DailyCycle` | `shutdown_challenge_count` |
| `app/checkin.tsx` | 待打卡 `DailyCycle`、`SleepAudioSession` | `SleepRecord`、`checked_in` |
| `app/review.tsx` | `DailyCycle`、`SleepRecord`、`TodayReview` | `feedback_viewed` |
| `app/records.tsx` | `DailyCycle`、`SleepRecord`、`TodayReview` | 只读，后续可写周总结 |
| `app/weekly-summary.tsx` | 周期内 `DailyCycle`、`SleepRecord`、`TodayReview` | `AIConversation` 或周总结缓存 |
| `app/settings.tsx` | `UserPreference`、同步状态 | `UserPreference`、提醒设置、删除/清空 |
| `app/sleep-monitor.tsx` | 今日 `DailyCycle`、`SleepAudioSession` | `SleepAudioSession`、监听摘要 |

## SQLite schema 草案

```sql
create table user_preferences (
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

create table daily_cycles (
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
  created_at text not null,
  updated_at text not null,
  deleted_at text,
  sync_status text not null default 'local_only'
);

create table today_reviews (
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

create table sleep_records (
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
```

## Postgres 增量表草案

SQLite 与 Postgres 字段保持同构；Postgres 额外增加：

- `profiles.id uuid primary key references auth.users(id) on delete cascade`
- 所有用户私有表增加 `user_id uuid not null references auth.users(id) on delete cascade`
- 所有用户私有表启用 RLS，策略为 `auth.uid() = user_id`
- `ai_usage_limits` 存储每日 AI 消息数、睡意生成次数、周总结次数
- `app_events` 存储关键事件埋点，不记录复盘正文和 AI 敏感正文

## 安全与合规边界

### 非医疗建议

- 页面文案不得承诺治疗失眠、诊断睡眠问题或替代医生建议。
- 睡眠结果只使用“接近目标 / 晚了一点 / 晚了很多”，避免“成功 / 失败”审判。
- 睡眠监听结果称为“声音线索”或“本机摘要”，不称为医学检测结果。

### AI 安全边界

- AI 不做医疗诊断、心理治疗、药物建议。
- 用户出现自伤、危机或强烈危险表达时，优先返回安全提示和寻求现实帮助的建议。
- AI key 只能放在服务端 Edge Function，客户端永不暴露。
- AI 失败时使用本地预设回复，不让用户卡在空白状态。

### 睡眠监听隐私边界

- 麦克风权限必须由用户主动开启。
- 原始音频默认只保存在本机，不上传云端。
- 用户必须能停止监听、删除本机音频和删除摘要。
- 云端只保存摘要元数据，例如事件数量、是否有明显声音线索、安静分数。

## 第 1 周验收清单

- [x] 明确上线版主模型为 `DailyCycle`。
- [x] 明确旧模型保留、合并、废弃规则。
- [x] 明确页面到字段映射。
- [x] 明确 SQLite 与 Postgres schema 草案。
- [x] 明确 AI、睡眠监听、非医疗边界。
- [ ] 后续第 2 周按本文档改造代码状态流。
