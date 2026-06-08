# 第 16 周：生产发布门禁

更新时间：2026-06-05

## 必过项

- `npm.cmd run verify:release` 通过。
- `npm.cmd run build:android:production` 成功。
- Supabase migrations 已应用到生产项目。
- AI Edge Functions 已部署，客户端没有 AI key。
- `delete-account` Edge Function 可用。
- Google Play 数据安全表单与 App 内说明一致。
- Android 真机完成 3 天连续使用回归。

## 可延后但必须记录

- 更细的云端监控看板。
- 多设备同步冲突的压力测试。
- 更多 Android 品牌设备的麦克风兼容性测试。
- 截图素材的正式美术润色。

## 不允许上线

- 任何主页面打开即红屏或空白。
- 通知或麦克风权限拒绝后崩溃。
- 清空数据或删除账号后无法回到 onboarding。
- AI 失败后没有本地兜底。
- 原始睡眠监听音频被上传云端。
