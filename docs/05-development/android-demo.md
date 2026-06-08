# Android APK Demo 交付说明

## Demo 范围

本 Demo 面向 Android 内测安装包，目标是验证完整 MVP 闭环：

```txt
首页 -> 自救 -> 今日复盘 -> 睡意生成器 -> 准备睡觉 -> 次日打卡 -> 昨晚反馈 -> 成长
```

当前仍然不包含登录、云同步、真实 AI、真实音频版权库和应用商店上架配置。

## Demo 模式

EAS `preview` 构建会设置：

```txt
EXPO_PUBLIC_DEMO_MODE=true
```

Demo 模式只做两件事：

- 用户点击“我准备睡了”后，首页显示“体验次日打卡”，不用等到第二天。
- 成长页显示“新增测试数据”，用于快速堆出趋势展示。

`production` 构建默认关闭 Demo 模式。

## 构建命令

首次构建前需要登录 EAS：

```powershell
npx eas-cli login
```

如果这是第一次为该项目使用 EAS，`build:android:preview` 可能会提示关联或创建 Expo 项目。

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run doctor
npm.cmd run build:android:preview
```

`build:android:preview` 使用 `eas build --platform android --profile preview`，产物为 Android APK。

## 真机验收路径

1. 首次打开进入 onboarding。
2. 配置目标睡觉时间、起床时间、晚睡原因、助眠偏好。
3. 首页出现唯一主 CTA。
4. 进入自救并完成“收住外界”。
5. 完成今日复盘。
6. 进入睡意生成器，选择声音 Spa 或树洞。
7. 点击“我准备睡了”。
8. 回首页，点击“体验次日打卡”。
9. 填写实际入睡时间、醒来感受和晚睡原因。
10. 完成打卡后进入昨晚反馈。
11. 从反馈页进入成长页，确认统计出现变化。
12. 关闭重开 App，确认本地数据仍在。
13. 设置页清空本地数据，确认回到 onboarding。

## 后续正式 App 化问题清单

- 统一每日闭环数据源，逐步淘汰旧 `DailyRecord` 与 `RescueSession` 的重复状态含义。
- 将声音 Spa、树洞、下线挑战从静态原型图升级为原生组件页面。
- 接入真实本地通知，并验证重复注册、关闭提醒、修改提醒时间的边界。
- 睡眠监听需要明确录音权限、存储边界、摘要生成方式和用户可删除入口。
- 上架前补齐隐私政策、权限说明、Android 签名策略、崩溃日志和版本升级策略。
- 如果接入 AI，需要先定义本地占位、云端接口、失败降级和敏感内容边界。
