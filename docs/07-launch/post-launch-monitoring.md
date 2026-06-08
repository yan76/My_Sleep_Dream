# 第 16 周：上线后首周监控与运营观察

更新时间：2026-06-05

## 监控看板

| 指标 | 来源 | 观察目标 |
| --- | --- | --- |
| `app_error_boundary` | 本地/云端事件 | 每天检查是否有新增页面级错误 |
| `sync_failed` | 同步服务 | 观察断网恢复和云端写入失败 |
| `tree_hole_message_sent` | AI 树洞 | 观察 cloud/fallback 比例 |
| `sleep_script_generated` | 睡意生成 | 观察安全边界和 fallback 比例 |
| `weekly_summary_generated` | 周总结 | 观察生成成功率 |
| `checkin_completed` | 次日打卡 | 观察睡前闭环是否能进入次日 |
| `rescue_started` | 自救入口 | 观察用户是否能进入主流程 |

## 首周运营观察

- 第 1 天：安装、onboarding、提醒权限、麦克风拒绝/授权。
- 第 2 天：睡前自救完成率、复盘完成率、声音 Spa 使用率。
- 第 3 天：打卡完成率、成长页查看、睡眠监听删除率。
- 第 4-7 天：连续使用、AI fallback 占比、同步失败、崩溃或红屏反馈。

## 告警阈值

- 页面级错误连续出现 2 次以上：暂停发包，优先修复。
- `sync_failed` 明显高于 AI/打卡事件：检查 Supabase 和网络重试。
- AI fallback 占比超过 70%：检查 Edge Functions、限额和环境变量。
- 睡眠监听失败反馈集中：检查 `expo-audio` 权限、设备兼容和文件删除流程。

## 发布后处理节奏

- 每天固定查看一次崩溃、同步、AI fallback 和权限反馈。
- 前 7 天只做 bugfix，不调整核心交互。
- 新需求统一记录到下一轮迭代，不混进首周稳定性修复。
