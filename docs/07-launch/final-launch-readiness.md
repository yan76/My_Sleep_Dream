# 第 16 周：正式上线准备 Runbook

更新时间：2026-06-05

## 功能冻结规则

- 第 16 周起不再新增功能，只修影响上线的 bug。
- 所有改动必须能解释为：崩溃修复、权限/合规修复、同步/AI/提醒/监听稳定性修复、发布配置修复。
- 每次出包前必须执行：`npm.cmd run verify:release`。

## 最终回归清单

| 场景 | 检查内容 | 通过标准 |
| --- | --- | --- |
| 离线 | 断网后完成自救、复盘、打卡 | 本地记录不丢，恢复网络后可同步 |
| 弱网 | AI、同步、提醒状态加载慢 | 有加载态和本地兜底，不空白 |
| 清空数据 | 设置页清空本机数据 | 回到 onboarding，提醒取消 |
| 删除账号 | 设置页删除云端账号数据 | 云端函数执行后退出登录并清空本机 |
| AI 超额 | AI 服务端返回限额或失败 | 使用本地兜底回复，不阻断流程 |
| 权限拒绝 | 通知、麦克风分别拒绝 | 页面提示可读，不崩溃 |
| 睡眠监听 | 开始、停止、删除、重启后查看 | 状态一致，原始音频可删除 |
| 提醒 | 开启、关闭、修改时间、修改提前量 | 不重复注册，文案和状态一致 |
| 崩溃恢复 | ErrorBoundary 捕获页面错误 | 用户看到可读错误和回首页按钮 |

## 发布步骤

1. 确认 Supabase migrations 已部署，RLS smoke test 完成。
2. 确认 AI Edge Functions 已部署，并且 key 不进入客户端。
3. 执行 `npm.cmd run verify:release`。
4. 执行 `npm.cmd run build:android:production` 生成 AAB。
5. 在 Google Play Console 上传 AAB 到 internal 或 closed testing track。
6. 使用 `docs/07-launch/store-listing.md` 填写应用简介和权限说明。
7. 确认隐私政策、用户协议、AI 免责声明、睡眠监听说明已可访问。

## 外部门禁

- 生产 AAB 构建成功。
- Google Play Console 应用内容、数据安全、权限声明完成。
- 至少一台 Android 真机完成 3 天连续核心闭环。
- 云端删除账号函数部署并验证。
- RLS 策略通过人工或 SQL smoke test 复测。

## 本地检查结果

- 第 14 周：`typecheck`、`lint` 通过。
- 第 15 周：`typecheck`、`lint`、JSON 配置校验通过。
- 第 16 周：以最终执行结果为准。
