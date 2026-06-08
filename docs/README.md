# 早睡自救局文档中心

《早睡自救局》是一款睡前陪伴型 App。

它不是严厉打卡工具，而是在用户晚上最容易滑走时，帮助用户完成收尾、写下今天、进入睡意，并在第二天看见自己正在变好。

## 当前产品主线

```txt
首页
-> 自救
-> 今日复盘
-> 睡意生成器
-> 准备睡觉
-> 次日打卡
-> 昨晚反馈
-> 成长
```

## 一级导航

底部导航固定为：

- 首页
- 自救
- 成长
- 设置

这四个名称需要在产品文档、开发文档、设计稿、代码组件中保持一致。

## 文档目录

- [产品概览](./01-product/overview.md)
- [MVP 功能范围](./01-product/mvp-scope.md)
- [产品文案与语气](./01-product/tone-and-copy.md)
- [技术栈方案](./02-tech/tech-stack.md)
- [项目结构](./02-tech/project-structure.md)
- [页面与路由结构](./03-ui/pages-and-routes.md)
- [组件拆分](./03-ui/components.md)
- [本地数据模型](./04-data/local-data-model.md)
- [状态与存储设计](./04-data/state-and-storage.md)
- [可上线版本数据模型与状态流设计 06-05](./04-data/launch-data-model-06-05.md)
- [开发手册](./05-development/development-plan.md)
- [Android APK Demo 交付说明](./05-development/android-demo.md)
- [16 周可上线优化方案 06-05](./05-development/launch-optimization-plan-06-05.md)
- [验收标准](./06-acceptance/acceptance-criteria.md)
- [新主流程 UI 原型](./sleep-ritual-ui-prototype.html)

## 第一版目标

第一版只做能跑通核心体验的版本：

1. 用户首次进入时完成睡眠目标、起床时间、晚睡原因配置。
2. 首页根据当前状态给出唯一主行动。
3. 用户能进入自救流程，完成“收住外界 / 把今天放下 / 进入睡意”。
4. 用户能用分步式今日复盘写下今天的故事、遗憾与明日计划。
5. 用户能进入睡意生成器，体验声音 Spa、心理暗示、AI 树洞预设等入口。
6. 用户想继续刷手机时，可以进入下线挑战。
7. 用户次日能补录昨晚结果，并看到温柔反馈。
8. 用户能在成长页看到具体变化，而不是只看到徽章。
9. 用户能在设置页修改目标、提醒、偏好并清空数据。
