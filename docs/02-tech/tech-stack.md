# 技术栈方案

## 推荐技术栈

```txt
React Native
Expo
TypeScript
Expo Router
Zustand
AsyncStorage
expo-notifications
dayjs
react-hook-form
lucide-react-native
```

## 选择理由

### React Native + Expo + TypeScript

适合第一版移动 App。

优势：

- 快速启动 iOS / Android 项目。
- 适合表单、倒计时、记录、设置这类应用。
- Expo 提供通知、构建和调试能力。
- TypeScript 可以让数据结构和路由更稳定。

### Expo Router

使用文件路由组织页面。

适合当前页面结构：

```txt
app/index.tsx
app/onboarding.tsx
app/contract.tsx
app/review.tsx
app/bedtime.tsx
app/rescue.tsx
app/records.tsx
app/badges.tsx
app/settings.tsx
```

### Zustand

用于管理：

- 用户配置
- 今日记录
- 睡眠记录
- 徽章状态
- 提醒设置

第一版不需要 Redux。

### AsyncStorage

第一版使用本地存储即可。

适合保存：

- 用户配置
- 每日记录
- 徽章状态
- 提醒设置

后续如果需要复杂查询或大量历史数据，再升级到 SQLite。

### expo-notifications

用于本地提醒。

第一版只需要：

- 睡前提醒
- 睡前模式开始提醒

不需要远程推送。

## 技术边界

MVP 不做：

- 后端服务
- 账号系统
- 云端同步
- 原生睡眠检测
- 复杂统计分析

