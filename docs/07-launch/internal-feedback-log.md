# 第 15 周：Android 内测反馈记录

更新时间：2026-06-05

| 编号 | 分类 | 反馈 | 状态 | 处理说明 |
| --- | --- | --- | --- | --- |
| IT-001 | crash | 睡眠监听点击开始后旧 bundle 报 `AudioRecorderConstructor is not a constructor` | fixed | 源码已改为 `useAudioRecorder` hook；8081 已清缓存重启，避免旧 Metro bundle 继续命中。 |

## 记录规则

- 每条反馈必须有分类、复现路径、设备、构建号、状态。
- 崩溃类反馈优先级最高，必须在下一轮内测包前修复或明确降级。
- 同步、提醒、AI 限额、权限问题必须给出“本地兜底是否生效”的结论。
