# 项目约定 (Project Conventions)

## 颜色规范
- **禁止使用 `rgba()` 半透明色**：React Native 在深色背景上合成半透明色会导致色带/噪点（GPU 色彩精度不足）。应始终使用经过计算的实体 hex 颜色替代。
- **禁止 View 级 `opacity` 用于静态样式**：即使背景色是 hex，View 的 opacity 仍触发 GPU 半透明合成 → 色带。改用 hex 8 位色（如 `#E3D4B599` = accent @ 60%）。
- `opacity` 仅允许用于：disabled/pressed 交互态、进度动画隐藏态（如 `opacity: 0`）。
- 色彩系统定义在 `src/constants/colors.ts`，背景底色为 `#090A19`（background）。

## 组件约定
- `AppCard` 的 `topAccent` 属性用于在卡片顶部显示一条 3px 的装饰线，需要与卡片 `borderRadius` 匹配圆角。
- 卡片/按钮等圆角容器需添加 `renderToHardwareTextureAndroid={true}` 以避免 Android 色带。

## 渐变实现约定
- **禁止用多层重叠半透明 View 模拟渐变** — 必然产生色带。改用：
  - Web: CSS `linear-gradient`
  - Native: 不重叠的纯色分区条 或 `expo-linear-gradient`

