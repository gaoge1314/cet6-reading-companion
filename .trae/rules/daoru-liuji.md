# 六级真题导入流水线 (daoru-liuji)

将 CET6 真题 PDF 试卷导入到本平台 `cet6-reading-platform` 的规则。
当需要"导入试卷""添加真题""生成试题数据""处理PDF试卷""六级真题导入"时，必须使用本规则。

## 前置工作

```bash
pip install pdfplumber
```

平台数据目录：`cet6-reading-platform/assets/data/`
目标文件：`exams_batch.json`（数组，每套试卷一个元素）

## 流程概览

```
PDF真题.pdf ──→ 提取全文文本 ──→ 分离三大题型 ──→ 构建结构化 JSON ──→ exams_batch.json
PDF解析.pdf ──→ 提取答案文本 ──→          ↗
```

## 步骤

### 1. 提取 PDF 文本

用 pdfplumber 提取真题卷和解析卷：

```python
import pdfplumber
with pdfplumber.open("真题.pdf") as pdf:
    for i, page in enumerate(pdf.pages):
        text = page.extract_text()  # 保存到临时文件审查
```

### 2. 确定试卷 ID

格式：`{year}-{month}-exam{set}`，如 `2025-12-exam2`、`2025-06-exam1`

### 3. 构建传统阅读 (reading)

数据结构示例：
```json
{
  "meta": { "type": "reading", "id": "2025-12-exam2" },
  "passage": { "paragraphs": ["段落1", "段落2", ...] },
  "questions": [
    {
      "id": 46,
      "number": "46",
      "text": "题干",
      "type": "细节题",
      "options": [
        { "label": "A", "text": "选项A" },
        { "label": "B", "text": "选项B" },
        { "label": "C", "text": "选项C" },
        { "label": "D", "text": "选项D" }
      ]
    }
    // 46~55 共 10 题
  ],
  "answers": [
    { "id": 46, "correct": "A" },
    // 10 条
  ],
  "phases": {
    "phase1": { "topicPrediction": null, "questionTypes": null },
    "phase2a": { "instruction": { "title": "T1 全景扫描", "content": "扫描题干 → 找关键词 → 判断题型" } },
    "phase2b": { "instruction": { "title": "T3 中心做题", "content": "用找到的中心去匹配选项" } },
    "phase2c": { "instruction": { "title": "T4 定位 + T6 段落锁定 + T3 同义替换", "content": "找到定位词 → 锁定段落" } },
    "phase3": { "title": "统一对答案" },
    "phase4": { "summary": { "title": "文章复盘", "content": "对照错题分析原因" } }
  }
}
```

**校验**：questions 恰好 10 题（46~55），answers 恰好 10 条。

### 4. 构建长篇阅读 (matching)

```json
{
  "meta": { "type": "matching", "timeLimit": 15, "id": "2025-12-exam2" },
  "passage": {
    "paragraphs": [
      { "id": "A", "text": "段落A" },
      // A~N/P/Q
    ]
  },
  "options": [
    { "id": 36, "text": "选项36" },
    // 36~45 共 10 条
  ],
  "answers": [
    { "id": 36, "correctPara": "F" },
    // 10 条，correctPara 是段落字母
  ],
  "phases": { /* 同上模板 */ },
  "overallAnalysis": ""
}
```

**校验**：options 10 条（36~45），answers 10 条。

### 5. 构建选词填空 (cloze)

```json
{
  "meta": { "type": "cloze", "id": "2025-12-exam2" },
  "passage": {
    "paragraphs": ["带___26___占位符的段落"],
    "blanks": [26, 27, 28, 29, 30, 31, 32, 33, 34, 35]
  },
  "banks": [
    { "letter": "A", "word": "accompanying", "pos": "adj.", "meaning": "伴随的" },
    // A~O 共 15 个
  ],
  "answers": [
    { "blank": 26, "correct": "I", "word": "once" },
    // 10 个
  ],
  "wordAnalysis": [],
  "phases": { /* 同上模板 */ }
}
```

**校验**：banks 15 个（A~O），answers 10 个（26~35），blanks 数组含 26~35。

### 6. 打包

顶层结构：
```json
[
  {
    "id": "2025-12-exam2",
    "meta": {
      "examDate": "2025年12月",
      "level": "CET6",
      "title": "2025年12月六级真题第2套",
      "importedAt": "2026-05-18T12:00:00.000Z"
    },
    "modules": {
      "reading": { /* 步骤3 */ },
      "matching": { /* 步骤4 */ },
      "cloze": { /* 步骤5 */ }
    },
    "availableModules": ["reading", "matching", "cloze"]
  }
]
```

保存到 `cet6-reading-platform/assets/data/exams_batch.json`。

## 自动导入机制

平台启动时 `DataMigrator` 自动加载 `exams_batch.json`，按 `exam.id` 去重。

## 常见问题

### 答案提取
- 优先搜索解析 PDF 中的「答案速查」「参考答案」
- 传统阅读答案格式：`46.A`、`47.C`
- 长篇阅读答案格式：`36.F`（选项号→段落字母）
- 选词填空答案格式：`26.I`（空位号→候选词字母）

### 选项文本缺失
从解析 PDF 的答案详解部分可找到完整中英文对比。

### 特殊字符
- 长破折号 `—` 保留
- 引号需要 JSON 转义
- pdfplumber 提取后检查乱码

### 扫描件 PDF
若解析 PDF 无文本层（OCR 为空），答案密钥可使用本项目已有数据中的相同试卷答案。
