# 全部成长页还原报告

## 源图与画板

- 当前源图：`source/all-growth-source.png`
- 原图尺寸：`853 x 1844`
- 统一缩放比例：`750 / 853 = 0.8792497069`
- 锁定画板：`750 x 1621`
- React Native 画板组件：`src/features/growth/AllGrowthCanvas.tsx`

## 交付内容

- 图层清单：`layers.manifest.json`
- 750px 归一化源图：`source/all-growth-source-750.png`
- 星河图表裁片：`assets/charts/chart-all-growth-galaxy-01.png`
- 初期/近期对比裁片：`assets/images/image-all-growth-compare-card-01.png`
- 月亮引语插画：`assets/illustrations/illustration-all-growth-quote-moon-01.png`
- 独立透明图标：`assets/icons/`
- 页面接入：`app/records.tsx` 的“全部”页签

## QA

- 全图 bbox 复核：`qa/bbox-preview-all.png`
- 位图 bbox 复核：`qa/bbox-preview-bitmap.png`
- 透明切图棋盘格预览：`qa/transparent-assets-preview.png`
- PNG 期望尺寸：`qa/png-audit-manifest.json`
- PNG 审计结果：`qa/asset-audit.json`
- 审计结果：10 个透明 PNG 全部通过 alpha、透明角落、尺寸和四边贴边检查。
- 代码校验：`npm run typecheck` 通过；目标文件 ESLint 通过。

## 已知限制

- 源图是扁平 RGB 截图。复杂星河路径及月夜对比图中的图表标注保留在源图裁片内；顶部、列表、引语和按钮文案仍为可编辑代码文本。
- 原始字体文件未随源图提供，代码使用系统中文字体与字重近似。
- 按项目约定，未经用户批准未启动浏览器，因此本轮没有执行浏览器 750px 截图叠图；已完成 manifest 坐标、bbox 与 PNG 模块级复核。
