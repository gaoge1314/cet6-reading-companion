# CET-6 传统阅读 — 分阶段展示与增强引导设计文档

## 动机

当前 HTML 阅读器存在两个体验问题：

1. **内容一次性展示**：6 个 Phase 的 Tab 全部可见可点，用户可以随意跳转，失去了"阶段性练习"的训练感
2. **引导过于单薄**：每个 Phase 顶部只有一行小字指令（如"只扫读各段首尾句"），缺少方法论解释和视觉引导力

## 设计目标

1. 分阶段锁定机制 — 引导用户按序完成 6 个 Phase
2. 增强每阶段引导 — 彩色横幅 + 刘晓艳方法论金句 + 建议用时
3. 统一"下一步"按钮 — 替代原有的"确认完成"按钮
4. 生词本翻译增强 — 添加单词时自动获取释义 + 原文语境

---

## 一、阶段锁定机制

### 1.1 核心规则

- 初始状态：只有 Phase 1 Tab 可点击（蓝色高亮），其余显示为灰色锁定态
- 完成当前阶段（点击"下一步"）后，自动解锁下一个 Phase
- 已完成的 Phase Tab 保持可点击（绿色勾），方便回顾
- 状态持久化到 localStorage

### 1.2 状态流转

```
初始 → Phase 1 活跃, Phase 2~4 Tab 锁定(灰+锁图标)
  ↓ 点击"下一步"
Phase 1 ✓(可回顾), Phase 2a 活跃, Phase 2b~4 锁定
  ↓ 点击"下一步"
Phase 1~2a ✓, Phase 2b 活跃, Phase 2c~4 锁定
  ↓ 点击"下一步"
Phase 1~2b ✓, Phase 2c 活跃, Phase 3~4 锁定
  ↓ 点击"下一步"
Phase 1~2c ✓, Phase 3 活跃, Phase 4 锁定
  ↓ 点击"下一步"
全部解锁, Phase 4 活跃
```

### 1.3 Tab 视觉状态

| 状态 | 样式 | 行为 |
|------|------|------|
| 未解锁 | 灰色背景 + 🔒 锁图标 + `pointer-events:none` | 不可点击 |
| 已完成 | 正常背景 + ✅ 绿色勾号 + 正常 cursor | 可点击回顾 |
| 当前活跃 | 紫蓝渐变高亮 + 加粗 | 当前阶段 |

### 1.4 JavaScript 实现

```javascript
// 阶段解锁状态持久化
const phaseUnlockState = JSON.parse(localStorage.getItem('cet6_phase_unlock') || '{"1":true}');
// 默认 Phase 1 始终解锁

function unlockNextPhase(currentPhase) {
  const nextPhase = currentPhase + 1;
  if (nextPhase <= 6) {
    unlockedStates.push(nextPhase);
    localStorage.setItem('cet6_phase_unlock', JSON.stringify(unlockedStates));
    updateTabStates();
  }
}

function updateTabStates() {
  document.querySelectorAll('.tab').forEach((tab, i) => {
    const phaseNum = i + 1;
    tab.classList.remove('locked', 'done', 'active');
    if (currentPhase === phaseNum) tab.classList.add('active');
    else if (unlockedStates.includes(phaseNum)) tab.classList.add('done');
    else tab.classList.add('locked');
  });
}
```

---

## 二、每阶段引导横幅

### 2.1 样式设计

采用彩色左侧边框 + 图标 + 三行引导内容的卡片样式：

```css
.guidance-banner {
  background: var(--card);
  border: 1px solid var(--border);
  border-left: 5px solid var(--accent);
  border-radius: var(--radius);
  padding: 16px 20px;
  margin-bottom: 16px;
}
.guidance-banner .guidance-icon {
  font-size: 22px;
  margin-right: 8px;
  vertical-align: middle;
}
.guidance-banner .guidance-title {
  font-weight: 700;
  font-size: 15px;
  margin-bottom: 8px;
  color: var(--text);
}
.guidance-banner .guidance-what {
  font-size: 14px;
  color: var(--text);
  margin-bottom: 8px;
  line-height: 1.7;
}
.guidance-banner .guidance-quote {
  font-size: 13px;
  color: var(--text2);
  font-style: italic;
  padding-left: 12px;
  border-left: 3px solid var(--warn);
  margin-bottom: 6px;
}
.guidance-banner .guidance-time {
  font-size: 12px;
  color: var(--text3);
}
```

### 2.2 各阶段引导内容（来自刘晓艳视频转录）

#### Phase 1 — 选项预判

| 图标 | 🔍 |
|------|-----|
| 做什么 | 扫读所有题目的题干和选项，找重复出现的主题词，判断文章大概在讲什么 |
| 听老师说 | *"先看题目，别急着读文章。把 5 道题的选项都扫一遍，找出重复出现的关键词，心里有个预判。"* |
| ⏱ 建议用时 | 1 分钟 |

#### Phase 2a — 首尾定中心

| 图标 | 🧭 |
|------|-----|
| 做什么 | 只读首段 + 各段首句 + 尾段（尾段太长则只读首尾句），2 分钟内抓住文章中心 |
| 听老师说 | *"第一步是读首段、各段的首句以及尾段，把握文章中心。2 分钟之内必须读完。读懂中心的好处是：无论题干问什么，四个选项当中和文章中心靠得最近的选项绝对是正确答案，无需定位！"* |
| 补充说明 | *"即使中心没读懂，也至少找到出现频率最高的中心词。万一中心词也没找到——别担心，首段各段首句和尾段至少会出 3 道题，就当提前定位了。"* |
| ⏱ 建议用时 | 2 分钟 |

#### Phase 2b — 中心做题

| 图标 | 🎯 |
|------|-----|
| 做什么 | 用中心法则做题：能和中心沾边的直接选，不能的标记留到下一步精读 |
| 听老师说 | *"所有细节全部服从中心。传统阅读 10 道题，至少有 5 道是不需要定位的——和中心靠得最近的就是答案。如果四个选项都和中心没关系，才需要定位。"* |
| 补充说明 | *"读不懂中心但找到了中心词？选项中带中心词的通常也是正确答案，正确率 90% 以上。"* |
| ⏱ 建议用时 | 3~4 分钟 |

#### Phase 2c — 定点精读

| 图标 | 🔬 |
|------|-----|
| 做什么 | 对标记的题目回原文精读定位，仔细比对选项与原文的同义替换 |
| 听老师说 | *"定位优先找专有名词（时间、地点、人名），其次是普通名词和动词。如果名词是中心词满篇都是，就找形容词和副词的比较级和最高级来定位。"* |
| ⏱ 建议用时 | 4~5 分钟 |

#### Phase 3 — 核对答案

| 图标 | 📋 |
|------|-----|
| 做什么 | 核对答案 → 看解析 → 中英对照精读全文 → 生词加入生词本 |
| 听老师说 | *"做完以后一定要核实对错，看对是怎么做对的，错是为什么错的。第三步精读全文，生单词查出来写在旁边。第四步在句子里背单词。"* |
| ⏱ 建议用时 | 8~10 分钟 |

#### Phase 4 — 全篇复盘

| 图标 | 📊 |
|------|-----|
| 做什么 | 复盘全篇：统计使用的技巧、回顾每道题的技术要点、注意陷阱 |
| 听老师说 | *"每天做 1~2 篇，用这个方法坚持 30 天。做完精读，单词在真题句子里背，比你单独背单词书效果好得多。"* |
| ⏱ 建议用时 | 3~5 分钟 |

---

## 三、统一"下一步"按钮

### 3.1 设计

每个 Phase 底部增加一个全宽蓝色渐变按钮：

```html
<button class="next-phase-btn" onclick="goNextPhase(N)">
  ✅ 已完成 Phase X，进入 Phase Y：阶段名称 →
</button>
```

最后一阶段（Phase 4）按钮文案变为：「📋 导出笔记 / 完成训练」

### 3.2 行为

- Phase 2b / 2c：原有的 `confirmPhase()` 逻辑合并入 `goNextPhase()`
- 点击 = 保存当前选项快照(localStorage) + 解锁下一阶段 + `switchPhase(nextNum)`
- Tab 状态同步更新

### 3.3 按钮样式

```css
.next-phase-btn {
  display: block;
  width: 100%;
  padding: 14px 24px;
  margin-top: 20px;
  border: none;
  border-radius: var(--radius);
  background: linear-gradient(135deg, var(--purple-from), var(--purple-to));
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  text-align: center;
  transition: all .2s;
  box-shadow: 0 2px 8px rgba(102, 126, 234, .3);
}
.next-phase-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(102, 126, 234, .4);
}
.next-phase-btn:active { transform: translateY(0); }
.next-phase-btn:disabled {
  opacity: .5;
  cursor: not-allowed;
  transform: none;
}
```

---

## 四、生词本翻译增强

### 4.1 功能

选中单词 → 点击"加入生词本" → 自动调用 Free Dictionary API 获取释义 + 提取原文上下文 → 弹窗确认 → 保存

### 4.2 确认弹窗 UI

```
┌─────────────────────────────────┐
│  📖 abandon                     │
│  ─────────────────────────────  │
│  📚 释义：v. 抛弃，放弃          │
│  📝 原文："...forced to abandon  │
│     their original plan..."     │
│  ─────────────────────────────  │
│  💬 自定义释义（可选）：         │
│  [  _________________________ ] │
│              [ 保存到生词本 ]    │
└─────────────────────────────────┘
```

### 4.3 数据存储

生词本条目增强为：

```javascript
{
  word: "abandon",
  translation: "v. 抛弃，放弃",        // API 获取的标准释义
  customTranslation: "",               // 用户自定义（可选，覆盖显示）
  context: "P3",                       // 所在段落号
  contextSentence: "...forced to abandon their original plan...",  // 原文句子
  added: "2026-05-18 14:30:00"
}
```

### 4.4 生词本列表显示

每条记录显示两行：

```
abandon  —  v. 抛弃，放弃
  原文：...forced to abandon their original plan...
```

### 4.5 API 降级策略

```
Free Dictionary API (https://api.dictionaryapi.dev) 
  → 成功：显示英文释义
  → 失败/无结果：显示 "释义获取中..."，用户可手动输入
  → 不阻塞生词添加流程
```

API 调用在 `confirmAddWord()` 中异步执行，先保存单词框架，释义异步回填。

---

## 五、修改范围

| 文件 | 改动内容 |
|------|----------|
| `cet6-reader-template.html` | ① 新增 `.guidance-banner` CSS 样式 ② 每个 Phase div 顶部插入引导横幅 HTML ③ Tab 增加 `.locked` 状态样式 ④ 新增 `.next-phase-btn` 样式 ⑤ 新增 `goNextPhase()` JS 函数 ⑥ 新增 `updateTabStates()` JS 函数 ⑦ `confirmPhase()` 逻辑合并 ⑧ 生词本弹窗增加释义 + 原文显示 ⑨ `confirmAddWord()` 增加 API 调用 + 原文提取逻辑 |
| `generate.py` | ① Phase 2b/2c 的 `generate_questions_interactive()` 移除"确认完成"按钮生成代码 ② 引导横幅内容直接硬编码在模板中，不经过 Python |
| JSON 数据 | 无需修改（引导内容为通用方法论） |