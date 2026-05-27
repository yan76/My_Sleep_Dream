# 项目文件结构

推荐结构：

```txt
early-sleep-rescue/
  app/
    _layout.tsx
    index.tsx
    onboarding.tsx
    contract.tsx
    review.tsx
    bedtime.tsx
    rescue.tsx
    records.tsx
    badges.tsx
    settings.tsx

  src/
    components/
      common/
        AppButton.tsx
        AppCard.tsx
        AppTextInput.tsx
        TimePickerField.tsx
        StatusPill.tsx
      home/
        TonightGoalCard.tsx
        CountdownCard.tsx
        QuickActionGrid.tsx
      bedtime/
        BedtimeCountdown.tsx
        BedtimeChecklist.tsx
      rescue/
        RescuePhraseCard.tsx
        AlternativeActionList.tsx
      records/
        SevenDayTrend.tsx
        StreakCard.tsx
      badges/
        BadgeCard.tsx
        BadgeGrid.tsx

    store/
      useAppStore.ts

    storage/
      storageKeys.ts
      appStorage.ts

    types/
      app.ts

    utils/
      date.ts
      sleep.ts
      badges.ts
      copywriting.ts

    constants/
      colors.ts
      reasons.ts
      rescuePhrases.ts
      badgeDefinitions.ts

    hooks/
      useCountdown.ts
      useTodayRecord.ts
      useNotifications.ts

  assets/
    icon.png
    splash.png

  docs/
    README.md
```

## 目录职责

```txt
app/
```

页面和路由。只放页面级组件，不放复杂业务逻辑。

```txt
src/components/
```

可复用 UI 组件。按业务模块拆分。

```txt
src/store/
```

全局状态管理。

```txt
src/storage/
```

本地存储封装，不让页面直接调用 AsyncStorage。

```txt
src/types/
```

核心 TypeScript 类型。

```txt
src/utils/
```

日期计算、睡眠状态计算、徽章解锁、文案选择等纯函数。

```txt
src/constants/
```

固定配置、选项、颜色、徽章定义。

```txt
src/hooks/
```

倒计时、今日记录、通知等组合逻辑。

