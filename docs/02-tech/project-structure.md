# 项目文件结构

本文档描述当前发布态结构。目标是让运行时代码、运行时资源、开发素材和打包配置边界清晰，减少 EAS 云端构建时上传无关文件。

## 当前推荐结构

```txt
My_Sleep_Dream/
  app/
    _layout.tsx
    index.tsx
    onboarding.tsx
    contract.tsx
    rescue.tsx
    today-review.tsx
    sleep-generator.tsx
    bedtime.tsx
    checkin.tsx
    review.tsx
    records.tsx
    badges.tsx
    journal.tsx
    weekly-summary.tsx
    tree-hole.tsx
    shutdown-challenge.tsx
    sleep-monitor.tsx
    settings.tsx
    legal.tsx

  src/
    api/
    components/
    constants/
    features/
    hooks/
    services/
    storage/
    store/
    types/
    utils/

  assets/
    app-icon.png
    adaptive-icon.png
    audio/
    badges/
    icons/
    ui/
    generated/
      <feature-name>/
        assets/

  docs/
  plugins/
  scripts/
  supabase/
  app.json
  eas.json
  metro.config.js
  package.json
  tsconfig.json
  .easignore
```

## 目录职责

```txt
app/
```

Expo Router 页面和路由入口。页面文件可以组合 feature、service、storage 和通用组件，但不要把复杂业务规则长期堆在页面里。

```txt
src/components/
```

可复用 UI 组件。`common/` 放跨页面基础组件，其他目录按业务模块归类。

```txt
src/features/
```

业务功能层。适合放 view model、用例函数、页面专属数据整理逻辑和模块数据。

```txt
src/services/
```

外部能力和设备能力封装，例如通知、音频监听、AI 生成、分析事件和云同步。

```txt
src/storage/
```

本地数据层。AsyncStorage、SQLite schema、repository 和迁移逻辑都在这里，页面不直接读写底层存储。

```txt
src/api/
```

远端 API、Supabase client、React Query client 和请求错误处理。

```txt
src/store/
```

Zustand 全局状态。只保存全局 UI/配置状态，不替代 SQLite repository。

```txt
src/types/
```

核心 TypeScript 类型。

```txt
src/utils/
```

日期、睡眠状态、徽章、成长统计、文案等纯函数。

```txt
src/constants/
```

颜色、选项、徽章定义、合规文案和 Demo 配置。

## 资源边界

```txt
assets/
```

只放 App 运行时需要的资源。以下路径会被保留给 EAS 构建：

```txt
assets/app-icon.png
assets/adaptive-icon.png
assets/audio/
assets/badges/
assets/icons/
assets/ui/
assets/generated/*/assets/
```

```txt
assets/generated/*/source/
assets/generated/*/qa/
assets/generated/*/layers*.manifest.json
assets/prototypes/
```

这些是生成源图、QA 预览、切图报告和原型图，不应参与云端打包上传。当前通过 `.easignore` 排除。

## EAS 打包忽略规则

根目录 `.easignore` 用于减少 EAS Build 上传内容。它不影响本地开发运行，也不影响 Git 跟踪。

当前排除原则：

- 排除 `docs/`、`.codex/`、临时 Codex 文件和 `dev-assets/`。
- 排除 `assets/prototypes/`。
- 排除 `assets/generated/**/source/`、`assets/generated/**/qa/` 和生成 manifest。
- 保留 `app/`、`src/`、`plugins/`、`supabase/`、配置文件和所有运行时资源。

新增资源时先判断是否被 App 代码或 `app.json` 引用：被引用的放入 `assets/` 保留路径；只用于设计、验收或切图过程的放入被忽略区域。
