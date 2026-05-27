# 状态与存储设计

## 存储方式

MVP 使用 AsyncStorage。

本地存储 key：

```txt
sleep_rescue:user_config
sleep_rescue:reminder_settings
sleep_rescue:daily_records
sleep_rescue:badges
sleep_rescue:schema_version
```

## 状态管理

推荐使用 Zustand。

Store 职责：

- 初始化本地数据
- 保存用户配置
- 获取今日记录
- 更新今日状态
- 保存复盘
- 保存睡前 checklist
- 记录破防急救
- 计算连续天数
- 解锁徽章
- 清空数据

## 今日记录创建规则

当用户进入首页时：

1. 获取今天日期，例如 `2026-05-28`。
2. 检查 `dailyRecords[date]` 是否存在。
3. 如果不存在，用用户默认目标时间创建今日记录。

默认记录：

```ts
{
  date: '2026-05-28',
  plannedBedtime: userConfig.targetBedtime,
  status: 'not_started',
  rescueCount: 0,
  rescueSuccess: false,
  createdAt: now,
  updatedAt: now
}
```

## 徽章解锁规则

### first_contract

用户第一次确认早睡契约。

### first_on_time_sleep

用户第一次记录按时睡。

### three_day_streak

连续 3 天按时睡。

### seven_day_streak

连续 7 天按时睡。

### first_rescue

第一次破防补救成功。

### less_late_week

最近 7 天晚睡次数少于上一组 7 天。

## 数据迁移

第一版保留 `schema_version`。

当前版本：

```txt
1
```

后续如果数据结构变化，通过版本号迁移。

