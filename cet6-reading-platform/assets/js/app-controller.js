var AppController = {
  route: '',
  currentExamId: null,
  currentModule: null,
  currentEngine: null,
  currentVocab: null,
  currentAnnotate: null,
  currentLocateWord: null,
  vocab: null,
  annotate: null,
  locateWord: null,

  getRouteFromHash: function() {
    const hash = window.location.hash.slice(1) || 'home';
    return hash;
  },

  navTo: function(route) {
    CET6Shell.destroy();
    this.route = route;
    window.location.hash = route;
    this._dispatchRoute(route);
  },

  _dispatchRoute: function(route) {
    const parts = route.split('/');
    const routeName = parts[0];

    switch (routeName) {
      case 'home':
        this._renderHome();
        break;
      case 'import':
        this._renderImport();
        break;
      case 'processing':
        this._renderProcessing(parts[1]);
        break;
      case 'exam':
        this._renderExamDetail(parts[1]);
        break;
      case 'player':
        this._renderPlayer(parts[1], parts[2]);
        break;
      case 'vocab':
        this._renderVocab();
        break;
      default:
        this._renderHome();
    }
  },

  _loadExam: function(examId) {
    const exams = CET6Utils.loadJSON(CET6Utils.storageKeys.exams) || [];
    return exams.find(e => e.id === examId);
  },

  _resolveExamId: function() {
    return this.currentExamId;
  },

  _migrateExistingData: function() {
    const existing = CET6Utils.loadJSON(CET6Utils.storageKeys.exams);
    if (existing && existing.length > 0) {
      return false;
    }

    const dataFiles = [
      { id: '2025-12-passage1', type: 'reading', path: 'assets/data/2025-12-passage1.json' },
      { id: '2025-12-longread', type: 'matching', path: 'assets/data/2025-12-longread.json' },
      { id: '2025-12-cloze', type: 'cloze', path: 'assets/data/2025-12-cloze.json' }
    ];

    const exam = {
      id: '2025-12-exam1',
      meta: {
        examDate: '2025年12月',
        level: 'CET6',
        title: '2025年12月六级真题第1套',
        importedAt: new Date().toISOString()
      },
      modules: {},
      availableModules: []
    };

    Promise.all(dataFiles.map(item => CET6Loader.load(item.path).then(data => {
      exam.modules[item.type] = data;
      exam.availableModules.push(item.type);
      return data;
    }))).then(() => {
      const exams = [exam];
      CET6Utils.saveJSON(CET6Utils.storageKeys.exams, exams);
      console.log('Auto migrated existing data to:', exam);
    }).catch(err => {
      console.error('Migration failed:', err);
    });

    return true;
  },

  _renderHome: function() {
    const root = document.getElementById('app-root');
    const vocabEngine = new CET6VocabEngine();
    const stats = vocabEngine.getStats();

    let html = `
      <div class="home-container">
        <div class="home-stats-bar card">
          <div class="stats-title">📊 单词舱统计</div>
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-num">${stats.total}</div>
              <div class="stat-label">总单词</div>
            </div>
            <div class="stat-item">
              <div class="stat-num">${stats.mastered}</div>
              <div class="stat-label">已掌握</div>
            </div>
            <div class="stat-item">
              <div class="stat-num">${stats.learning}</div>
              <div class="stat-label">学习中</div>
            </div>
            <div class="stat-item">
              <div class="stat-num">${stats.todayReview}</div>
              <div class="stat-label">今日待复习</div>
            </div>
          </div>
        </div>
    `;

    const exams = CET6Utils.loadJSON(CET6Utils.storageKeys.exams) || [];
    if (exams.length > 0) {
      html += `
        <div class="home-section">
          <div class="section-title">最近试卷</div>
          <div class="exam-cards">
      `;
      exams.forEach(exam => {
        const state = this._getExamState(exam.id);
        const doneCount = exam.availableModules.filter(m => state[m] && state[m].currentPhase).length;
        const totalCount = exam.availableModules.length;
        html += `
          <div class="exam-card" onclick="AppController.navTo('exam/${exam.id}')">
            <div class="exam-card-title">${exam.meta.title}</div>
            <div class="exam-card-meta">${exam.meta.examDate} · ${doneCount}/${totalCount} 模块完成</div>
            <div class="exam-card-modules">
              ${exam.availableModules.map(m => `<span class="module-tag ${m}">${CET6Utils.moduleLabels[m]}</span>`).join('')}
            </div>
          </div>
        `;
      });
      html += `
            <div class="exam-card import-card" onclick="AppController.navTo('import')">
              <div class="exam-card-title">➕ 导入新试卷</div>
              <div class="exam-card-meta">手动录入真题 → 开始训练</div>
            </div>
          </div>
        </div>
      `;
    } else {
      html += `
        <div class="home-empty">
          <div class="empty-icon">📄</div>
          <div class="empty-title">暂无试卷</div>
          <div class="empty-desc">点击下方按钮导入第一套六级真题</div>
          <button class="btn btn-accent" onclick="AppController.navTo('import')">导入新试卷</button>
        </div>
      `;
    }

    html += `
        <div class="home-section">
          <div class="section-title">🚀 快捷入口</div>
          <div class="quick-buttons">
            <button class="quick-btn" onclick="AppController.navTo('vocab')">📚 单词舱</button>
            ${exams.length > 0 ? `
              ${exams[0].availableModules.includes('reading') ? `<button class="quick-btn" onclick="AppController.navTo('player/reading/${exams[0].id}')">📖 传统阅读</button>` : ''}
              ${exams[0].availableModules.includes('matching') ? `<button class="quick-btn" onclick="AppController.navTo('player/matching/${exams[0].id}')">📋 长篇阅读</button>` : ''}
              ${exams[0].availableModules.includes('cloze') ? `<button class="quick-btn" onclick="AppController.navTo('player/cloze/${exams[0].id}')">✏️ 选词填空</button>` : ''}
            ` : `
              <button class="quick-btn" disabled>📖 传统阅读</button>
              <button class="quick-btn" disabled>📋 长篇阅读</button>
              <button class="quick-btn" disabled>✏️ 选词填空</button>
            `}
          </div>
        </div>
      </div>
    `;

    root.innerHTML = html;
  },

  _getExamState: function(examId) {
    const allStates = CET6Utils.loadJSON(CET6Utils.storageKeys.examsState) || {};
    return allStates[examId] || {};
  },

  _saveExamState: function(examId, module, state) {
    const allStates = CET6Utils.loadJSON(CET6Utils.storageKeys.examsState) || {};
    if (!allStates[examId]) allStates[examId] = {};
    allStates[examId][module] = state;
    CET6Utils.saveJSON(CET6Utils.storageKeys.examsState, allStates);
  },

  _renderImport: function() {
    const root = document.getElementById('app-root');
    const html = `
      <div class="import-page">
        ${CET6Shell.renderHeader('📥 导入新试卷', '手动填写真题内容 → 自动生成结构化数据', [
          { text: '取消', onClick: () => this.navTo('home') },
          { text: '提交', class: 'btn-accent', onClick: () => this._submitImport() }
        ]).outerHTML}
        <div class="import-content">
          <div class="import-section collapsed" id="section-basic">
            <div class="section-header" onclick="AppController._toggleSection('basic')">
              <span class="section-title">▎基本信息</span>
              <span class="toggle-icon">展开</span>
            </div>
            <div class="section-body" id="section-basic-body">
              <div class="form-row">
                <div class="form-group">
                  <label>年份</label>
                  <input type="text" id="form-year" placeholder="例如：2025" maxlength="4">
                </div>
                <div class="form-group">
                  <label>月份</label>
                  <input type="text" id="form-month" placeholder="例如：12" maxlength="2">
                </div>
                <div class="form-group">
                  <label>套号</label>
                  <input type="text" id="form-set" placeholder="例如：1" maxlength="1">
                </div>
              </div>
              <div class="form-group">
                <label>标题（可选）</label>
                <input type="text" id="form-title" placeholder="例如：2025年12月六级真题第1套">
              </div>
            </div>
          </div>

          <div class="import-section collapsed" id="section-reading">
            <div class="section-header" onclick="AppController._toggleSection('reading')">
              <span class="section-title">▎Section A：传统阅读</span>
              <span class="toggle-icon">展开</span>
            </div>
            <div class="section-body" id="section-reading-body">
              <div class="form-group">
                <label>文章原文（段落用空行分隔）</label>
                <textarea id="form-reading-passage" placeholder="粘贴文章全文，段落之间用一个空行分隔..."></textarea>
              </div>
              <div class="form-group">
                <label>题干 + 选项（格式：Q1. xxx 换行 A. xxx B. xxx C. xxx D. xxx）</label>
                <textarea id="form-reading-questions" placeholder="例如：
Q1. What does the author say about...
A. It can be beneficial...
B. It may cause...
C. It has changed...
D. It is...
                "></textarea>
              </div>
              <div class="form-group">
                <label>答案（例如：46.A 47.C 48.B 49.D 50.A）</label>
                <input type="text" id="form-reading-answers" placeholder="46.A 47.C 48.B 49.D 50.A">
              </div>
            </div>
          </div>

          <div class="import-section collapsed" id="section-matching">
            <div class="section-header" onclick="AppController._toggleSection('matching')">
              <span class="section-title">▎Section B：长篇阅读（匹配题）</span>
              <span class="toggle-icon">展开</span>
            </div>
            <div class="section-body" id="section-matching-body">
              <div class="form-group">
                <label>段落文本（段落用空行分隔）</label>
                <textarea id="form-matching-paragraphs" placeholder="每个段落占一块，段落之间用空行分隔..."></textarea>
              </div>
              <div class="form-group">
                <label>选项（每行一个选项）</label>
                <textarea id="form-matching-options" placeholder="每行开头带序号：1. xxxxxx"></textarea>
              </div>
              <div class="form-group">
                <label>答案（例如：1. 4 2. 6 → 选项号→段落号）</label>
                <input type="text" id="form-matching-answers" placeholder="1.A 2.C 3. ...（A=第一段）"></input>
              </div>
            </div>
          </div>

          <div class="import-section collapsed" id="section-cloze">
            <div class="section-header" onclick="AppController._toggleSection('cloze')">
              <span class="section-title">▎Section C：选词填空</span>
              <span class="toggle-icon">展开</span>
            </div>
            <div class="section-body" id="section-cloze-body">
              <div class="form-group">
                <label>文章原文（空位用 ___36___ 标记）</label>
                <textarea id="form-cloze-passage" placeholder="例如：When ___36___ comes to ..."></textarea>
              </div>
              <div class="form-group">
                <label>候选词（每行：字母. 单词 词性. 释义）</label>
                <textarea id="form-cloze-banks" placeholder="例如：
A. persist v. 坚持 维持
B. consistent adj. 一致的 连续的
                "></textarea>
              </div>
              <div class="form-group">
                <label>答案（例如：26.A 27.H ...）</label>
                <input type="text" id="form-cloze-answers" placeholder="26.A 27.H 28..."></input>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    root.innerHTML = html;
  },

  _toggleSection: function(id) {
    const section = document.getElementById('section-' + id);
    const body = document.getElementById('section-' + id + '-body');
    const icon = section.querySelector('.toggle-icon');
    if (section.classList.contains('collapsed')) {
      section.classList.remove('collapsed');
      icon.textContent = '收起';
    } else {
      section.classList.add('collapsed');
      icon.textContent = '展开';
    }
  },

  _parseReading: function(passageText, questionsText, answersText) {
    if (!passageText.trim() || !questionsText.trim() || !answersText.trim()) return null;

    const paragraphs = passageText.split(/\n\n+/).map(p => p.trim()).filter(p => p);

    const questionMatches = questionsText.match(/(?:^|\n)(?:Q\d+\.|[\dX]+\.)\s*([\s\S]*?)(?=(?:\n(?:Q\d+\.|[\dX]+\.)\s)|$)/g);
    const questions = [];
    let qid = 46;
    const processed = (questionMatches || []).map(qBlock => {
      qBlock = qBlock.trim();
      const firstLineBreak = qBlock.indexOf('\n');
      const questionText = firstLineBreak > 0 ? qBlock.slice(0, firstLineBreak).trim().replace(/^[\dX]+\.\s*/, '') : qBlock.trim().replace(/^[\dX]+\.\s*/, '');
      const optionsText = firstLineBreak > 0 ? qBlock.slice(firstLineBreak) : '';
      const options = [];
      const optionMatches = optionsText.match(/(?:^|\n)[A-D]\.\s*/g);
      if (optionMatches) {
        let lastIdx = 0;
        ['A.', 'B.', 'C.', 'D.'].forEach((opt, idx) => {
          const re = new RegExp('(?:^|\\n)' + opt + '\\s*');
          const match = re.exec(optionsText);
          if (match) {
            const start = match.index + match[0].length;
            let end;
            if (idx < 3) {
              const nextRe = new RegExp('(?:^|\\n)' + ['A.', 'B.', 'C.', 'D.'][idx + 1] + '\\s*');
              const nextMatch = nextRe.exec(optionsText);
              end = nextMatch ? nextMatch.index : optionsText.length;
            } else {
              end = optionsText.length;
            }
            const text = optionsText.slice(start, end).trim();
            options.push({ label: opt[0], text });
          }
        });
      }
      questions.push({
        id: qid++,
        text: questionText,
        options: options
      });
      return qBlock;
    });

    const answers = [];
    const answerRegex = /(\d+)[.\s]+([A-D])/gi;
    let match;
    while ((match = answerRegex.exec(answersText))) {
      answers.push({ id: parseInt(match[1]), correct: match[2] });
    }

    if (questions.length !== answers.length) {
      throw new Error(`题目数量(${questions.length})与答案数量(${answers.length})不匹配`);
    }

    return {
      meta: { type: 'reading' },
      passage: { paragraphs },
      questions: questions,
      answers: answers,
      phases: {
        phase1: { topicPrediction: null, questionTypes: null },
        phase2a: { instruction: { title: 'T1 全景扫描', content: '扫描题干 → 找关键词 → 判断题型' } },
        phase2b: { instruction: { title: 'T3 中心做题', content: '用找到的中心去匹配选项' } },
        phase2c: { instruction: { title: 'T4 定位 + T6 段落锁定 + T3 同义替换', content: '找到定位词 → 锁定段落' } },
        phase3: { title: '统一对答案' },
        phase4: { summary: { title: '文章复盘', content: '对照错题分析原因' } }
      }
    };
  },

  _parseMatching: function(paragraphsText, optionsText, answersText) {
    if (!paragraphsText.trim() || !optionsText.trim() || !answersText.trim()) return null;

    const paragraphs = paragraphsText.split(/\n\n+/).map((p, idx) => ({
      id: String.fromCharCode(65 + idx),
      text: p.trim()
    })).filter(p => p.text);

    const options = [];
    const lines = optionsText.split('\n').map(l => l.trim()).filter(l => l);
    lines.forEach(line => {
      const m = line.match(/^(\d+)[\.、]?\s*(.+)$/);
      if (m) {
        options.push({ id: parseInt(m[1]), text: m[2] });
      }
    });

    const answers = [];
    const answerRegex = /(\d+)[.\s]+([A-P])[.\s]+(\d+)/gi;
    let match;
    while ((match = answerRegex.exec(answersText))) {
      const paraId = String.fromCharCode(65 + (parseInt(match[3]) - 1));
      answers.push({ id: parseInt(match[1]), correctPara: paraId });
    }

    if (options.length !== 10) throw new Error(`长篇阅读应有10个选项，当前${options.length}个`);
    if (answers.length !== 10) throw new Error(`长篇阅读应有10个答案，当前${answers.length}个`);

    return {
      meta: { type: 'matching', timeLimit: 15 },
      passage: { paragraphs },
      options: options,
      answers: answers,
      phases: {
        phase1: { instruction: { title: 'Phase 1', content: '选项扫读 → 识别定位词' } },
        phase2: { instruction: { title: 'Phase 2', content: '带着定位词找匹配' } },
        phase3: { title: '对答案' },
        phase4: { summary: { title: '定位词分析', content: '对比自己标记与正确定位词' } }
      },
      overallAnalysis: ''
    };
  },

  _parseCloze: function(passageText, banksText, answersText) {
    if (!passageText.trim() || !banksText.trim() || !answersText.trim()) return null;

    const blankRegex = /___(\d+)___/g;
    const blanks = [];
    let m;
    while ((m = blankRegex.exec(passageText))) {
      blanks.push(parseInt(m[1]));
    }

    const banks = [];
    const lines = banksText.split('\n').map(l => l.trim()).filter(l => l);
    lines.forEach(line => {
      const m = line.match(/^([A-O])\.?\s*(\w+)\s*([a-z][a-z]\.?)\s*(.+)$/i);
      if (m) {
        banks.push({
          letter: m[1],
          word: m[2],
          pos: m[3],
          meaning: m[4]
        });
      }
    });

    if (banks.length !== 15) throw new Error(`选词填空应有15个候选词，当前${banks.length}个`);

    const answers = [];
    const answerRegex = /(\d+)[.\s]+([A-O])/gi;
    while ((match = answerRegex.exec(answersText))) {
      const bank = banks.find(b => b.letter === match[2]);
      answers.push({
        blank: parseInt(match[1]),
        correct: match[2],
        word: bank ? bank.word : ''
      });
    }

    if (blanks.length !== 10) throw new Error(`选词填空应有10个空位，当前${blanks.length}个`);
    if (answers.length !== 10) throw new Error(`选词填空应有10个答案，当前${answers.length}个`);

    const paragraphs = [];
    const paraBlocks = passageText.split(/\n\n+/);
    paraBlocks.forEach(block => {
      paragraphs.push(block.trim());
    });

    return {
      meta: { type: 'cloze' },
      passage: { paragraphs, blanks },
      banks: banks,
      answers: answers,
      wordAnalysis: [],
      phases: {
        phase1: { instruction: '浏览全文 → 选词填空 → 词性分类缩小范围' },
        phase2: { title: '对答案' },
        phase3: { title: '单词舱' }
      }
    };
  },

  _generateClozeWordAnalysis: function(clozeData, rootRules) {
    clozeData.banks.forEach(bank => {
      const analysis = this._analyzeRoot(bank.word, rootRules);
      bank.rootPrefix = analysis.prefix;
      bank.rootExplanation = analysis.explanation;
    });
    clozeData.wordAnalysis = clozeData.banks.map(b => ({
      word: b.word,
      pos: b.pos,
      meaning: b.meaning,
      rootPrefix: b.rootPrefix,
      rootExplanation: b.rootExplanation,
      cognates: [],
      examSentence: '',
      mnemonic: '',
      collocations: []
    }));
    return clozeData;
  },

  _analyzeRoot: function(word, rules) {
    let bestMatch = null;
    let maxLen = 0;
    for (const suffix in rules) {
      if (word.endsWith(suffix) && suffix.length > maxLen) {
        maxLen = suffix.length;
        bestMatch = rules[suffix];
      }
    }
    if (bestMatch) {
      return {
        prefix: word.slice(0, -maxLen) + '-' + bestMatch.suffix,
        explanation: bestMatch.meaning
      };
    }
    return { prefix: '', explanation: '' };
  },

  _generateClozeGuides: function(clozeData) {
    clozeData.answers.forEach(ans => {
    });
    return clozeData;
  },

  _extractVocabToGlobal: function(exam) {
    if (exam.modules.cloze && exam.modules.cloze.wordAnalysis) {
      exam.modules.cloze.wordAnalysis.forEach(wa => {
        if (wa.word && !window._app.vocab.has(wa.word)) {
          const source = exam.id + ' ' + CET6Utils.moduleLabels.cloze;
          window._app.vocab.addRich(wa.word, {
            pos: wa.pos,
            meaning: wa.meaning,
            source: source,
            rootPrefix: wa.rootPrefix,
            rootExplanation: wa.rootExplanation,
            cognates: wa.cognates || [],
            examSentence: wa.examSentence || '',
            mnemonic: wa.mnemonic || '',
            collocations: wa.collocations || []
          });
        }
      });
    }
  },

  _getRootRules: function() {
    return {
      'tion': { suffix: '-tion', meaning: '名词后缀，表示动作、状态' },
      'sion': { suffix: '-sion', meaning: '名词后缀，表示动作、状态' },
      'ment': { suffix: '-ment', meaning: '名词后缀，表示行为、结果' },
      'ness': { suffix: '-ness', meaning: '名词后缀，表示性质、状态' },
      'ity': { suffix: '-ity', meaning: '名词后缀，表示性质' },
      'ty': { suffix: '-ty', meaning: '名词后缀' },
      'al': { suffix: '-al', meaning: '形容词/名词后缀' },
      'able': { suffix: '-able', meaning: '形容词后缀，表示可...的' },
      'ible': { suffix: '-ible', meaning: '形容词后缀，表示可...的' },
      'ive': { suffix: '-ive', meaning: '形容词后缀' },
      'ous': { suffix: '-ous', meaning: '形容词后缀，表示多...的' },
      'ful': { suffix: '-ful', meaning: '形容词后缀，表示充满...的' },
      'less': { suffix: '-less', meaning: '形容词后缀，表示无...的' },
      'ly': { suffix: '-ly', meaning: '副词/形容词后缀' },
      'ify': { suffix: '-ify', meaning: '动词后缀，表示使...' },
      'ize': { suffix: '-ize', meaning: '动词后缀，表示使...化' },
      'ise': { suffix: '-ise', meaning: '动词后缀，表示使...化' },
      'ing': { suffix: '-ing', meaning: '现在分词/动名词后缀' },
      'ed': { suffix: '-ed', meaning: '过去分词/形容词后缀' },
      'er': { suffix: '-er', meaning: '名词/动词后缀，表示人或物' },
      'or': { suffix: '-or', meaning: '名词后缀，表示人' },
      'tion': { suffix: '-tion', meaning: '名词后缀' },
      'ic': { suffix: '-ic', meaning: '形容词后缀' },
      'ical': { suffix: '-ical', meaning: '形容词后缀' },
      'ant': { suffix: '-ant', meaning: '形容词/名词后缀' },
      'ent': { suffix: '-ent', meaning: '形容词/名词后缀' },
      'ance': { suffix: '-ance', meaning: '名词后缀' },
      'ence': { suffix: '-ence', meaning: '名词后缀' },
      'age': { suffix: '-age', meaning: '名词后缀' },
      'ship': { suffix: '-ship', meaning: '名词后缀，表示状态、身份' },
      'hood': { suffix: '-hood', meaning: '名词后缀，表示时期' },
      'dom': { suffix: '-dom', meaning: '名词后缀，表示领域' }
    };
  },

  _submitImport: function() {
    const year = document.getElementById('form-year').value.trim();
    const month = document.getElementById('form-month').value.trim();
    const setNum = document.getElementById('form-set').value.trim();
    const title = document.getElementById('form-title').value.trim();

    if (!year || !month || !setNum) {
      alert('请填写年份、月份、套号');
      return;
    }

    const examId = CET6Utils.examIdFromParts(year, month, setNum);
    const examTitle = title || `${year}年${parseInt(month)}月六级真题第${setNum}套`;

    const modules = {};
    const available = [];

    const readingPassage = document.getElementById('form-reading-passage').value.trim();
    const readingQuestions = document.getElementById('form-reading-questions').value.trim();
    const readingAnswers = document.getElementById('form-reading-answers').value.trim();
    if (readingPassage && readingQuestions && readingAnswers) {
      try {
        modules.reading = this._parseReading(readingPassage, readingQuestions, readingAnswers);
        available.push('reading');
      } catch (e) {
        alert('传统阅读解析失败: ' + e.message);
        return;
      }
    }

    const matchingPara = document.getElementById('form-matching-paragraphs').value.trim();
    const matchingOpts = document.getElementById('form-matching-options').value.trim();
    const matchingAns = document.getElementById('form-matching-answers').value.trim();
    if (matchingPara && matchingOpts && matchingAns) {
      try {
        modules.matching = this._parseMatching(matchingPara, matchingOpts, matchingAns);
        available.push('matching');
      } catch (e) {
        alert('长篇阅读解析失败: ' + e.message);
        return;
      }
    }

    const clozePassage = document.getElementById('form-cloze-passage').value.trim();
    const clozeBanks = document.getElementById('form-cloze-banks').value.trim();
    const clozeAns = document.getElementById('form-cloze-answers').value.trim();
    if (clozePassage && clozeBanks && clozeAns) {
      try {
        modules.cloze = this._parseCloze(clozePassage, clozeBanks, clozeAns);
        const rootRules = this._getRootRules();
        modules.cloze = this._generateClozeWordAnalysis(modules.cloze, rootRules);
        available.push('cloze');
      } catch (e) {
        alert('选词填空解析失败: ' + e.message);
        return;
      }
    }

    if (available.length === 0) {
      alert('至少填写一个模块才能提交');
      return;
    }

    const exam = {
      id: examId,
      meta: {
        examDate: `${year}年${parseInt(month)}月`,
        level: 'CET6',
        title: examTitle,
        importedAt: new Date().toISOString()
      },
      modules: modules,
      availableModules: available
    };

    const exams = CET6Utils.loadJSON(CET6Utils.storageKeys.exams) || [];
    const existingIndex = exams.findIndex(e => e.id === examId);
    if (existingIndex >= 0) {
      if (!confirm(`ID为 ${examId} 的试卷已存在，是否覆盖？`)) return;
      exams[existingIndex] = exam;
    } else {
      exams.unshift(exam);
    }
    CET6Utils.saveJSON(CET6Utils.storageKeys.exams, exams);

    this.navTo('processing/' + examId);
  },

  _renderProcessing: function(examId) {
    const root = document.getElementById('app-root');
    const steps = [
      { name: '数据校验通过', done: true },
      { name: 'JSON 序列化完成', done: false },
      { name: '词根词缀分析生成', done: false },
      { name: '做题引导分析生成', done: false },
      { name: '生词提取入库', done: false },
      { name: '最终校验完成', done: false }
    ];

    let html = `
      <div class="processing-page">
        <div class="processing-card card">
          <div class="processing-title">⏳ 正在处理试卷...</div>
          <div class="progress-bar">
            <div class="ok" style="width: ${100 * steps.filter(s => s.done).length / steps.length}%"></div>
          </div>
          <div class="processing-steps" id="processing-steps">
    `;
    steps.forEach(s => {
      html += `<div class="processing-step ${s.done ? 'done' : ''}">${s.done ? '✅' : '🔄'} ${s.name}</div>`;
    });
    html += `
          </div>
        </div>
      </div>
    `;
    root.innerHTML = html;

    const exam = this._loadExam(examId);
    const stepsEl = document.getElementById('processing-steps');
    const progressBar = document.querySelector('.processing-page .progress-bar .ok');

    let stepIndex = 1;
    const processNextStep = () => {
      if (stepIndex >= steps.length) {
        this._extractVocabToGlobal(exam);
        setTimeout(() => this.navTo('exam/' + examId), 300);
        return;
      }

      requestAnimationFrame(() => {
        steps[stepIndex].done = true;
        stepsEl.innerHTML = steps.map(s =>
          `<div class="processing-step ${s.done ? 'done' : ''}">${s.done ? '✅' : '🔄'} ${s.name}</div>`
        ).join('');
        progressBar.style.width = (100 * steps.filter(s => s.done).length / steps.length) + '%';
        stepIndex++;
        setTimeout(processNextStep, 200);
      });
    };

    setTimeout(processNextStep, 200);
  },

  _renderExamDetail: function(examId) {
    this.currentExamId = examId;
    const exam = this._loadExam(examId);
    if (!exam) {
      alert('试卷不存在');
      this.navTo('home');
      return;
    }

    const state = this._getExamState(examId);
    const root = document.getElementById('app-root');

    let html = `
      <div class="exam-detail">
        ${CET6Shell.renderHeader(exam.meta.title, exam.meta.examDate, [
          { text: '← 返回首页', onClick: () => this.navTo('home') }
        ]).outerHTML}
        <div class="exam-detail-content">
          <div class="exam-modules">
    `;

    exam.availableModules.forEach(module => {
      const label = CET6Utils.moduleLabels[module];
      const modState = state[module] || {};
      const doneCount = modState.currentPhase ? 1 : 0;
      html += `
        <div class="module-card ${module}" onclick="AppController.navTo('player/${module}/${examId}')">
          <div class="module-card-title">${label}</div>
          <div class="module-card-status">${modState.currentPhase ? '已开始' : '未开始'}</div>
        </div>
      `;
    });

    html += `
          </div>
        </div>
      </div>
    `;

    root.innerHTML = html;
  },

  _renderPlayer: function(type, examId) {
    this.currentExamId = examId;
    this.currentModule = type;

    const exam = this._loadExam(examId);
    if (!exam || !exam.modules[type]) {
      alert('模块不存在');
      this.navTo('home');
      return;
    }

    const data = exam.modules[type];
    const root = document.getElementById('app-root');
    const container = CET6Utils.el('div', { id: 'app-player-container' });

    this.vocab = this.vocab || new CET6VocabEngine();
    this.currentVocab = new CET6Vocab(examId, type);
    this.currentAnnotate = new CET6Annotate(examId, type);

    let tabs;
    let extraButtons = [];
    let panels = [
      { title: '生词本', type: 'vocab', countId: 'vocab-count', contentId: 'vocab-list', emptyText: '选中任意单词 → 弹出"加入生词本"' },
      { title: '划线标注', type: 'annotate', countId: 'annotate-count', contentId: 'annotate-list', emptyText: '选中文字 → 点击"划线标注"' }
    ];

    if (type === 'reading') {
      tabs = [
        { label: 'Phase 1', id: '1', badge: '扫描' },
        { label: 'Phase 2a', id: '2a', badge: '首尾定中心' },
        { label: 'Phase 2b', id: '2b', badge: '中心做题' },
        { label: 'Phase 2c', id: '2c', badge: '定位精读' },
        { label: 'Phase 3', id: '3', badge: '对答案' },
        { label: 'Phase 4', id: '4', badge: '复盘' }
      ];
    } else if (type === 'matching') {
      this.currentLocateWord = new CET6LocateWord(examId + '-' + type);
      panels.push({ title: '📍 定位词', type: 'locateword', countId: 'locateword-count', contentId: 'locateword-list', emptyText: '选中单词 → 点击"标记为定位词"' });
      extraButtons.push({ label: '🖍 定位词', class: 'btn-locateword', id: 'popup-btn-locate', onClick: this._handleAddLocateWord.bind(this) });
      tabs = [
        { label: 'Phase 1', id: '1', badge: '选项扫读' },
        { label: 'Phase 2', id: '2', badge: '计时定位' },
        { label: 'Phase 3', id: '3', badge: '对答案' },
        { label: 'Phase 4', id: '4', badge: '复盘' }
      ];
    } else if (type === 'cloze') {
      tabs = [
        { label: '① 做题', id: '1', badge: '' },
        { label: '② 对答案', id: '2', badge: '' },
        { label: '③ 单词舱', id: '3', badge: '' }
      ];
    }

    const headerActions = [
      { text: this.currentVocab.count() + ' 词', class: '' },
      { text: '导出 .md', onClick: () => this.currentVocab.exportMarkdown(exam.meta.title + '生词本') },
      { text: '清空', class: 'btn-danger', onClick: () => this.currentVocab.clear() },
      { text: '← 返回', onClick: () => this.navTo('exam/' + examId) }
    ];

    container.appendChild(CET6Shell.renderHeader(exam.meta.title, CET6Utils.moduleLabels[type], headerActions));
    container.appendChild(CET6Shell.renderTabs(tabs, 0, (idx, id) => this.currentEngine.switchPhase(id)));

    if (type === 'matching') {
      container.appendChild(CET6Utils.el('div', { id: 'timer-bar', className: 'timer-bar', style: 'display:none;' }, [
        CET6Utils.el('span', { id: 'timer-display', className: 'timer-main' }, '15:00'),
        CET6Utils.el('div', { id: 'timer-info', className: 'timer-info' }, [
          CET6Utils.el('span', { id: 'timer-info-text' }, '总时长 15分钟 · 每题不超过 60秒 · 目标 7-8 道'),
          CET6Utils.el('span', { id: 'timer-segments', style: 'margin-left:12px;font-size:11px;color:var(--text3);' }, '')
        ]),
        CET6Utils.el('div', { className: 'timer-actions' }, [
          CET6Utils.el('button', { className: 'btn', id: 'btn-stop-timer', textContent: '停止计时', onclick: () => this.currentEngine.stopTimer() }),
          CET6Utils.el('button', { className: 'btn', id: 'btn-start-timer', style: 'display:none;', textContent: '继续计时', onclick: () => this.currentEngine.startTimer() })
        ])
      ]));
    }

    const main = CET6Utils.el('div', { className: 'main' });
    const content = CET6Utils.el('div', { className: 'content', id: 'main-content' });
    content.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text2);">初始化...</div>';
    main.appendChild(content);
    main.appendChild(CET6Shell.renderSidebar(panels));
    container.appendChild(main);
    container.appendChild(CET6Shell.renderPopup(extraButtons));

    root.appendChild(container);

    CET6Shell.initSelection(
      (text, paraIdx) => this._handleAddVocab(text, paraIdx),
      (text, paraIdx, note) => this._handleAddAnnotate(text, paraIdx, note),
      (text, paraIdx, note) => this._handleAddUnderline(text, paraIdx, note),
      { locateword: this._handleAddLocateWord.bind(this) }
    );

    if (type === 'reading') {
      this.currentEngine = new CET6Engine(data, this.currentVocab, this.currentAnnotate, examId);
    } else if (type === 'matching') {
      this.currentEngine = new CET6LongReadEngine(data, this.currentVocab, this.currentAnnotate, this.currentLocateWord, examId);
    } else if (type === 'cloze') {
      this.currentEngine = new CET6ClozeEngine(data, this.currentVocab, this.currentAnnotate, examId);
    }

    this.currentEngine.init('#main-content');
    window._engine = this.currentEngine;
    window._vocab = this.currentVocab;

    if (type === 'matching') {
      const origStop = this.currentEngine.stopTimer.bind(this.currentEngine);
      const origStart = this.currentEngine.startTimer.bind(this.currentEngine);
      this.currentEngine.stopTimer = function() {
        origStop();
        document.getElementById('btn-stop-timer').style.display = 'none';
        document.getElementById('btn-start-timer').style.display = '';
      };
      this.currentEngine.startTimer = function() {
        origStart();
        document.getElementById('btn-stop-timer').style.display = '';
        document.getElementById('btn-start-timer').style.display = 'none';
      };
    }

    this.currentAnnotate.onChange = () => {
      this.currentEngine.updateSidebar();
      this.currentEngine.reRenderCurrentPhase();
    };
    this.currentVocab.onChange = () => {
      this.currentEngine.updateSidebar();
    };
    if (this.currentLocateWord) {
      this.currentLocateWord.onChange = () => {
        this.currentEngine.updateSidebar();
      };
    }
  },

  _handleAddVocab: function(text, paraIdx) {
    if (this.currentVocab) {
      const activeTab = document.querySelector('.tab.active');
      let source = this.currentModule;
      if (activeTab) source += ' ' + activeTab.dataset.phase;
      this.currentVocab.add(text, source);
      this.currentEngine.updateSidebar();
    }
  },

  _handleAddAnnotate: function(text, paraIdx, note) {
    if (this.currentAnnotate) {
      this.currentAnnotate.add(text, paraIdx, note);
      this.currentEngine.reRenderCurrentPhase();
      this.currentEngine.updateSidebar();
    }
  },

  _handleAddUnderline: function(text, paraIdx, note) {
    if (this.currentAnnotate) {
      this.currentAnnotate.add(text, paraIdx, '');
      this.currentEngine.reRenderCurrentPhase();
      this.currentEngine.updateSidebar();
    }
  },

  _handleAddLocateWord: function(text, paraIdx) {
    if (this.currentEngine && this.currentEngine.currentFocus) {
      this.currentEngine.addLocateWord(this.currentEngine.currentFocus, text);
      this.currentLocateWord.applyToDOM();
    }
  },

  _renderVocab: function() {
    this.currentVocab = null;
    this.currentEngine = null;
    this.currentAnnotate = null;
    this.currentLocateWord = null;

    const root = document.getElementById('app-root');
    const container = CET6Utils.el('div', { className: 'vocab-page' });

    const statsBar = CET6Utils.el('div', { id: 'stats-bar', className: 'stats-bar' });
    const statsSummary = CET6Utils.el('div', { id: 'stats-summary', className: 'vocab-summary' });

    container.appendChild(CET6Shell.renderHeader('六级单词舱', '记忆系统 · 艾宾浩斯 · 词根词缀', [
      { text: '导出', onClick: () => this._exportAllVocab() },
      { text: '← 返回首页', onClick: () => this.navTo('home') }
    ]));

    container.appendChild(statsBar);
    container.appendChild(statsSummary);
    container.appendChild(CET6Shell.renderTabs([
      { label: '📖 单词本', id: 'list' },
      { label: '🔄 艾宾浩斯', id: 'ebbinghaus' },
      { label: '🧠 自测', id: 'quiz' },
      { label: '📊 进度', id: 'progress' }
    ], 0, (idx, id) => this.vocab.switchTab(id)));

    const main = CET6Utils.el('div', { className: 'main' });
    const content = CET6Utils.el('div', { className: 'content', id: 'main-content' });
    main.appendChild(content);
    container.appendChild(main);

    root.appendChild(container);

    this.vocab = new CET6VocabEngine();
    window.engine = this.vocab;
    this.vocab.init('#main-content');
  },

  _exportAllVocab: function() {
    const engine = new CET6VocabEngine();
    const list = engine.getAll();
    if (list.length === 0) {
      alert('生词本为空！');
      return;
    }
    let md = '# 六级单词舱 · 生词本\n\n| 单词 | 词性 | 释义 | 掌握度 | 来源 | 下次复习 |\n|:--|:--|:--|:--|:--|:--|\n';
    const masteryLabels = ['新词', '见过', '模糊', '基本掌握', '熟悉', '已掌握'];
    list.forEach(function(w) {
      const n = engine._normalize(w);
      md += '| ' + n.word + ' | ' + (n.pos || '-') + ' | ' + (n.meaning || '-') + ' | ' + masteryLabels[n.mastery] + ' | ' + (n.source ? (Array.isArray(n.sources) ? n.sources.join(', ') : n.source) : '-') + ' | ' + (n.nextReview || '-') + ' |\n';
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
    a.download = '单词舱_' + new Date().toISOString().slice(0, 10) + '.md';
    a.click();
  },

  init: function() {
    this._migrateExistingData();
    window._app = this;
    const self = this;
    window.addEventListener('hashchange', function() {
      const route = self.getRouteFromHash();
      self._dispatchRoute(route);
    });
    const route = this.getRouteFromHash();
    this._dispatchRoute(route);
  }
};

document.addEventListener('DOMContentLoaded', function() {
  AppController.init();
});
