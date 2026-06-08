# 第 15 周：Android 内测发布检查清单

更新时间：2026-06-05

## 构建配置

- Preview demo 包：`npm.cmd run build:android:preview`
- Internal test 包：`npm.cmd run build:android:internal`
- Production AAB：`npm.cmd run build:android:production`
- Google Play internal track 提交：`npm.cmd run submit:android:internal`

## 当前配置

- `eas.json` 已包含 `preview`、`internal-test`、`production` 三个 Android 构建 profile。
- `production.android.buildType` 为 `app-bundle`，用于 Google Play。
- `app.json` 已配置 Android package：`com.mysleepdream.app`。
- `app.json` 已配置 versionCode：`1`。
- `app.json` Android 权限只包含 `RECORD_AUDIO` 和 `POST_NOTIFICATIONS`。

## 内测设备回归

- 首次安装：onboarding、目标时间、晚睡原因、助眠偏好可保存。
- 睡前提醒：开启、关闭、修改时间、修改提前量后不会重复注册。
- 睡眠监听：授权、拒绝、开始、停止、删除本机音频都不崩溃。
- 主闭环：首页进入自救、复盘、下线挑战、助眠、准备睡觉、次日打卡、反馈查看。
- AI：树洞、睡意生成、周总结在云端不可用时有本地兜底。
- 同步：断网写入不丢；恢复网络后 pending queue 可继续处理。
- 设置：清空本地数据、删除云端账号数据入口可用且不会卡死。
- 合规页：隐私、协议、AI、睡眠监听、权限说明可从设置页进入。

## 内测反馈分类

- `crash`：红屏、闪退、错误边界。
- `sync`：断网、弱网、重复同步、换设备数据。
- `notification`：不准时、重复提醒、权限拒绝。
- `ai_limit`：超额、失败兜底、安全边界。
- `permission`：麦克风、通知、删除音频。
- `ui_copy`：文案、空状态、可读性。

## 发布门禁

- 至少一台 Android 真机连续 3 天完成核心闭环。
- 没有未解释的崩溃或红屏。
- 生产 AAB 构建成功。
- Google Play 权限声明与 App 内 `/legal` 页面一致。
- Supabase RLS smoke test 完成。
