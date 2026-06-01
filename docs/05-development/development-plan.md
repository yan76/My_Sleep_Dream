# 开发手册

## 当前重构目标

本轮重构的目标不是新增零散功能，而是重建产品主流程：

```txt
首页
-> 自救
-> 今日复盘
-> 睡意生成器
-> 准备睡觉
-> 次日打卡
-> 昨晚反馈
-> 成长
```

底部导航统一为：

- 首页
- 自救
- 成长
- 设置

所有页面、组件命名、文案和路由入口都应围绕这四个一级入口组织。

## 开发原则

- 首页只突出一个主行动，不再做功能入口广场。
- 自救是主流程，不是普通工具页。
- 今日复盘是核心心理仪式，必须分步、轻量、可跳过。
- 睡意生成器是未来付费能力的主入口，MVP 先做结构和占位。
- 成长页不做传统徽章墙，优先展示具体变化、趋势和个人叙事。
- 所有数据状态统一围绕每日睡前闭环，不再混用多套含义冲突的状态。

## 任务 1：统一导航与信息架构

目标：

- 底部导航改为：首页 / 自救 / 成长 / 设置。
- 首页入口指向状态中枢。
- 自救入口指向睡前主流程。
- 成长入口指向长期正反馈页面。
- 设置入口保留配置与数据管理。

建议涉及文件：

- `src/components/common/BottomNav.tsx`
- `src/components/home/QuickActionGrid.tsx`
- `app/index.tsx`
- `app/rescue.tsx`
- `app/records.tsx`
- `app/settings.tsx`

验收：

- 底部导航四个名称与顺序一致。
- 任何页面都不再出现“今晚 / 仪式 / 变好”作为一级导航名称。
- 首页、自救、成长、设置四个入口跳转正常。

## 任务 2：建立每日睡前闭环状态模型

目标：

- 统一每日状态，减少旧 `DailyRecord` 与新 `RescueSession` 的混用。
- 首页根据统一状态决定主 CTA。
- 次日打卡和成长统计基于同一套数据。

推荐状态：

```ts
type DailySleepCycleStatus =
  | "not_started"
  | "ritual_started"
  | "external_closed"
  | "review_completed"
  | "sleep_aid_started"
  | "ready_to_sleep"
  | "needs_checkin"
  | "checked_in"
  | "feedback_viewed";
```

推荐字段：

```ts
type DailySleepCycle = {
  date: string;
  status: DailySleepCycleStatus;
  targetSleepTime: string;
  wakeUpTime: string;
  ritualStartedAt?: string;
  externalClosedAt?: string;
  reviewCompletedAt?: string;
  sleepAidType?: "sound_spa" | "suggestion_audio" | "ai_chat" | "white_noise";
  readyToSleepAt?: string;
  actualSleepTime?: string;
  sleepResult?: "on_time" | "slightly_late" | "very_late";
  morningMood?: string;
  failureReason?: string;
  shutdownChallengeCount: number;
  usedAiChat: boolean;
  usedSoundSpa: boolean;
};
```

建议涉及文件：

- `src/types/app.ts`
- `src/storage/rescueSessionStorage.ts`
- `src/store/useAppStore.ts`
- `src/storage/storageKeys.ts`

验收：

- 首页能通过每日状态渲染正确主 CTA。
- 今日复盘、助眠、准备睡觉、次日打卡能推进同一条状态链。
- 成长页统计不依赖旧的徽章逻辑作为主反馈。

## 任务 3：重构首页

目标：

- 首页成为“状态中枢”，只突出一个当前最重要主行动。
- 弱化工具箱入口，避免用户自己选择流程。

首页模块：

- 当前时间与状态
- 今日主行动卡
- 今晚目标卡
- 最近变化卡
- 弱化工具箱
- 底部导航

主 CTA 规则：

- `not_started`：开始今晚自救
- `ritual_started`：继续今晚自救
- `external_closed`：去把今天放下
- `review_completed`：进入睡意生成器
- `sleep_aid_started`：我准备睡了
- `ready_to_sleep`：等待次日打卡
- `needs_checkin`：开始次日打卡
- `checked_in`：查看昨晚反馈
- `feedback_viewed`：查看成长

建议涉及文件：

- `app/index.tsx`
- `src/components/home/TonightGoalCard.tsx`
- `src/components/home/CountdownCard.tsx`
- `src/components/home/QuickActionGrid.tsx`

验收：

- 首页没有多个同级强按钮。
- 不同状态下主 CTA 文案和跳转正确。
- 工具入口不抢主按钮视觉权重。

## 任务 4：重构自救主流程

目标：

把原来的零散自救页改成三段式主流程：

1. 收住外界
2. 把今天放下
3. 进入睡意

页面模块：

- 进度头部
- 三段流程卡
- 下线挑战入口
- 今日复盘入口
- 睡意生成器入口
- “我准备睡了”按钮

建议涉及文件：

- `app/rescue.tsx`
- `app/shutdown-challenge.tsx`
- `app/today-review.tsx`
- `app/bedtime.tsx`

验收：

- 自救页能展示三段状态。
- 完成“收住外界”后状态推进到 `external_closed`。
- 进入今日复盘后能回到自救流程。
- 完成复盘后自救页提示进入睡意。

## 任务 5：重构今日复盘

目标：

- 今日复盘从多输入框表单改为分步式心理仪式。
- 支持极简模式。
- 完成后生成收束语并推进状态。

步骤：

1. 今天最占脑子的事是什么？
2. 今天有没有一件值得肯定自己的小事？
3. 今天有什么遗憾、委屈，或者没做完的事？
4. 明天先做哪一件小事？

极简模式：

- 此刻你最想放下什么？

建议涉及文件：

- `app/today-review.tsx`
- `src/types/app.ts`
- `src/storage/rescueSessionStorage.ts`

验收：

- 用户可以一步一步填写。
- 用户可以跳过非必填步骤。
- 极简模式可以单问题完成。
- 保存后状态进入 `review_completed`。

## 任务 6：新增或重构睡意生成器

目标：

- 建立未来付费能力的主入口。
- MVP 提供基础入口与模拟体验。

模块：

- 声音 Spa
- 心理暗示
- AI 树洞
- 白噪音
- ASMR/AMSR 助眠预设

建议路由：

- `app/sleep-aid.tsx`
- `app/bedtime.tsx` 继续作为声音 Spa 或重命名后承接
- `app/ai-companion.tsx` 作为 AI 树洞预设

验收：

- 自救流程能跳转到睡意生成器。
- 睡意生成器能选择助眠方式。
- 选择任一方式后状态进入 `sleep_aid_started`。
- AI 树洞可以先是预设页，不要求真实 AI。

## 任务 7：重构下线挑战

目标：

- 下线挑战只作为“还想继续刷”的分支，不作为一级主流程。
- 完成后回到自救。

页面模块：

- 2 分钟倒计时
- 当前挑战动作
- 呼吸提示
- 回到自救按钮
- 继续刷但设置边界的选项

建议涉及文件：

- `app/shutdown-challenge.tsx`
- `src/storage/rescueSessionStorage.ts`

验收：

- 从自救页进入下线挑战。
- 完成后回到自救页。
- `shutdownChallengeCount` 正确增加。

## 任务 8：重构次日打卡与昨晚反馈

目标：

- 次日打卡记录结果。
- 昨晚反馈生成温柔的结果解释、身体变化回声和今晚建议。

次日打卡字段：

- 实际入睡时间
- 睡眠结果：接近目标 / 晚了一点 / 晚了很多
- 醒来感受
- 晚睡原因

昨晚反馈模块：

- 结果反馈卡
- 身体变化回声
- 与过去自己的对比
- 今晚建议
- 查看成长入口

建议涉及文件：

- `app/checkin.tsx`
- `app/review.tsx`
- `src/storage/rescueSessionStorage.ts`

验收：

- 次日打卡完成后状态进入 `checked_in`。
- 自动跳转昨晚反馈。
- 昨晚反馈不使用羞辱式成功/失败文案。
- 点击查看成长能进入成长页。

## 任务 9：重构成长页

目标：

- 成长页从徽章/数据页升级为长期正反馈页面。
- 让用户看见具体变化和个人故事。

页面模块：

- “我的夜晚正在变好”主叙事卡
- 本周平均入睡变化
- 本周自救次数
- 本周复盘次数
- 醒来感觉不错次数
- 我做到过的事
- 周总结入口

建议涉及文件：

- `app/records.tsx`
- `src/components/records/*`
- `src/utils/badges.ts`

验收：

- 一级导航显示“成长”。
- 页面主内容不以徽章墙为中心。
- 能展示具体事实型正反馈。
- 能进入周总结页面或预设入口。

## 任务 10：设置页更新

目标：

- 设置页支持新主流程所需配置。

设置项：

- 目标睡觉时间
- 起床时间
- 自救提醒提前量
- 晚睡原因
- 助眠偏好
- 提醒开关
- 清空数据

建议涉及文件：

- `app/settings.tsx`
- `src/hooks/useNotifications.ts`
- `src/storage/rescueSessionStorage.ts`

验收：

- 修改目标后首页和自救流程同步更新。
- 修改晚睡原因后睡意生成器推荐可变化。
- 清空数据后回到 onboarding。

## 任务 11：文案与视觉统一

目标：

- 使用项目现有深夜系 UI 风格。
- 全局统一新导航和新流程文案。

视觉原则：

- 深夜背景：`#090A19`
- 主卡片：`#161726`
- 强卡片：`#212231`
- 暖色卡片：`#2B2A31`
- 冷色卡片：`#1A1D39`
- 主强调：`#E3D4B5`
- 主按钮文字：`#10101B`

文案原则：

- 不羞辱用户。
- 不使用医疗承诺。
- 不把今日复盘写成任务。
- 不把成长页写成徽章收集。
- 强调“结束今天”“把自己带回来”“看见正在变好”。

验收：

- 页面文案符合产品语气。
- 底部导航统一为：首页 / 自救 / 成长 / 设置。
- 原型、产品文档、开发文档命名一致。
