# 架构优化交接说明：0608 代码框架收敛

更新时间：2026-06-08

## 本轮边界

- 不改 UI 样式。
- 不改交互路径。
- 不新增功能入口。
- 不调整当前页面文案和视觉层级。

本轮所有代码改动只服务于架构收敛：让 16 周上线版更容易维护、测试、同步和交给新的 AI 流继续开发。

## 核心目的

1. 统一每日闭环事实源。
   - `DailyCycle` 是 App 主流程的核心数据。
   - SQLite 是后续业务读取和同步的主事实源。
   - 旧 AsyncStorage 日记录只做兼容和迁移兜底，不再作为新逻辑主路径。

2. 集中状态规则。
   - 状态 rank、状态只前进、默认 DailyCycle 创建、睡眠结果判断集中在 `src/features/daily-cycle/`。
   - 页面不应该重新发明 DailyCycle 状态判断。

3. 页面瘦身但保持表现不变。
   - 首页 view model 放在 `src/features/home/`。
   - 自救流程 view model 放在 `src/features/rescue/`。
   - 成长页数据装载放在 `src/features/growth/`。
   - 设置页副作用 use-case 放在 `src/features/settings/`。

4. 同步队列落地。
   - 本地业务写入生成 `sync_queue` 任务。
   - 云同步优先处理队列；没有队列时走全量推拉兜底。
   - 队列记录 `attempts` 和 `last_error`，方便定位失败实体。

5. 埋点类型化。
   - `trackAppEvent` 使用事件属性 schema。
   - 继续保留敏感字段脱敏和本地最多 250 条限制。

## 新 AI 接手顺序

建议按以下顺序理解项目：

1. `docs/DEV-plan-0608.md`
2. `src/features/daily-cycle/dailyCycleModel.ts`
3. `src/storage/dailyExecutionStorage.ts`
4. `src/storage/sqlite/syncQueueRepository.ts`
5. `src/services/cloudSyncService.ts`
6. `src/features/home/homeViewModel.ts`
7. `src/features/rescue/rescueViewModel.ts`
8. 页面文件：只看渲染和导航，不要把业务规则重新塞回页面。

## 禁止事项

- 不要为了重构改页面视觉。
- 不要新增第二套每日状态。
- 不要让页面直接决定 DailyCycle 状态 rank。
- 不要让云端拉取数据被重新标记成 pending。
- 不要上传原始睡眠监听音频。
- 不要在埋点属性中写入完整用户输入、AI 回复、手机号、邮箱或 token。

## 验收重点

- `npm.cmd run verify:release` 通过。
- 首页、自救、复盘、睡意生成、睡眠监听、次日打卡、成长页、设置页表现保持一致。
- DailyCycle 重复触发只前进不倒退。
- 旧 AsyncStorage 日记录能迁移到 SQLite。
- 断网写入后有同步队列，联网后可重试同步。
