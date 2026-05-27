# 组件拆分

## 通用组件

### AppButton

统一按钮。

支持：

- primary
- secondary
- ghost
- danger

### AppCard

统一卡片容器。

用于：

- 首页信息块
- 记录项
- 徽章项

### AppTextInput

统一输入框。

用于：

- 今日事件
- 今日收获
- 明日想做的事
- 备注

### TimePickerField

时间选择组件。

用于：

- 目标睡觉时间
- 起床时间
- 提醒时间
- 今晚契约时间

### StatusPill

状态标签。

状态：

- 未开始
- 已立约
- 已复盘
- 睡前模式中
- 按时睡
- 晚睡
- 已补救

## 首页组件

### TonightGoalCard

展示今晚目标睡觉时间。

### CountdownCard

展示距离目标时间还有多久。

### QuickActionGrid

核心入口网格：

- 早睡契约
- 今日复盘
- 睡前模式
- 破防急救
- 睡眠记录
- 设置

### GentleNudge

首页轻提示文案。

## 睡前组件

### BedtimeCountdown

睡前倒计时。

### BedtimeChecklist

睡前 checklist。

## 急救组件

### RescuePhraseCard

随机展示一条急救短句。

### AlternativeActionList

替代行动列表。

## 记录组件

### SevenDayTrend

最近 7 天趋势。

### StreakCard

连续早睡天数。

## 徽章组件

### BadgeCard

单个徽章。

### BadgeGrid

徽章网格。

