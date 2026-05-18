# 选词填空辅助 + 记忆单词系统 设计文档

## 1. 概述

为六级阅读突击手平台新增两个独立功能模块：
- **选词填空系统（cloze-player.html）**：轻度量做题 + 单词深度学习的入口
- **记忆单词系统（vocab-review.html）**：跨题型的统一单词记忆舱

## 2. 设计原则

- 遵循已有架构风格：独立 HTML 页面 + JSON 数据 + Engine 驱动
- 数据通过扩展的 CET6Vocab 类在 localStorage 中统一管理
- 所有页面通过首页 index.html 跳转链接

## 3. 选词填空系统

### 3.1 JSON 数据结构（type: "cloze"）

```json
{
  "meta": {
    "id": "2025-12-cet6-cloze",
    "examDate": "2025年12月",
    "level": "CET6",
    "type": "cloze",
    "title": "运动与健康",
    "description": "2025年12月六级真题 · 选词填空"
  },
  "passage": {
    "paragraphs": ["文章原文，用 ___{1}___ 标记空位..."],
    "blanks": [26, 27, 28, 29, 30, 31, 32, 33, 34, 35]
  },
  "banks": [
    { "letter": "A", "word": "adolescents", "pos": "n.", "meaning": "青少年" },
    { "letter": "B", "word": "arbitrarily", "pos": "adv.", "meaning": "武断地" }
  ],
  "answers": [
    { "blank": 26, "correct": "H", "word": "ever" },
    { "blank": 27, "correct": "J", "word": "mortality" }
  ],
  "wordAnalysis": [
    {
      "word": "mortality",
      "pos": "n.",
      "meaning": "死亡率",
      "rootPrefix": "mort- + -ality",
      "rootExplanation": "拉丁词根 mort=死亡",
      "cognates": ["mortal", "immortal", "mortuary"],
      "examSentence": "原文句...",
      "collocations": ["infant mortality 婴儿死亡率"],
      "mnemonic": "谐音联想"
    }
  ],
  "phases": {
    "phase1": { "instruction": {}, "showPassage": true, "showBanks": true },
    "phase2": { "title": "对答案", "instruction": "逐空校对查看解析" },
    "phase3": { "title": "单词舱", "instruction": "15 词 + 生词逐个学习" }
  }
}
```

### 3.2 cloze-player.html 页面

3 个 Tab（Step）：

- **Step 1 — 做题**：展示 15 个候选词（带词性标签）+ 含空原文，用户选词填入空位
- **Step 2 — 对答案**：分数展示 + 逐空对比 + 解析（词性判断依据 + 上下文语义）
- **Step 3 — 单词舱**：15 个候选词逐个展示词根词缀/真题原句/联想记忆，可"加入记忆系统"
- 侧边栏复用现有 vocab-panel、annotate-panel 组件 + 新增答题卡面板

### 3.3 引擎 CET6ClozeEngine

- `init()` → 渲染 3 个 Step
- `selectWord(blankId, bankLetter)` — 用户填入选项
- `submitAnswers()` — 批改
- `renderPhase1/2/3()` — 各 Step 渲染
- `addToVocabSystem(word)` — 存入扩展的 CET6Vocab

## 4. 记忆单词系统

### 4.1 vocab-review.html 页面

4 个 Tab：

- **📖 单词本** — 浏览所有单词（搜索 + 按来源/词性/状态筛选）
- **🔄 艾宾浩斯** — 时间线展示复习计划（第1/3/7/15天），标记记住/模糊/忘记
- **🧠 自测** — 三种模式：看词选义 / 看义选词 / 拼写挑战
- **📊 进度** — 统计图表（掌握率饼图、复习日历热力图、来源分布）

### 4.2 数据存储（扩展 CET6Vocab）

现有 CET6Vocab 从 `{word, source, time}` 扩展为：

```javascript
{
  word, source, pos, meaning,
  rootPrefix, rootExplanation, cognates,
  examSentence, mnemonic,
  mastery: 0-5,         // 掌握程度
  reviewStage: 0-5,     // 艾宾浩斯阶段
  nextReview: "日期",   // 下次复习日
  history: [{date, result}]  // 复习历史
}
```

## 5. 首页更新

index.html 新增两个区域：
- 选词填空区（卡片链接到 cloze-player.html?data=xxx）
- 单词舱入口（卡片链接到 vocab-review.html，显示总单词/已掌握/待复习统计）

## 6. 文件清单

| 文件 | 操作 |
|------|:----:|
| `assets/data/cloze-template.json` | 新增 |
| `assets/data/2025-12-cloze.json` | 新增 |
| `cloze-player.html` | 新增 |
| `assets/js/cet6-cloze-engine.js` | 新增 |
| `assets/css/cloze.css` | 新增 |
| `vocab-review.html` | 新增 |
| `assets/js/cet6-vocab-engine.js` | 新增 |
| `assets/css/vocab.css` | 新增 |
| `assets/js/cet6-vocab.js` | 修改（扩展存储结构） |
| `assets/js/cet6-loader.js` | 修改（增加 cloze 校验） |
| `assets/css/theme.css` | 修改（新增 CSS 变量） |
| `assets/css/layout.css` | 修改（新增通用组件） |
| `index.html` | 修改（新增入口） |

## 7. 自检记录

- 无占位符/TODO：所有设计已明确
- 内部一致性：数据流从各题型 → localStorage → vocab-review.html 闭环
- 范围聚焦：仅包含选词填空 + 单词记忆系统，不涉及其他模块
- 无歧义：选词填空 3-Step、记忆系统 4-Tab 均已明确
