# 睡眠监听 6 周开发计划

编写日期：2026-06-10

## 1. 背景与目标

当前项目已经完成睡眠监听的第一层能力：用户可以在睡前主动开启麦克风录音，App 会在本机保存监听会话，并在次日打卡时展示温和的声音摘要。这个阶段更接近“本机录音壳”，还没有达到市面助眠 App 常见的夜间声音监测体验。

本计划的目标是在 6 周内完成 Android 优先的睡眠声音事件监听 MVP，让用户能够：

- 睡前主动开启监听。
- 锁屏后仍持续运行。
- 次日看到夜间声音事件时间线。
- 回放疑似声音事件短片段。
- 删除单个片段或整晚监听记录。
- 明确知道原始音频默认只留在本机，不上传云端。

第一期只做“睡眠声音线索”，不做医学诊断，不判断疾病，不提供治疗建议。

## 2. 当前基础

项目已有以下实现基础：

- `app/sleep-monitor.tsx`：当前睡眠监听页，使用 `expo-audio` 启动和停止录音。
- `src/types/app.ts`：已有 `SleepAudioSession`、`SleepAudioEvent`、`SleepAudioSessionStatus`、`SleepAudioEventType` 类型。
- `src/storage/sleepAudioStorage.ts`：已有睡眠监听会话的读写、创建、状态更新和删除逻辑。
- `src/storage/sqlite/sleepAudioRepository.ts`：已有 `sleep_audio_sessions`、`sleep_audio_events` 的本地 SQLite 持久化。
- `supabase/migrations/20260605_0001_launch_schema.sql`：云端表结构已预留 `sleep_audio_sessions`、`sleep_audio_events`。
- `app/checkin.tsx`：次日打卡已能读取监听摘要并以非医疗化语气展示。
- `app/legal.tsx` 与 `docs/07-launch/compliance-and-safety.md`：已有麦克风权限、原始音频本机保存和非医疗边界说明。

当前主要缺口：

- 页面内录音无法保证锁屏后一整晚稳定运行。
- 没有 Android 前台服务承载长期麦克风采集。
- 没有边录边分析、音频切片、动态静音阈值。
- 没有疑似梦话、疑似鼾声、环境声的事件分类。
- 没有事件时间线、短片段回放、片段级删除。

## 3. 技术路线

第一期采用 Android 优先、规则检测优先、本机处理优先的路线。

### 3.1 采集层

新增 Android 原生前台服务承载夜间监听：

- 用户必须在 App 前台主动点击开始监听。
- Android 使用 `Foreground Service` 持续采集麦克风。
- 监听中显示持久通知，说明“睡眠监听正在运行”。
- React Native 页面只负责发起、停止、读取状态，不再承担长期录音生命周期。

需要补充 Android 权限：

- `RECORD_AUDIO`
- `POST_NOTIFICATIONS`
- `FOREGROUND_SERVICE`
- `FOREGROUND_SERVICE_MICROPHONE`

### 3.2 分析层

第一期不接入 AI 模型，先做规则检测：

- 采样率：16kHz。
- 声道：mono。
- 分析窗口：1 秒。
- 合并窗口：相邻声音间隔小于 2 秒时合并为一个事件。
- 最短事件：800ms，低于该时长默认忽略。
- 最长单片段：15 秒，超出后拆分或截断。
- 静音段只进入摘要计算，不保存音频片段。

规则分类目标：

- `voice_like`：疑似梦话或人声。
- `snore_like`：疑似鼾声。
- `noise_like`：明显环境声。
- `unknown`：声音明显但无法可靠判断。

第二期再考虑接入 TensorFlow Lite、YAMNet 或自训练模型。

### 3.3 存储层

第一期默认不保存整晚原始录音，只保存事件短片段和结构化摘要：

- 短片段保存到本机文件系统。
- 元数据保存到 SQLite。
- 云端默认只同步摘要与事件元数据。
- 原始 clip 不上传云端，除非未来增加用户主动上传开关。

每个事件至少记录：

- 事件 ID。
- 开始时间。
- 持续时长。
- 事件类型。
- 置信度。
- 本地 clip URI。
- 峰值音量。
- 平均音量。

### 3.4 展示层

睡眠监听页展示：

- 当前监听状态。
- 已监听时长。
- 已检测声音事件数。
- 本机保存与可删除说明。
- 开始、停止、删除入口。

次日打卡页展示：

- 昨晚声音摘要。
- 疑似鼾声次数和总时长。
- 疑似梦话或人声次数和总时长。
- 最大声音峰值。
- 安静分数。
- 声音事件时间线。
- 单个短片段回放。
- 删除整晚监听记录。

所有结果必须使用“疑似”“线索”“可能来自”等表达，避免医疗判断。

## 4. 关键接口与类型

### 4.1 JS 服务接口

新增睡眠监听服务封装，供页面调用：

```ts
export type SleepMonitoringStatus = {
  isRunning: boolean;
  sessionId?: string;
  date?: string;
  startedAt?: string;
  eventCount: number;
  lastError?: string;
};

export async function startSleepMonitoring(date: string): Promise<SleepMonitoringStatus>;

export async function stopSleepMonitoring(): Promise<SleepMonitoringStatus>;

export async function getSleepMonitoringStatus(): Promise<SleepMonitoringStatus>;

export async function deleteSleepMonitoringSession(date: string): Promise<void>;
```

### 4.2 类型扩展

扩展 `SleepAudioEventType`：

```ts
export type SleepAudioEventType =
  | "voice_like"
  | "snore_like"
  | "cough_like"
  | "movement_like"
  | "noise_like"
  | "unknown";
```

扩展 `SleepAudioEvent`：

```ts
export type SleepAudioEvent = {
  id: string;
  startedAt: string;
  durationMs: number;
  type: SleepAudioEventType;
  confidence?: number;
  localClipUri?: string;
  peakDb?: number;
  averageDb?: number;
};
```

扩展 `SleepAudioSession.summary`：

```ts
summary?: {
  hasVoiceLikeSound: boolean;
  hasSnoreLikeSound: boolean;
  quietScore?: number;
  eventCount: number;
  voiceLikeCount: number;
  snoreLikeCount: number;
  coughLikeCount?: number;
  movementLikeCount?: number;
  noiseLikeCount: number;
  totalEventDurationMs: number;
  totalVoiceLikeDurationMs: number;
  totalSnoreLikeDurationMs: number;
  peakDb?: number;
};
```

### 4.3 数据库扩展

本地 SQLite 的 `sleep_audio_events` 建议补充：

- `peak_db real`
- `average_db real`

`sleep_audio_sessions.summary_json` 可继续承载聚合摘要，避免第一期频繁扩展 session 表字段。

云端 Supabase 第一阶段只需要同步事件元数据和摘要，不同步本机音频文件。

## 5. 6 周开发计划

### 第 1 周：Android 原生前台监听服务

目标：锁屏后监听服务仍能稳定运行。

开发内容：

- 为项目引入 Android 原生监听模块或 Expo config plugin。
- 新增 `SleepAudioForegroundService`。
- 补充 Android 前台服务和麦克风权限。
- 创建持久通知渠道。
- JS 层封装 `startSleepMonitoring`、`stopSleepMonitoring`、`getSleepMonitoringStatus`。
- 将 `app/sleep-monitor.tsx` 从页面内 `useAudioRecorder` 迁移为调用监听服务。

验收标准：

- App 前台点击开始监听后，Android 通知栏出现监听通知。
- 手机锁屏 10 分钟后，监听仍在运行。
- 用户点击停止后，服务停止，通知消失。
- 权限拒绝时不崩溃，并写入 `permission_denied` 状态。

### 第 2 周：音频切片与事件落库

目标：从整段录音改为有声音才生成短事件。

开发内容：

- 实现 1 秒分析窗口。
- 计算 RMS、峰值音量、平均音量。
- 启动前 30 秒建立环境底噪基线。
- 超过动态阈值时创建候选声音事件。
- 合并相邻声音片段。
- 保存 3-15 秒本地 clip。
- 写入 `sleep_audio_events`。
- 更新 `eventCount` 和 `summary_json`。

验收标准：

- 安静环境下不会产生大量误报。
- 播放一段明显声音后能生成事件。
- 事件包含开始时间、持续时长、本地 clip URI、峰值音量。
- 重启 App 后仍能读取事件。

### 第 3 周：规则分类与声音摘要

目标：区分疑似梦话、疑似鼾声、环境声和未知声音。

开发内容：

- 基于持续时长、频段特征、音量形态做规则分类。
- 增加 `voice_like`、`snore_like`、`noise_like`、`unknown` 判定。
- 保留 `cough_like`、`movement_like` 类型扩展，但第一期可不强依赖。
- 生成 session 摘要：
  - 事件总数。
  - 疑似梦话次数和总时长。
  - 疑似鼾声次数和总时长。
  - 环境声次数。
  - 最大声音峰值。
  - 安静分数。
- 对低置信度事件降级为 `unknown`。

验收标准：

- 人声样本可被标为 `voice_like` 或低置信度 `unknown`。
- 鼾声样本可被标为 `snore_like` 或低置信度 `unknown`。
- 突发短噪音不会被误判为长时间梦话。
- 摘要字段能正确聚合事件。

### 第 4 周：次日展示、时间线、回放和删除

目标：把监听结果变成用户能理解和控制的次日体验。

开发内容：

- 睡眠监听页展示运行中状态、已监听时长、事件数。
- 次日打卡页增加声音摘要卡。
- 新增事件时间线组件。
- 支持播放本地事件 clip。
- 支持删除整晚监听记录。
- 可选支持删除单个事件片段。
- 增加空状态、权限拒绝、监听失败、无声音事件状态。
- 全部文案改为非医疗表达。

验收标准：

- 次日能看到昨晚声音事件列表。
- 点击事件可以回放短片段。
- 删除整晚监听记录后，session、events、clips 都被清理。
- 无声音事件时展示温和摘要，而不是空白或错误。

### 第 5 周：异常恢复、文件清理和兼容性

目标：提升长时间运行可靠性。

开发内容：

- 处理来电、系统打断、麦克风被其他 App 占用。
- 处理 App 被杀、服务异常停止后的状态恢复。
- 增加监听超时保护，例如超过 10 小时自动停止。
- 增加文件清理策略，避免 clip 长期堆积。
- 处理低电量、后台限制、通知权限关闭。
- 增加监听失败原因记录。

验收标准：

- 来电或音频焦点变化后不会导致 App 崩溃。
- 服务异常停止后，次日能看到明确失败说明。
- 删除本地数据时同步删除音频 clip。
- 连续 2-3 晚测试后，本地文件数量和大小可控。

### 第 6 周：内测验收、合规文案和 Android 回归

目标：达到 Android MVP 内测发布标准。

开发内容：

- 完整跑通睡前开启、锁屏监听、次日查看、删除记录。
- 更新隐私政策摘要、权限说明、商店权限解释。
- 更新 Android 内测检查清单。
- 检查所有文案是否避免医疗诊断。
- 在至少 3 类 Android 设备或模拟环境中回归：
  - 原生 Android 或 Pixel。
  - 常见国产 Android。
  - 低电量或后台限制较严格设备。
- 修复内测阻塞问题。

验收标准：

- Android 内测包可通过基本权限和隐私审核。
- 锁屏监听主路径稳定。
- 原始音频默认不上传云端。
- 用户可以清楚地开始、停止、查看和删除监听数据。
- 结果页只表达“声音线索”，不表达诊断结论。

## 6. 测试计划

### 6.1 功能测试

- 第一次进入监听页，点击开始监听。
- 已授权麦克风时能启动服务。
- 未授权麦克风时能进入拒绝态。
- 监听中点击停止，session 状态变为 `completed`。
- 删除整晚监听记录后，页面回到未开始状态。
- App 重启后仍能读取昨晚 session 和 events。

### 6.2 后台测试

- 锁屏 10 分钟，监听不中断。
- 切到其他 App 10 分钟，监听不中断。
- 低电量模式下测试监听稳定性。
- 来电或系统音频打断后不崩溃。
- 通知权限关闭时给出清晰提示。
- App 被系统回收后能展示最后已知状态。

### 6.3 声音测试

- 安静环境：不生成大量事件。
- 人声样本：生成 `voice_like` 或 `unknown`。
- 鼾声样本：生成 `snore_like` 或 `unknown`。
- 突发噪音：事件短、不会被误判为持续人声。
- 连续环境噪音：归类为 `noise_like`，并避免刷屏式事件。
- 远距离小音量声音：低置信度或忽略。

### 6.4 合规测试

- 麦克风权限文案说明用途清晰。
- 前台通知明确提示正在进行睡眠监听。
- 隐私页说明原始音频默认只保存在本机。
- 删除入口清晰可见。
- 不出现“确诊”“治疗”“睡眠呼吸暂停”等医疗判断。
- 云端同步不包含原始音频文件。

## 7. 风险与边界

### 7.1 Android 品牌兼容

不同 Android 厂商对后台服务、低电量策略、通知权限和麦克风采集限制不同。第 6 周必须安排真机回归，不能只依赖模拟器。

### 7.2 电量和存储

整夜监听会带来电量消耗。第一期通过静音段不保存、只保留事件短片段、最长监听时长限制来控制成本。

### 7.3 误报和漏报

规则分类无法保证准确。所有结果必须表达为“疑似声音线索”，不能让用户误以为是医学级检测。

### 7.4 隐私审核

麦克风长时间运行属于敏感能力。必须保证：

- 用户主动开启。
- 监听中有明确系统通知。
- 用户可随时停止。
- 用户可删除数据。
- 原始音频默认不上传。

### 7.5 iOS 暂缓

iOS 后台录音、系统录音指示、App Store 审核和隐私披露需要单独评估。第一期不纳入 6 周范围，避免拖慢 Android MVP。

### 7.6 AI 模型暂缓

TensorFlow Lite、YAMNet、自训练模型作为第二期能力。第一期先用规则检测验证需求和完整体验，再决定是否投入模型研发。

## 8. 第一期开工默认假设

- 第一版只做 Android。
- 第一版周期为 6 周。
- 第一版不接入 AI 模型。
- 第一版不保存整晚原始录音。
- 第一版只保存事件短片段。
- 第一版不上传原始音频。
- 第一版不做医疗诊断。
- iOS、TensorFlow Lite/YAMNet、自训练模型放到第二期。

## 9. Android MVP 最终验收清单

- 用户能在睡前主动开启监听。
- 手机锁屏后监听持续运行。
- 次日能看到昨晚声音事件摘要。
- 次日能查看声音事件时间线。
- 用户能回放事件短片段。
- 用户能删除监听记录和本地音频片段。
- 安静夜晚不会产生大量误报。
- 权限拒绝、监听失败、无声音事件都有明确状态。
- 原始音频默认不上传云端。
- 所有结果文案保持非医疗化。
