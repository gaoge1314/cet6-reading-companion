# CET6 传统阅读 — 双浮窗重构设计

**日期**: 2026-05-17  
**状态**: 设计完成，待实施  
**对象**: `cet6-reader.html` 及 `cet6-reader-template.html`

---

## 1. 设计目标

将当前"Phase 标签页内嵌文章+题目"的单体结构，重构为"双浮窗（原文+选项）+ 主区域精简为教学引导"的新架构。核心改动：

- **文章和题目从页面主体移出** → 放到两个独立浮窗中（可拖拽、可调节大小、可关闭）
- **Phase 标签页精简为纯教学引导** → 手风琴折叠提示条，引导用户按步骤做题
- **做题顺序调整为"先看选项→再读首尾→中心做题→定点精读"**（源自刘晓艳老师技巧体系）
- **所有分析基于做题人视角**，只看已读内容，不剧透、不跳步
- **生词本增加翻译功能**
- **提示条默认折叠，点击展开**

---

## 2. 整体布局

```
┌──────────────────────────────────────────────────┐
│  Header（标题 + 试卷信息）                         │
├──────────────────────────────────────────────────┤
│  [Phase 1] [Phase 2a] [Phase 2b] ...    📄 原文  📝 题目 │
├──────────────────────────────────────────────────┤
│                                                   │
│         主内容区 — 教学引导（手风琴提示框）           │
│         ├─ 每个 Phase 放对应的做题引导             │
│         ├─ 提示条默认折叠，点击展开                 │
│         └─ 情感色彩分析、中心预测、技巧提示          │
│                                                   │
└──────────────────────────────────────────────────┘
                                    📖 (右下浮球)

┌─────────────────┐    ┌─────────────────┐
│ 📄 原文窗口       │    │ 📝 选项窗口       │
│ (可拖拽/调节)    │    │ (可拖拽/调节)    │
│ 默认显示         │    │ 默认显示         │
│ 可关闭           │    │ 可关闭           │
└─────────────────┘    └─────────────────┘
```

---

## 3. 6个 Phase 内容设计

### Phase 1 — 选项预判（核心新增）

> **已读内容**: 仅5道题的题干和选项（还未看文章一句原文）
> **分析原则**: 所有推断仅基于选项中的措辞

| 主区域内容 | 用户任务 | 状态 |
|:--|:--|:--|
| 主题词扫描引导 | 从5道题中提取重复关键词，猜测讨论主题 | 折叠提示 |
| 情感色彩分析引导 | 判断选项措辞的正向/负向 | 折叠提示 |
| 作者态度预判引导 | 从选项反推作者立场 | 折叠提示 |
| 题目类型标注 | 细节题/推断题预先标注 | 折叠提示 |

**📄 原文窗口**: 10段全文（纯阅读）  
**📝 选项窗口**: 5道题题干+选项（只读预览，不可点击）

### Phase 2a — 首尾定中心

> **已读内容**: 选项 + 首段 + 各段首句 + 尾段

| 主区域内容 | 说明 | 状态 |
|:--|:--|:--|
| 首尾句列表 | 各段首尾句展示（可划词） | 展开 |
| 情感色彩修正 | 对比 Phase 1 预判，基于已读段落修正判断 | 折叠提示 |
| 中心思想框 | 基于首尾句推断：追求成功不应牺牲友谊 | 展开 |
| 出题位置预测 | 首段各段首尾句至少出3道题（老师技巧） | 折叠提示 |

**📄 原文窗口**: 10段全文，首尾句绿色边框高亮  
**📝 选项窗口**: 5道题预览（只读）

### Phase 2b — 中心做题

> **已有中心思想**，逐题用中心排除干扰项

| 主区域内容 | 说明 | 状态 |
|:--|:--|:--|
| 中心提示 | 当前中心思想回顾 | 展开 |
| 逐题判断引导 | 哪些题中心可直接做？哪些需精读？ | 折叠提示 |
| 做题策略 | 46题中心可做 / 47-49需定位精读 / 50题中心+态度 | 折叠提示 |

**📄 原文窗口**: 10段全文  
**📝 选项窗口**: **可选题模式**（点击选项高亮）+ 底部「✅ 确认完成本阶段」按钮

### Phase 2c — 定点精读

> 为剩余题目定位回原文，精读定位段

| 主区域内容 | 说明 | 状态 |
|:--|:--|:--|
| 定位段精读分析 | P3-P4 (47题), P5 (48题), P6 (49题), P8-P10 (50题) | 展开 |
| 同义替换表格 | reevaluate→reexamine, harm→detrimental effects 等 | 折叠提示 |
| 情感再确认 | 精读后对情感色彩/中心有无修正 | 折叠提示 |

**📄 原文窗口**: 10段全文，定位段黄色高亮  
**📝 选项窗口**: **可选题模式**（可修正 Phase 2b 的选择）+ 底部确认按钮

### Phase 3 — 核对答案

| 主区域内容 | 说明 |
|:--|:--|
| 分数展示 + 逐题结果 | ✅/❌ |
| 正确题理由 | 原文句子佐证 |
| 错题分析 | 只显示用户实际选错的选项分析 |
| 翻译面板 | 左右对照（生词红色 + 解题句绿色下划线+题号标注） |

**📄 原文窗口**: 左右对照翻译面板  
**📝 选项窗口**: 答案展示 + 分数 + 错题分析

### Phase 4 — 全篇复盘

| 主区域内容 | 说明 |
|:--|:--|
| 文章中心总结 | 最终确认版 |
| 技巧使用统计 | T1中心优先/T3同义替换/T4定位法/T5排除法/T7首尾句 |
| 各题技巧复盘 | 每道题用到的技巧详解 |
| 易错点提醒 | 关键区分点（如48题A的迷惑性） |
| 导出按钮 | 📥 导出 .md 生词本 / 🗑️ 清空 |

**📄 原文窗口**: 10段全文（复习回顾）  
**📝 选项窗口**: 技巧统计面板

---

## 4. 浮窗组件设计

### 4.1 通用浮窗结构

三个浮窗（原文、选项、生词本）共享相同的壳结构：

```
┌─────────────────────────┐
│ 标题栏（拖拽把手）    ✕ │  ← 紫色渐变, cursor:move, touch-action:none
├─────────────────────────┤
│                         │
│   内容区（overflow-y）    │  ← 可滚动
│                         │
├─────────────────────────┤
│ 右下角调节手柄 ▥        │  ← cursor:nwse-resize, touch-action:none
└─────────────────────────┘
```

CSS 基础类：`.floating-window`（共用），样式特化用修饰类 `.window-article` / `.window-options`。

所有拖拽/调节大小使用 **Pointer Events + setPointerCapture**（已验证方案）。

### 4.2 初始配置

| 属性 | 📄 原文 | 📝 选项 | 📖 生词本 |
|:--|:--|:--|:--|
| 初始 left | 60px | auto | auto |
| 初始 right | auto | 60px | 80px |
| 初始 top | 160px | 160px | 80px |
| 初始 width | 400px | 380px | 300px |
| 初始 height | 550px | 500px | auto |
| min-width | 280px | 280px | 220px |
| min-height | 300px | 300px | 200px |
| z-index | 900 | 901 | 1000 |
| 默认显示 | ✅ 显示 | ✅ 显示 | ❌ 隐藏 |

### 4.3 拖拽逻辑提炼

将当前生词本的拖拽逻辑抽象为可复用函数：

```javascript
function makeDraggableResizable(windowEl, titlebarEl, resizeHandleEl) {
  // Pointer Events 实现
  // onDown → 判断 drag 还是 resize → setPointerCapture
  // onMove → 移动/调整大小
  // onUp → 释放
}
```

三个窗口各自调用一次即可。

---

## 5. 顶部工具栏

Phase 标签栏右侧增加两个按钮：

```html
<button class="tool-btn active" onclick="toggleWindow('article')">📄 原文</button>
<button class="tool-btn active" onclick="toggleWindow('options')">📝 题目</button>
```

- 窗口打开时按钮高亮（`.active`）
- 窗口关闭后按钮恢复灰色
- `toggleWindow()` 切换窗口显示 + 更新按钮状态 + 更新关闭按钮状态

---

## 6. Phase 切换联动

`switchPhase(n)` 函数需同时更新：

1. 主区域内容（显示对应 Phase 的教学引导面板）
2. 原文窗口内容（根据 Phase 切换显示模式）
3. 选项窗口内容（根据 Phase 切换交互模式）
4. Phase 标签激活状态

### 原文窗口内容驱动

| Phase | 显示内容 |
|:--|:--|
| 1, 2b | 10段全文（普通模式） |
| 2a | 10段全文 + 首尾句 `.head-tail-highlight` |
| 2c | 10段全文 + 定位段 `.locate-highlight` |
| 3 | 左右对照翻译面板（`renderTranslation()`） |
| 4 | 10段全文（普通模式） |

### 选项窗口内容驱动

| Phase | 显示内容 |
|:--|:--|
| 1, 2a | 5道题预览（只读，不可点击） |
| 2b, 2c | 5道题可选题模式 + 确认按钮 |
| 3 | 答案展示 + 分数 + 错题分析 |
| 4 | 技巧统计面板 |

---

## 7. 数据流与状态管理

### localStorage Key

| Key | 内容 |
|:--|:--|
| `cet6_words` | 生词数组 `[{word, translation, context, added}]` |
| `cet6_phase_done` | 阶段确认状态 `{phase_2b: {done, snapshot, time}, phase_2c: {...}}` |

### 运行时状态（JS 内存）

| 变量 | 类型 | 说明 |
|:--|:--|:--|
| `words` | Array | 生词数组 |
| `selectedOptions` | Object | `{46:'D', 47:'A', ...}` |
| `phaseDone` | Object | 确认状态 |
| `articleVisible` | Boolean | 原文窗口是否打开 |
| `optionsVisible` | Boolean | 选项窗口是否打开 |

### 数据流

```
选项窗口点击选项 → selectOption(qNum, opt) → selectedOptions 更新 + UI 刷新
点击确认按钮 → 快照写入 localStorage + 标记 Phase 完成
切换到 Phase 3 → updateScore() → 对比正确答案 + 计算分数
```

---

## 8. 生词本翻译功能

### 添加生词流程

```
用户选中单词 → 弹出"加入生词本" → 弹出翻译输入框
  ├─ 用户输入中文释义 → 确认 → 加入 words 数组
  └─ 用户留空 → 加入 words 数组（translation 为空，可稍后补充）
```

### 生词本显示

每行显示：

```
┌──────────────────────────────────┐
│ 单词          中文释义           ✕ │
│ context: P3                      │
└──────────────────────────────────┘
```

- 翻译为空时显示"点击添加翻译"（灰色文字，可点击编辑）
- 已添加翻译的单词显示中文
- 点击翻修行内编辑

### Word 数据结构更新

```javascript
// 旧
{ word: "reevaluate", context: "P3", added: "2026-05-17" }

// 新
{ word: "reevaluate", translation: "重新评估", context: "P3", added: "2026-05-17" }
```

---

## 9. 手风琴提示条

每个 Phase 主区域的技巧提示默认折叠，点击标题栏展开：

```
┌──────────────────────────────────────┐
│ ▶ 主题词扫描引导                      │  ← 折叠状态
├──────────────────────────────────────┤
│ ▼ 情感色彩分析引导                    │  ← 展开状态
│   从选项措辞分析：ignore, detrimental │
│   neglect 等词 → 整体偏负面           │
│   作者批判忽视友谊的做法...           │
└──────────────────────────────────────┘
```

CSS 类 `.accordion-item` / `.accordion-header` / `.accordion-body`

---

## 10. 代码组织

单文件 `cet6-reader.html`，按区块分段：

```
<style>
  ├── 基础布局 + 配色
  ├── 题目选项样式
  ├── 浮窗通用组件 (.floating-window)
  ├── 原文/选项窗口特化
  ├── 顶部工具栏按钮
  ├── 手风琴提示条
  ├── 预判分析面板
  ├── 情感色彩标记
  └── 移动端适配
</style>

<body>
  ├── Header
  ├── Phase 标签 + 窗口开关按钮
  ├── 6个主内容区（Phase 1-4，各自独立 <div>）
  ├── 原文浮窗 (#window-article)
  ├── 选项浮窗 (#window-options)
  ├── 生词本浮窗 (#word-list)
  └── 划词菜单
</body>

<script>
  ├── 生词本功能（含翻译）
  ├── 划词功能
  ├── 浮窗拖拽/调节（通用函数）
  ├── 窗口开关逻辑
  ├── 选题功能
  ├── Phase 切换 + 窗口联动
  ├── 手风琴折叠逻辑
  ├── 导出功能
  └── 当前文章数据
</script>
```

---

## 11. 可复用体系：模板 + 数据 + 生成器

### 11.1 问题

每新增一篇阅读都要手动修改 HTML 中的试题数据，重复劳动大、容易出错、未来扩展到其他题型（长篇阅读、选词填空等）更麻烦。

### 11.2 方案：HTML 模板 + JSON 数据 + Python 生成器

```
传统阅读/
├── cet6-reader-template.html     ← 模板（试题数据用 @@PLACEHOLDER@@ 占位）
├── generate.py                   ← Python 生成器脚本
├── data/
│   ├── passage-01-friendship.json  ← Passage One 数据
│   ├── passage-02-xxx.json         ← Passage Two 数据
│   └── passage-01-friendship-translation.json  ← 全文翻译数据
└── cet6-reader-passage-01.html   ← 生成的最终文件
```

**核心思路**：
- 模板承担 100% 的 CSS/JS 框架代码（拖拽、选题、Phase切换等）
- 试题相关内容全放 JSON
- 运行 `python generate.py data/passage-01-friendship.json` → 输出独立 HTML

### 11.3 JSON 数据结构

```json
{
  "meta": {
    "title": "2025年12月六级真题第1套",
    "passage": "Passage One",
    "topic": "友谊与个人成功"
  },
  "article": [
    {"para": 1, "text": "Many see friendships as a comfort blanket...", "is_head": true, "is_tail": false},
    {"para": 2, "text": "The chaos and never-ending turmoil...", "is_head": false, "is_tail": false}
  ],
  "questions": [
    {
      "num": 46,
      "type": "detail",
      "text": "What often happens when people are eager to pursue individual success?",
      "options": [
        {"label": "A", "text": "They lack a shoulder to cry on."},
        {"label": "B", "text": "They have no soul to confide in."},
        {"label": "C", "text": "They cannot find reliable friends."},
        {"label": "D", "text": "They ignore their ties with friends."}
      ],
      "correct": "D",
      "location": "P1尾句",
      "reasoning": "P1尾句原文：'we lose friends along the way' → ignore ties with friends（同义替换）",
      "wrong_analysis": {
        "A": "偷换概念：'a shoulder to cry on'是友谊的功能，不等于'lack'",
        "B": "与A同理，把友谊的功能当成缺失",
        "C": "太绝对：原文说lose friends along the way，不是cannot find"
      }
    }
  ],
  "center_theme": "追求个人成功不应该以牺牲友谊为代价",
  "phase_data": {
    "phase1_preview": {
      "keyword_scan": "从5道题中提取重复关键词：friends, success, individual → 友谊与成功的关系",
      "sentiment_analysis": "选项措辞偏负面：ignore, detrimental, neglect → 作者批判忽视友谊",
      "author_attitude_guess": "从选项反推：'reexamine harm' 'cannot afford to neglect' → 作者倾向于重视友谊",
      "question_types": "46-47-49细节题 | 48-50推断题"
    },
    "phase2a_center": "...",
    "phase2b_strategy": "...",
    "phase2c_locate": [...],
    "phase3_wrong_analysis": {...},
    "phase4_summary": "..."
  }
}
```

### 11.4 生成流程

```
1. 用户编写 data/passage-XX.json
2. 运行: python generate.py data/passage-XX.json
3. 脚本读取模板，替换 @@PLACEHOLDER@@ 为具体内容
4. 输出 cet6-reader-passage-XX.html 到同目录
5. 双击即可在浏览器中打开做题
```

### 11.5 扩展到其他题型

```python
# 未来扩展：同一个 generate.py 支持多题型
python generate.py --type traditional data/passage-01.json     # 传统阅读
python generate.py --type long data/long-01.json              # 长篇阅读（未来）
python generate.py --type fillblank data/fillblank-01.json    # 选词填空（未来）
```

每个题型有自己的模板文件（`template-traditional.html`、`template-long.html` 等）。

### 11.6 模板占位符规范

| 占位符 | 替换为 | 示例 |
|:--|:--|:--|
| `@@META_TITLE@@` | 试卷标题 | `2025年12月六级真题第1套` |
| `@@META_PASSAGE@@` | 篇章名称 | `Passage One` |
| `@@META_TOPIC@@` | 主题 | `友谊与个人成功` |
| `@@ARTICLE_HTML@@` | 文章10段HTML | 生成器从JSON构造 |
| `@@QUESTIONS_PREVIEW_HTML@@` | 题目预览区HTML | Phase 1/2a选项窗口 |
| `@@QUESTIONS_INTERACTIVE_HTML@@` | 可选题HTML | Phase 2b/2c选项窗口 |
| `@@ANSWERS_HTML@@` | 答案展示HTML | Phase 3 |
| `@@PHASE1_HTML@@` | Phase 1主区域引导 | 手风琴提示条 |
| `@@PHASE2A_HTML@@` | Phase 2a主区域引导 | 首尾句+中心框 |
| `@@PHASE2B_HTML@@` | Phase 2b主区域引导 | 中心做题策略 |
| `@@PHASE2C_HTML@@` | Phase 2c主区域引导 | 定位段+同义替换 |
| `@@PHASE3_HTML@@` | Phase 3主区域 | 分数+对错分析 |
| `@@PHASE4_HTML@@` | Phase 4主区域 | 技巧复盘 |
| `@@CORRECT_ANSWERS_JS@@` | 正确选项JS对象 | `{46:'D',47:'A',48:'D',49:'B',50:'B'}` |
| `@@WRONG_ANALYSIS_JS@@` | 错题分析JS对象 | 按题号+选项索引 |

### 11.7 生成器脚本 `generate.py`

```python
import json, sys, os

TEMPLATE = os.path.join(os.path.dirname(__file__), 'cet6-reader-template.html')

def load_template():
    with open(TEMPLATE, 'r', encoding='utf-8') as f:
        return f.read()

def load_data(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def build_replacements(data):
    # 返回 {占位符: 替换内容} 字典
    ...

def generate(data_path):
    data = load_data(data_path)
    template = load_template()
    repl = build_replacements(data)
    for k, v in repl.items():
        template = template.replace(k, v)
    out_name = 'cet6-reader-' + os.path.splitext(os.path.basename(data_path))[0] + '.html'
    out_path = os.path.join(os.path.dirname(data_path), '..', out_name)
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(template)
    print(f'✅ 已生成: {out_path}')
```

---

## 12. 不做的事情

- ❌ 不引入外部依赖（jQuery、React 等）
- ❌ 不使用后端服务（纯静态 HTML）
- ❌ 不改变生词本 localStorage key（保持兼容）
- ❌ 不修改 PDF 提取/备份流程
- ❌ 不添加"参考答案自动判断"（用户提交后才对比）

---

## 修订记录

| 日期 | 修订 |
|:--|:--|
| 2026-05-17 v1 | 初始版本 — 双浮窗重构 + 选项预判 + 做题视角 |
| 2026-05-17 v2 | 新增 §11 可复用体系（模板 + JSON + Python 生成器），支持扩展到其他题型 |
