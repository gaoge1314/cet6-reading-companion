# CET6 阅读突击手

六级阅读备考工具 — 三大题型全覆盖：传统阅读、长篇阅读（匹配题）、选词填空。集成单词舱记忆系统，支持艾宾浩斯复习与自测。

## 架构

单页应用（SPA），hash 路由驱动，所有功能整合在一个 HTML 入口：

```
app.html                    ← 唯一入口
assets/
├── css/
│   ├── theme.css           ← 主题变量与基础样式
│   ├── layout.css          ← 布局与侧边栏样式
│   ├── longread.css        ← 长篇阅读专项样式
│   ├── cloze.css           ← 选词填空专项样式
│   └── vocab.css           ← 单词舱专项样式
├── js/
│   ├── cet6-utils.js       ← 工具函数 & 统一存储键名
│   ├── cet6-vocab.js       ← 代理模式全局单词存储
│   ├── cet6-annotate.js    ← 划线标注管理
│   ├── cet6-locateword.js  ← 定位词管理（长篇阅读）
│   ├── cet6-loader.js      ← 数据加载与校验
│   ├── cet6-engine.js      ← 传统阅读引擎（6 Phase）
│   ├── cet6-longread-engine.js ← 长篇阅读引擎（4 Phase）
│   ├── cet6-cloze-engine.js    ← 选词填空引擎（3 Step）
│   ├── cet6-vocab-engine.js    ← 单词舱引擎（4 Tab）
│   ├── cet6-shell.js       ← 共享 UI 工厂
│   └── app-controller.js   ← 中央路由调度器
└── data/
    ├── 2025-12-passage1.json
    ├── 2025-12-longread.json
    └── 2025-12-cloze.json
```

## 功能

### 做题引擎

| 题型 | Phase/Step | 核心流程 |
|---|---|---|
| 传统阅读 | 6 Phase | 全景扫描 → 首尾定中心 → 中心做题 → 定位精读 → 对答案 → 复盘 |
| 长篇阅读 | 4 Phase | 选项扫读 → 计时定位（15min） → 对答案 → 定位词分析 |
| 选词填空 | 3 Step | 词性分类 → 对答案 → 单词舱 |

### 单词舱

- 全局单词存储（划词加入，一次操作全局同步）
- 艾宾浩斯记忆曲线（1-3-7-15-30 天）
- 自测模式（英→中 / 中→英 / 拼写）
- 进度统计

### 附加功能

- 划词弹窗：选中文本 → 加入生词本 / 划线标注 / 标记定位词
- 试卷导入：手动录入真题，智能解析，词根词缀分析
- 导出 Markdown 生词本

## 快速开始

```bash
# clone 仓库
git clone https://github.com/gaoge1314/cet6-reading-companion.git

# 启动 HTTP 服务器
cd cet6-reading-platform
python -m http.server 3000

# 浏览器打开
# http://localhost:3000/app.html
```

> 必须通过 HTTP 服务器访问，直接打开 HTML 文件会导致 localStorage 跨域错误。

## 使用流程

### 首次使用

1. 打开 `app.html` → 首页显示空状态
2. 点击「导入新试卷」→ 填写基本信息（年份/月份/套号）
3. 展开对应 Section 填写真题内容（支持三种题型）
4. 提交 → 自动解析 → 跳转试卷详情页 → 开始做题

### 已有试卷

1. 首页显示已导入试卷卡片（含做题进度）
2. 点击卡片 → 试卷详情页 → 选择模块开始练习
3. 做题过程中选中任意文本 → 弹出操作窗口

## 路由

| 路由 | 页面 |
|---|---|
| `#home` | 首页（统计 + 试卷卡片 + 快捷入口） |
| `#import` | 导入表单 |
| `#processing/{id}` | 处理等待 |
| `#exam/{id}` | 试卷详情 |
| `#player/{type}/{id}` | 做题播放器 |
| `#vocab` | 单词舱 |

## 数据存储

统一 localStorage 存储体系：

| 键 | 内容 |
|---|---|
| `cet6-exams` | 所有试卷数据 |
| `cet6-exams-state` | 做题状态（进度/答案/分数） |
| `cet6-vocab` | 全局单词本 |
| `cet6-annotations` | 划线标注 |
| `cet6-locatewords` | 定位词 |
| `cet6-recent` | 练习记录 |

首次启动自动迁移现有 `assets/data/*.json` 到统一存储。

## 开发

### 代码风格

- 无框架依赖，原生 ES6 Class + IIFE
- 每个引擎暴露统一接口：`init / switchPhase / reRenderCurrentPhase / destroy / updateSidebar`
- 共享 UI 通过 `CET6Shell` 工厂渲染
- 路由调度由 `AppController` 统一管理

### 设计文档

见 [docs/superpowers/specs/](docs/superpowers/specs/)

## License

MIT
