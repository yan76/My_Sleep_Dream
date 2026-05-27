# 本地数据模型

## 熬夜原因

```ts
type LateNightReason =
  | 'short_video'
  | 'social_media'
  | 'gaming'
  | 'drama'
  | 'work_study'
  | 'revenge_bedtime'
  | 'anxiety'
  | 'other';
```

## 用户配置

```ts
type UserConfig = {
  hasOnboarded: boolean;
  targetBedtime: string;
  wakeUpTime: string;
  lateNightReasons: LateNightReason[];
  createdAt: string;
  updatedAt: string;
};
```

说明：

- `targetBedtime` 格式为 `23:30`
- `wakeUpTime` 格式为 `07:30`

## 提醒设置

```ts
type ReminderSettings = {
  enabled: boolean;
  reminderTime: string;
  bedtimeModeReminderMinutesBefore: number;
};
```

## 每日状态

```ts
type DailyStatus =
  | 'not_started'
  | 'contracted'
  | 'reviewed'
  | 'bedtime_mode'
  | 'slept_on_time'
  | 'slept_late'
  | 'rescued';
```

## 每日记录

```ts
type DailyRecord = {
  date: string;
  plannedBedtime: string;
  actualSleepTime?: string;
  status: DailyStatus;
  contractConfirmedAt?: string;
  review?: {
    events: string;
    gains: string;
    tomorrowWishlist: string;
    completedAt: string;
  };
  bedtimeChecklist?: {
    putPhoneDown: boolean;
    washedUp: boolean;
    lightsDimmed: boolean;
    tomorrowParked: boolean;
  };
  rescueCount: number;
  rescueSuccess: boolean;
  note?: string;
  createdAt: string;
  updatedAt: string;
};
```

## 徽章

```ts
type BadgeId =
  | 'first_contract'
  | 'first_on_time_sleep'
  | 'three_day_streak'
  | 'seven_day_streak'
  | 'first_rescue'
  | 'less_late_week';

type Badge = {
  id: BadgeId;
  title: string;
  description: string;
  unlocked: boolean;
  unlockedAt?: string;
};
```

## 应用状态

```ts
type AppState = {
  userConfig: UserConfig;
  reminderSettings: ReminderSettings;
  dailyRecords: Record<string, DailyRecord>;
  badges: Record<BadgeId, Badge>;
};
```

