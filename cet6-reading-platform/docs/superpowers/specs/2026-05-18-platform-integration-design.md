# CET6 阅读突击手 · 平台整合设计方案

## 概述

将五个独立 HTML 页面整合为单个 SPA 应用 `app.html`，新增试卷导入与管理功能，消除 ~500 行重复代码，统一数据存储体系。

### 当前状态

| 页面 | 功能 | Phase数 |
|---|---|---|
| `index.html` | 首页入口（内联样式） | - |
| `player.html` | 传统阅读 | 6 Phase |
| `longread-player.html` | 长篇阅读（匹配题） | 4 Phase |
| `cloze-player.html` | 选词填空 | 3 Step |
| `vocab-review.html` | 单词舱 | 4 Tab |

### 目标状态

单个 `app.html`，SPA 路由驱动，一个试卷 ID 贯穿传统阅读、长篇阅读、选词填空、单词舱。

---

## 1. 整体流程与页面路由

### 1.1 用户完整流程

```
首页（混合型）
├── 试卷卡片（已导入试卷 + 做题进度）
├── 快捷入口（传统阅读 / 长篇阅读 / 选词填空 / 单词舱）
└── [导入新试卷] 按钮
    │
    ├─ 点击试卷卡片 → 试卷详情页（模块选择 + 进度）
    │   ├─ 传统阅读 → 做题播放器（6 Phase）
    │   ├─ 长篇阅读 → 做题播放器（4 Phase）
    │   ├─ 选词填空 → 做题播放器（3 Step）
    │   └─ 单词舱 → 单词舱页面（4 Tab，筛选该试卷生词）
    │
    └─ 点击导入新试卷 → 导入表单
        └─ 提交 → 处理等待（进度条）→ 试卷详情页
```

### 1.2 SPA 路由

| 路由 | 页面 | 触发方式 |
|---|---|---|
| `home` | 首页混合型 | 默认 |
| `import` | 导入表单 | 首页「导入新试卷」 |
| `processing/{id}` | 处理等待 | 表单提交后 |
| `exam/{id}` | 试卷详情页 | 首页点击卡片 / 处理完成 |
| `player/{type}/{id}` | 做题播放器 | 试卷详情页点击模块 |
| `vocab` | 单词舱 | 快捷入口 |

备选试卷 ID 时（无 ID），显示空状态引导。

### 1.3 首页布局

```
┌────────────────────────────────────────────┐
│  📊 单词本统计：已掌握 X / 待复习 Y         │
├────────────────────────────────────────────┤
│  📄 最近试卷卡片                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │2025-12   │ │2024-06   │ │ 导入新   │    │
│  │六级真题   │ │六级真题   │ │ 试卷 +   │    │
│  │已做 2/3  │ │已完成     │ │          │    │
│  └──────────┘ └──────────┘ └──────────┘    │
├────────────────────────────────────────────┤
│  🚀 快捷入口                                │
│  [传统阅读] [长篇阅读] [选词填空] [单词舱]   │
└────────────────────────────────────────────┘
```

无试卷时，跳过试卷卡片区，直接显示快捷入口 + 「导入第一套试卷」引导。

---

## 2. SPA 架构与代码整合

### 2.1 文件变更

```
新建：
  app.html                        唯一入口（极简外壳）
  assets/js/app-controller.js     路由调度 + 生命周期 + 状态管理
  assets/js/cet6-shell.js         共享UI渲染工厂（Header/Tab/Sidebar/Popup）
  assets/js/cet6-utils.js         共享工具函数 + localStorage 键名管理

保留（微调）：
  assets/js/cet6-engine.js        移除内联 _esc，改用 CET6Utils.esc()
  assets/js/cet6-longread-engine.js  同上
  assets/js/cet6-cloze-engine.js     同上
  assets/js/cet6-vocab-engine.js     同上
  assets/js/cet6-loader.js           不变
  assets/js/cet6-vocab.js            简化为代理模式，移除失效的 selectionListener
  assets/js/cet6-annotate.js         适配新的存储键名
  assets/js/cet6-locateword.js       不变
  assets/css/theme.css               不变
  assets/css/layout.css              不变
  assets/css/longread.css            不变
  assets/css/cloze.css               不变
  assets/css/vocab.css               不变

废弃：
  player.html / longread-player.html / cloze-player.html
  vocab-review.html / index.html
  assets/js/cet6-drag.js            从未被引用的拖拽工具
```

### 2.2 `app.html` 结构

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>六级阅读突击手</title>
  <link rel="stylesheet" href="assets/css/theme.css">
  <link rel="stylesheet" href="assets/css/layout.css">
  <link rel="stylesheet" href="assets/css/longread.css">
  <link rel="stylesheet" href="assets/css/cloze.css">
  <link rel="stylesheet" href="assets/css/vocab.css">
</head>
<body>
  <div id="app-root"></div>
  <script src="assets/js/cet6-utils.js"></script>
  <script src="assets/js/cet6-vocab.js"></script>
  <script src="assets/js/cet6-annotate.js"></script>
  <script src="assets/js/cet6-locateword.js"></script>
  <script src="assets/js/cet6-loader.js"></script>
  <script src="assets/js/cet6-engine.js"></script>
  <script src="assets/js/cet6-longread-engine.js"></script>
  <script src="assets/js/cet6-cloze-engine.js"></script>
  <script src="assets/js/cet6-vocab-engine.js"></script>
  <script src="assets/js/cet6-shell.js"></script>
  <script src="assets/js/app-controller.js"></script>
</body>
</html>
```

所有 CSS 一次性加载，避免路由切换时样式闪烁。JS 按依赖顺序排列。

### 2.3 新增模块职责

#### AppController

中央调度器：
- `route` — 当前路由字符串
- `state` — `{ currentExamId, currentModule, engines: { reading, matching, cloze, vocab }, vocab, annotate, locateWord }`
- `navTo(route)` — 切换路由：清理旧页面 → 调用 Shell 渲染 → 加载对应数据 → 初始化引擎
- `_loadExam(examId)` — 从 `cet6-exams` 读取试卷数据，更新状态
- `_resolveExamId()` — 从 URL hash 或 state 解析当前试卷 ID

路由切换流程：
```
AppController.navTo('exam/2025-12-exam1')
  → CET6Shell.destroy()        清理旧 DOM + 事件
  → history.replaceState()     更新 URL hash
  → CET6Loader.load()          如果需要，加载外部数据
  → CET6Shell.renderExamDetail() 渲染新页面骨架
  → 初始化对应引擎              完成内容填充
```

#### CET6Shell

共享 UI 渲染工厂，不持有状态，每次调用返回新 DOM / 绑定新事件：

| 方法 | 用途 | 参数 |
|---|---|---|
| `renderHeader(title, meta, actions)` | 页面头部栏 | title, 副标题, [{text, onClick, class}] |
| `renderTabs(tabs, activeIdx, onSwitch)` | Tab 切换条 | [{label, id, badge}], 激活索引, 回调 |
| `renderSidebar(panels)` | 右侧面板组 | [{title, countId, contentId, emptyText}] |
| `renderPopup(extraButtons)` | 划词弹窗 | [{label, onClick, class}] — 额外按钮 |
| `showPopup(x, y)` | 定位弹窗 | 坐标 |
| `hidePopup()` | 关闭弹窗 | - |
| `getSelectedText()` | 获取当前选区文本 | - |
| `getSelectedPara()` | 获取选区所在 data-para | - |
| `initSelection()` | 注册全局 mouseup/mousedown | - |
| `destroy()` | 移除事件 + 清空 #app-root | - |

#### CET6Utils

纯函数工具集：

| 函数 | 用途 |
|---|---|
| `esc(html)` | HTML 实体转义 |
| `findClosestPara(el)` | 向上查找最近的 data-para 属性值 |
| `formatScore(correct, total)` | 得分格式化 |
| `storageKeys.exams` | → `"cet6-exams"` |
| `storageKeys.examsState` | → `"cet6-exams-state"` |
| `storageKeys.vocab` | → `"cet6-vocab"` |
| `storageKeys.annotations` | → `"cet6-annotations"` |
| `storageKeys.locatewords` | → `"cet6-locatewords"` |
| `storageKeys.recent` | → `"cet6-recent"` |

### 2.4 重复代码消除对照

| 重复项 | 旧：出现次数 | 新：统一位置 |
|---|---|---|
| Header HTML 结构 | 3 个 HTML × 12 行 | `CET6Shell.renderHeader()` |
| Tab 系统 HTML + 切换 | 4 个 HTML × 各 1 段 | `CET6Shell.renderTabs()` |
| 生词本面板 HTML | 3 个 HTML × 10 行 | `CET6Shell.renderSidebar()` |
| 标注面板 HTML | 3 个 HTML × 10 行 | `CET6Shell.renderSidebar()` |
| Popup 弹窗 HTML | 3 个 HTML × 13 行 | `CET6Shell.renderPopup()` |
| addFromVocab/addAnnotation 等 5 函数 | 3 个 HTML × ~50 行 JS | `CET6Shell` / `AppController` |
| mouseup/mousedown 事件 | 3 个 HTML × ~60 行 JS | `CET6Shell.initSelection()` |
| 数据加载 try/catch | 3 个 HTML × ~60 行 JS | `AppController._loadExam()` |
| `_esc()` HTML 转义 | 4 个 JS 文件 × 5 行 | `CET6Utils.esc()` |
| `_renderVocabPanel()` | 3 个引擎 × ~40 行 | `CET6Shell.renderSidebar()` |
| `_renderAnnotatePanel()` | 3 个引擎 × ~30 行 | `CET6Shell.renderSidebar()` |

预期净减少约 500 行重复代码。

### 2.5 引擎兼容性

各引擎需暴露统一的接口供 AppController 调用：

```javascript
// 所有引擎必须实现的最小接口
interface Engine {
  init(containerSelector)     // 初始化渲染到指定容器
  switchPhase(phaseId)        // Tab 切换
  reRenderCurrentPhase()      // 侧边栏更新后刷新
  destroy()                   // 清理事件/计时器/状态

  // 以下由 Shell 管理，引擎不再自己渲染面板：
  // _renderVocabPanel() → 废弃
  // _renderAnnotatePanel() → 废弃
}
```

引擎保留 phase 渲染逻辑（这是各模块独有内容），但不再自行渲染侧边栏面板——由 `CET6Shell` 接手。

---

## 3. 导入表单与处理流程

### 3.1 表单结构

统一表单，4 个折叠区域。每个 Section 可跳过，至少填一个模块才能提交。

```
┌────────────────────────────────────────────────┐
│  📥 导入新试卷                        [取消] [提交]│
├────────────────────────────────────────────────┤
│  ▎基本信息                                     │
│  年份：[____]  月份：[____]  套号：[____]      │
│  标题：[______________]（可选）                │
│                                                │
│  ▎Section A：传统阅读                    [展开] │
│    文章原文：[                      ]          │
│    题干+选项（格式：Q1. xxx \n A. xxx B. xxx...）│
│    答案文本（如 46.A 47.C ...）：[        ]    │
│                                                │
│  ▎Section B：长篇阅读（匹配题）         [展开] │
│    段落文本（多段，换行分隔）：[          ]    │
│    选项（10 条，每行一个）：[           ]      │
│    答案（选项→段落映射）：[            ]       │
│                                                │
│  ▎Section C：选词填空                   [展开] │
│    文章（空位用 ___ 标记）：[           ]      │
│    15 个候选词（每行：字母. 单词 词性. 释义）： │
│    答案（10 个空位，如 26.H 27.J ...）：[  ]   │
└────────────────────────────────────────────────┘
```

### 3.2 智能解析规则

提交时对已填模块逐段解析，解析失败高亮对应输入框。

**传统阅读解析：**
- 文章：原样转字符串数组（段落按两个换行切分）
- 题干：按 `Q\d+\.` 或 `\d+\.` 切分
- 选项：每行匹配 `[A-D]\.\s*(.+)` 提取
- 答案：正则匹配 `(\d+)[.\s]?([A-D])` 提取，兼容 `46.A` / `46-50: AACDB` / 自由格式

**长篇阅读解析：**
- 段落：按两个换行切分，自动编号
- 选项：按 `^\d+[\.、]?\s*` 切分，提取标号和正文
- 答案：正则匹配 `(\d+)[.\s]?([A-P])[.\s]?(\d+)` — 选项号→段落号

**选词填空解析：**
- 文章：保留原样，识别 `___\d+___` 标记空位编号
- 候选词：按行切分，每行匹配 `([A-O])\.?\s*(\w+)\s*(\w+\.?)\s*(.+)` → letter/word/pos/meaning
- 答案：正则匹配 `(\d+)[.\s]?([A-O])` 提取

### 3.3 处理等待界面

提交后进入 `processing/{id}` 路由，显示 5 步进度：

```
┌──────────────────────────────────┐
│        ⏳ 正在处理试卷...         │
│  ████████████████░░░░░░░░  60%   │
│  ✅ 数据校验通过                 │
│  ✅ JSON 序列化完成              │
│  ✅ 词根词缀分析生成             │
│  🔄 做题引导分析生成中...        │
│  ⏸  生词提取入库                 │
│  ⏸  最终校验完成                 │
└──────────────────────────────────┘
```

| 步骤 | 内容 | 实现方式 |
|---|---|---|
| ① 数据校验 | 必填字段检查、答案数量匹配 | 同步 |
| ② JSON 序列化 | 生成符合规范的试卷 JSON，存入 `cet6-exams` | 同步 |
| ③ 词根词缀分析 | 对 cloze 15 候选词匹配词根库，生成 `bankAnalysis` | 基于规则库 |
| ④ 做题引导生成 | 对 cloze 10 空位基于词性+上下文模板生成 💭 独白 | 模板引擎 |
| ⑤ 生词提取入库 | 提取所有模块生词到全局 `cet6-vocab`，最终校验 | 同步 |

使用 `requestAnimationFrame` 分步执行——每步完成后更新进度条再执行下一步，确保界面不卡死。

**词根词缀规则库**（步骤 ③）基于 CET6 高频词根表，包含约 200 条常用词根映射规则。匹配以词根后缀为 key，查找词时按最长后缀匹配。

**引导分析模板**（步骤 ④）基于简单的规则引擎：
1. 判断空位词性（冠词后、形容词后、系词后等）
2. 缩小候选范围（同词性的候选词）
3. 结合上下文关键词生成排除/确认理由
4. 用内心独白语气输出

处理完成后自动跳转到 `exam/{id}`。

---

## 4. 数据存储与 localStorage 重构

### 4.1 统一后的存储键

从 12 个散乱键 → 6 个结构化键：

| 键 | 内容 | 管理者 |
|---|---|---|
| `cet6-exams` | 所有试卷完整数据（含 3 模块 JSON） | AppController |
| `cet6-exams-state` | 所有试卷用户状态（进度/答案/分数） | 各 Engine |
| `cet6-vocab` | 全局单词本（唯一单词存储） | CET6Vocab（代理模式） |
| `cet6-annotations` | 所有划线标注 | CET6Annotate |
| `cet6-locatewords` | 长篇阅读定位词 | CET6LocateWord |
| `cet6-recent` | 最近练习记录 | AppController |

### 4.2 试卷数据结构（cet6-exams）

```javascript
// 数组中每一条
{
  id: "2025-12-exam1",            // 唯一 ID
  meta: {
    examDate: "2025年12月",
    level: "CET6",
    title: "2025年12月六级真题第1套",
    importedAt: "2026-05-18T12:00:00.000Z"
  },
  modules: {
    reading:  { /* 完整传统阅读 JSON */ },
    matching: { /* 完整长篇阅读 JSON */ },
    cloze:    { /* 完整选词填空 JSON */ }
  },
  availableModules: ["reading", "matching", "cloze"]
}
```

### 4.3 做题状态数据（cet6-exams-state）

```javascript
{
  "2025-12-exam1": {
    reading: {
      currentPhase: "1",
      answers: { "46": "A", "47": "C", ... },
      score: { correct: 3, total: 5 }
    },
    matching: {
      currentPhase: "1",
      answers: { "36": "C", ... },
      matchedCount: 5,
      timeRemaining: 720
    },
    cloze: {
      currentPhase: "1",
      selectedWords: { "26": "H", ... },
      score: { correct: 7, total: 10 }
    }
  }
}
```

### 4.4 单词系统统一

**旧系统问题：** `CET6Vocab` 管理独立存储 `{word, source, time}`，与全局 `cet6-vocab` 的 `{word, pos, meaning, mastery, ...}` 不互通。在阅读模块划词加入的生词不会自动进入复习队列。

**新方案：** `CET6Vocab` 简化为**代理模式**，直接读写全局 `cet6-vocab`：

```javascript
class CET6Vocab {
  constructor(examId, moduleName) {
    this.examId = examId;
    this.moduleName = moduleName;
  }

  add(word, pos, meaning) {
    // 查找 cet6-vocab 中是否已有该词
    // 有 → 追加来源标记 (examId + module)
    // 无 → 创建词条 { word, pos, meaning, sources: [...], mastery: 0, ... }
  }

  addRich(word, richData) {
    // 补充词根/例句/搭配等详细信息
  }

  has(word)    { /* 查全局 cet6-vocab */ }
  count()      { /* 统计当前试卷来源的词数 */ }
  getWords()   { /* 获取当前试卷来源的词列表 */ }
  remove(word) { /* 仅移除当前试卷的关联，不删除词条 */ }
}
```

**收益：** 在传统阅读划词加入生词 → 自动进入单词舱复习队列；单词舱自测通过 → 阅读页面生词本同步变绿。一次操作，全局同步。

### 4.5 现有真题的自动迁移

首次启动时，检测 `cet6-exams` 是否为空：
- 若为空且有 `assets/data/2025-12-*.json` → 自动合并为一条试卷记录
- 迁移完成后清除旧的散乱键

---

## 5. 设计决策依据

| 决策 | 选项 | 理由 |
|---|---|---|
| 试卷选择页 | C - 混合首页 | 一屏展示：统计 + 试卷 + 快捷入口，兼顾新老用户 |
| 入库方式 | C - 手动表单 | 比 PDF 自动解析可靠，降低实现复杂度 |
| 录入界面 | A - 统一表单 | 一次提交，减少用户操作步数 |
| 完成跳转 | C - 试卷详情页 | 用户自己选择练哪个模块 |
| 处理方式 | B - 重度预处理 | 包含词根分析+引导生成，一步到位 |
| 代码整合 | A - SPA | 极致精简，零重复代码 |
