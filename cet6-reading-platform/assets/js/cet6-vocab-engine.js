class CET6VocabEngine {
  constructor() {
    this.storageKey = 'cet6-vocab';
    this.ebbinghausIntervals = [1, 3, 7, 15, 30];
    this.currentTab = 'list';
    this.targetEl = null;
    this.quizData = null;
    this.quizIndex = 0;
    this.quizMode = 'en2cn';
    this.quizResults = [];
    this.filterPos = '';
    this.filterQuery = '';
    this.selectedStage = -1;
  }

  getAll() {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey) || '[]');
    } catch (e) {
      return [];
    }
  }

  _save(list) {
    localStorage.setItem(this.storageKey, JSON.stringify(list));
  }

  _normalize(item) {
    return {
      word: item.word || '',
      source: item.source || '',
      time: item.time || '',
      pos: item.pos || '',
      meaning: item.meaning || '',
      rootPrefix: item.rootPrefix || '',
      rootExplanation: item.rootExplanation || '',
      cognates: item.cognates || [],
      examSentence: item.examSentence || '',
      mnemonic: item.mnemonic || '',
      collocations: item.collocations || [],
      mastery: item.mastery != null ? item.mastery : 0,
      reviewStage: item.reviewStage != null ? item.reviewStage : 0,
      nextReview: item.nextReview || null,
      addedAt: item.addedAt || (item.time ? item.time.split(' ')[0] : this._today()),
      history: item.history || []
    };
  }

  _today() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  getTodayReview() {
    const today = this._today();
    return this.getAll().filter(w => {
      const n = this._normalize(w);
      return n.nextReview && n.nextReview <= today && n.mastery < 5;
    }).map(w => this._normalize(w));
  }

  getByStage(stage) {
    return this.getAll().filter(w => this._normalize(w).reviewStage === stage).map(w => this._normalize(w));
  }

  getBySource(source) {
    return this.getAll().filter(w => this._normalize(w).source === source).map(w => this._normalize(w));
  }

  getByPos(pos) {
    return this.getAll().filter(w => this._normalize(w).pos === pos).map(w => this._normalize(w));
  }

  getByMastery(mastery) {
    return this.getAll().filter(w => this._normalize(w).mastery === mastery).map(w => this._normalize(w));
  }

  search(query) {
    const q = query.toLowerCase();
    return this.getAll().filter(w => {
      const n = this._normalize(w);
      return n.word.toLowerCase().includes(q) ||
             n.meaning.includes(q) ||
             (n.rootPrefix && n.rootPrefix.toLowerCase().includes(q)) ||
             (n.cognates && n.cognates.some(c => c.toLowerCase().includes(q)));
    }).map(w => this._normalize(w));
  }

  markReview(word, result) {
    const list = this.getAll();
    const idx = list.findIndex(w => w.word === word);
    if (idx < 0) return;
    const n = this._normalize(list[idx]);
    const today = this._today();
    n.history.push({ date: today, result: result });
    if (result === 'remember') {
      n.mastery = Math.min(5, n.mastery + 1);
      n.reviewStage = Math.min(5, n.reviewStage + 1);
      n.nextReview = this.getNextReviewDate(n.reviewStage - 1);
    } else if (result === 'fuzzy') {
      n.nextReview = this.getNextReviewDate(-1);
    } else {
      n.mastery = Math.max(0, n.mastery - 1);
      n.reviewStage = 0;
      n.nextReview = this.getNextReviewDate(-1);
    }
    list[idx] = n;
    this._save(list);
  }

  getNextReviewDate(stage) {
    const d = new Date();
    if (stage < 0) {
      d.setDate(d.getDate() + 1);
    } else if (stage < this.ebbinghausIntervals.length) {
      d.setDate(d.getDate() + this.ebbinghausIntervals[stage]);
    } else {
      d.setDate(d.getDate() + 30);
    }
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  getStats() {
    const all = this.getAll().map(w => this._normalize(w));
    const today = this._today();
    return {
      total: all.length,
      mastered: all.filter(w => w.mastery >= 5).length,
      learning: all.filter(w => w.mastery > 0 && w.mastery < 5).length,
      new: all.filter(w => w.mastery === 0).length,
      todayReview: all.filter(w => w.nextReview && w.nextReview <= today && w.mastery < 5).length
    };
  }

  getSourceStats() {
    const all = this.getAll().map(w => this._normalize(w));
    const stats = {};
    all.forEach(w => {
      const src = w.source || '未知来源';
      if (!stats[src]) stats[src] = 0;
      stats[src]++;
    });
    return stats;
  }

  getCalendarData() {
    const all = this.getAll().map(w => this._normalize(w));
    const data = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      data[key] = 0;
    }
    all.forEach(w => {
      if (w.history) {
        w.history.forEach(h => {
          if (data[h.date] !== undefined) data[h.date]++;
        });
      }
    });
    return data;
  }

  generateQuiz(mode, count) {
    const all = this.getAll().map(w => this._normalize(w));
    if (all.length < 4) return [];
    const shuffled = all.slice().sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(count || 10, all.length));
    const quizzes = [];

    selected.forEach((w, i) => {
      const others = all.filter(x => x.word !== w.word).sort(() => Math.random() - 0.5).slice(0, 3);
      if (mode === 'en2cn') {
        const options = [w.meaning, ...others.map(o => o.meaning || o.word)].sort(() => Math.random() - 0.5);
        const correctIndex = options.indexOf(w.meaning);
        quizzes.push({ question: w.word, hint: w.pos, options: options, correctIndex: correctIndex, word: w.word });
      } else if (mode === 'cn2en') {
        const options = [w.word, ...others.map(o => o.word)].sort(() => Math.random() - 0.5);
        const correctIndex = options.indexOf(w.word);
        quizzes.push({ question: w.meaning, hint: w.pos, options: options, correctIndex: correctIndex, word: w.word });
      } else if (mode === 'spell') {
        quizzes.push({ question: w.meaning, hint: w.pos, answer: w.word, word: w.word });
      }
    });

    return quizzes;
  }

  init(targetSelector) {
    this.targetEl = document.querySelector(targetSelector);
    if (!this.targetEl) return;
    this._renderStatsBar();
    this.switchTab('list');
  }

  switchTab(tab) {
    this.currentTab = tab;
    document.querySelectorAll('#tabs .tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tab);
    });
    if (!this.targetEl) return;
    this.targetEl.innerHTML = '';
    if (tab === 'list') this._renderList();
    else if (tab === 'ebbinghaus') this._renderEbbinghaus();
    else if (tab === 'quiz') this._renderQuiz();
    else if (tab === 'progress') this._renderProgress();
  }

  _renderStatsBar() {
    const stats = this.getStats();
    const bar = document.getElementById('stats-bar');
    if (!bar) return;
    bar.innerHTML = `
      <div class="stats-item"><div class="num">${stats.total}</div><div class="label">总单词</div></div>
      <div class="stats-item mastered"><div class="num">${stats.mastered}</div><div class="label">已掌握</div></div>
      <div class="stats-item review"><div class="num">${stats.todayReview}</div><div class="label">待复习</div></div>
      <div class="stats-item unknown"><div class="num">${stats.new}</div><div class="label">不认识</div></div>
    `;
    const summary = document.getElementById('stats-summary');
    if (summary) summary.textContent = `共 ${stats.total} 词 · 已掌握 ${stats.mastered} · 今日待复习 ${stats.todayReview}`;
  }

  _renderList() {
    let all = this.getAll().map(w => this._normalize(w));
    if (this.filterPos) all = all.filter(w => w.pos === this.filterPos);
    if (this.filterQuery) all = this.search(this.filterQuery);

    let html = `<div class="vocab-filter">
      <input type="text" placeholder="搜索单词/释义..." value="${this.filterQuery}" oninput="engine._onFilterInput(this.value)">
      <div class="filter-btns">
        <div class="filter-btn ${!this.filterPos ? 'active' : ''}" onclick="engine._setPosFilter('')">全部</div>
        <div class="filter-btn ${this.filterPos === 'n.' ? 'active' : ''}" onclick="engine._setPosFilter('n.')">名词</div>
        <div class="filter-btn ${this.filterPos === 'v.' ? 'active' : ''}" onclick="engine._setPosFilter('v.')">动词</div>
        <div class="filter-btn ${this.filterPos === 'adj.' ? 'active' : ''}" onclick="engine._setPosFilter('adj.')">形容词</div>
        <div class="filter-btn ${this.filterPos === 'adv.' ? 'active' : ''}" onclick="engine._setPosFilter('adv.')">副词</div>
      </div>
    </div>`;

    if (all.length === 0) {
      html += `<div class="vocab-empty-state"><div class="empty-icon">📚</div>暂无单词，去阅读中划词添加吧</div>`;
    } else {
      html += `<div class="vocab-list">`;
      all.forEach(w => { html += this._renderWordCard(w); });
      html += `</div>`;
    }

    this.targetEl.innerHTML = html;
  }

  _renderWordCard(w) {
    const masteryLabels = ['新词', '见过', '模糊', '基本掌握', '熟悉', '已掌握'];
    const segs = [];
    for (let i = 0; i < 5; i++) {
      let cls = 'mastery-seg';
      if (i < w.mastery) {
        cls += w.mastery <= 2 ? ' filled partial' : ' filled';
      }
      segs.push(`<div class="${cls}"></div>`);
    }

    let rootHtml = '';
    if (w.rootPrefix) {
      const parts = w.rootPrefix.split(/\s*\+\s*/);
      rootHtml = `<div class="root-section">
        <div class="root-title">词根词缀</div>
        <div class="root-visual">`;
      parts.forEach((p, i) => {
        const trimmed = p.trim();
        if (!trimmed) return;
        let cls = 'root';
        if (i === 0 && trimmed.match(/^-/)) cls = 'prefix';
        else if (i === parts.length - 1 && trimmed.match(/-$/)) cls = 'suffix';
        else if (i === 0) cls = 'prefix';
        else if (i === parts.length - 1) cls = 'suffix';
        if (i > 0) rootHtml += `<span class="root-sep">+</span>`;
        rootHtml += `<span class="root-part ${cls}">${trimmed}</span>`;
      });
      rootHtml += `</div>`;
      if (w.rootExplanation) rootHtml += `<div class="root-explanation">${w.rootExplanation}</div>`;
      rootHtml += `</div>`;
    }

    let cognateHtml = '';
    if (w.cognates && w.cognates.length > 0) {
      cognateHtml = `<div class="cognate-tags">${w.cognates.map(c => `<span class="cognate-tag">${c}</span>`).join('')}</div>`;
    }

    let sentenceHtml = '';
    if (w.examSentence) {
      sentenceHtml = `<div class="sentence-section"><div class="section-label">真题原句</div>${w.examSentence}</div>`;
    }

    let collocationHtml = '';
    if (w.collocations && w.collocations.length > 0) {
      collocationHtml = `<div class="collocation-section"><div class="section-label">搭配</div>${w.collocations.map(c => `<span class="collocation-item">${c}</span>`).join('')}</div>`;
    }

    let mnemonicHtml = '';
    if (w.mnemonic) {
      mnemonicHtml = `<div class="mnemonic-section"><span class="section-label">联想记忆</span>${w.mnemonic}</div>`;
    }

    return `<div class="vocab-word-card">
      <div class="word-header">
        <span class="word-text">${w.word}</span>
        ${w.pos ? `<span class="word-pos">${w.pos}</span>` : ''}
        ${w.meaning ? `<span class="word-meaning">${w.meaning}</span>` : ''}
        ${w.source ? `<span class="word-source">${w.source}</span>` : ''}
      </div>
      ${rootHtml}
      ${cognateHtml}
      ${sentenceHtml}
      ${collocationHtml}
      ${mnemonicHtml}
      <div class="mastery-bar">${segs.join('')}</div>
      <div style="font-size:11px;color:var(--text2);margin-bottom:8px;">${masteryLabels[w.mastery] || '新词'}${w.nextReview ? ' · 下次复习 ' + w.nextReview : ''}</div>
      <div class="action-btns">
        <button class="action-btn btn-mastered" onclick="engine._markWord('${w.word}','remember')">✓ 已掌握</button>
        <button class="action-btn btn-forgot" onclick="engine._markWord('${w.word}','forgot')">✕ 不认识</button>
        <button class="action-btn btn-review" onclick="engine._addToReview('${w.word}')">🔄 加入复习</button>
      </div>
    </div>`;
  }

  _onFilterInput(val) {
    this.filterQuery = val;
    this._renderList();
  }

  _setPosFilter(pos) {
    this.filterPos = pos;
    this._renderList();
  }

  _markWord(word, result) {
    this.markReview(word, result);
    this._renderStatsBar();
    this.switchTab(this.currentTab);
  }

  _addToReview(word) {
    const list = this.getAll();
    const idx = list.findIndex(w => w.word === word);
    if (idx < 0) return;
    const n = this._normalize(list[idx]);
    if (!n.nextReview) {
      n.nextReview = this._today();
      list[idx] = n;
      this._save(list);
    }
    this._renderStatsBar();
    this.switchTab(this.currentTab);
  }

  _renderEbbinghaus() {
    const all = this.getAll().map(w => this._normalize(w));
    const today = this._today();
    const stageData = [];
    const labels = ['第1天', '第3天', '第7天', '第15天', '第30天', '已掌握'];

    for (let s = 0; s < 5; s++) {
      const count = all.filter(w => w.reviewStage === s && w.mastery < 5).length;
      const reviewDate = this._getDateAfterDays(this.ebbinghausIntervals[s]);
      stageData.push({ stage: s, count: count, label: labels[s], day: '第' + this.ebbinghausIntervals[s] + '天' });
    }
    stageData.push({ stage: 5, count: all.filter(w => w.mastery >= 5).length, label: labels[5], day: '完成' });

    const todayReview = this.getTodayReview();

    let html = `<div class="card"><div class="card-title">艾宾浩斯遗忘曲线复习</div>
      <div style="font-size:12px;color:var(--text2);margin-bottom:12px;">按记忆间隔安排复习：1天 → 3天 → 7天 → 15天 → 30天</div>
      <div class="ebbinghaus-timeline">`;

    stageData.forEach((s, i) => {
      const active = this.selectedStage === i ? ' active' : '';
      html += `<div class="ebbinghaus-node${active}" onclick="engine._selectStage(${i})">
        <div class="node-label">${s.label}</div>
        <div class="node-count">${s.count}</div>
        <div class="node-day">${s.day}</div>
      </div>`;
    });

    html += `</div></div>`;

    if (this.selectedStage >= 0 && this.selectedStage < 5) {
      const stageWords = all.filter(w => w.reviewStage === this.selectedStage && w.mastery < 5);
      if (stageWords.length > 0) {
        html += `<div class="card"><div class="card-title">${labels[this.selectedStage]}待复习 <span class="tag tag-orange">${stageWords.length} 词</span></div>`;
        html += `<div class="ebbinghaus-review-list">`;
        stageWords.forEach(w => {
          html += `<div class="ebbinghaus-review-item">
            <span class="review-word">${w.word}</span>
            <span class="review-meaning">${w.pos} ${w.meaning}</span>
            <span class="review-stage">阶段${w.reviewStage}</span>
            <div class="review-actions">
              <button class="r-btn r-remember" onclick="engine._markWord('${w.word}','remember')">记得</button>
              <button class="r-btn r-fuzzy" onclick="engine._markWord('${w.word}','fuzzy')">模糊</button>
              <button class="r-btn r-forgot" onclick="engine._markWord('${w.word}','forgot')">忘了</button>
            </div>
          </div>`;
        });
        html += `</div></div>`;
      }
    } else if (this.selectedStage === 5) {
      const masteredWords = all.filter(w => w.mastery >= 5);
      if (masteredWords.length > 0) {
        html += `<div class="card"><div class="card-title">已掌握 <span class="tag tag-green">${masteredWords.length} 词</span></div>`;
        html += `<div class="ebbinghaus-review-list">`;
        masteredWords.forEach(w => {
          html += `<div class="ebbinghaus-review-item">
            <span class="review-word">${w.word}</span>
            <span class="review-meaning">${w.pos} ${w.meaning}</span>
          </div>`;
        });
        html += `</div></div>`;
      }
    }

    if (todayReview.length > 0) {
      html += `<div class="card" style="border-color:var(--warn);"><div class="card-title">今日待复习 <span class="tag tag-orange">${todayReview.length} 词</span></div>`;
      html += `<div class="ebbinghaus-review-list">`;
      todayReview.forEach(w => {
        html += `<div class="ebbinghaus-review-item">
          <span class="review-word">${w.word}</span>
          <span class="review-meaning">${w.pos} ${w.meaning}</span>
          <span class="review-stage">阶段${w.reviewStage}</span>
          <div class="review-actions">
            <button class="r-btn r-remember" onclick="engine._markWord('${w.word}','remember')">记得</button>
            <button class="r-btn r-fuzzy" onclick="engine._markWord('${w.word}','fuzzy')">模糊</button>
            <button class="r-btn r-forgot" onclick="engine._markWord('${w.word}','forgot')">忘了</button>
          </div>
        </div>`;
      });
      html += `</div></div>`;
    }

    this.targetEl.innerHTML = html;
  }

  _selectStage(stage) {
    this.selectedStage = stage;
    this._renderEbbinghaus();
  }

  _getDateAfterDays(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  _renderQuiz() {
    if (!this.quizData || this.quizData.length === 0) {
      let html = `<div class="quiz-area">
        <div class="card-title" style="margin-bottom:16px;">单词自测</div>
        <div class="quiz-mode-selector">
          <button class="quiz-mode-btn ${this.quizMode === 'en2cn' ? 'active' : ''}" onclick="engine._setQuizMode('en2cn')">英→中</button>
          <button class="quiz-mode-btn ${this.quizMode === 'cn2en' ? 'active' : ''}" onclick="engine._setQuizMode('cn2en')">中→英</button>
          <button class="quiz-mode-btn ${this.quizMode === 'spell' ? 'active' : ''}" onclick="engine._setQuizMode('spell')">拼写</button>
        </div>
        <div style="text-align:center;padding:20px;">
          <div style="font-size:14px;color:var(--text2);margin-bottom:16px;">选择测试模式，然后开始自测</div>
          <button class="btn btn-accent" onclick="engine._startQuiz()">开始测试</button>
        </div>
      </div>`;
      this.targetEl.innerHTML = html;
      return;
    }

    const q = this.quizData[this.quizIndex];
    const total = this.quizData.length;

    let progressHtml = `<div class="quiz-progress-bar">`;
    for (let i = 0; i < total; i++) {
      let cls = 'qp-seg';
      if (i < this.quizResults.length) cls += this.quizResults[i] ? ' done' : ' wrong-seg';
      progressHtml += `<div class="${cls}"></div>`;
    }
    progressHtml += `</div>`;

    let bodyHtml = '';
    if (this.quizMode === 'spell') {
      bodyHtml = `<div class="quiz-question">${q.question}<div class="quiz-hint">${q.hint || ''}</div></div>
        <input class="quiz-input" id="quiz-spell-input" placeholder="输入英文拼写..." onkeydown="if(event.key==='Enter')engine._checkSpell()">
        <div class="quiz-nav">
          <span class="quiz-counter">${this.quizIndex + 1} / ${total}</span>
          <button class="btn btn-accent" onclick="engine._checkSpell()">确认</button>
        </div>
        <div id="quiz-result-area"></div>`;
    } else {
      bodyHtml = `<div class="quiz-question">${q.question}<div class="quiz-hint">${q.hint || ''}</div></div>
        <div class="quiz-options" id="quiz-options-area">
          ${q.options.map((opt, i) => `<div class="quiz-option" data-idx="${i}" onclick="engine._selectOption(${i})">${opt}</div>`).join('')}
        </div>
        <div class="quiz-nav">
          <span class="quiz-counter">${this.quizIndex + 1} / ${total}</span>
          <button class="btn btn-accent" id="quiz-next-btn" style="display:none;" onclick="engine._nextQuiz()">下一题</button>
        </div>
        <div id="quiz-result-area"></div>`;
    }

    this.targetEl.innerHTML = `<div class="quiz-area">
      <div class="card-title" style="margin-bottom:12px;">单词自测 · ${this.quizMode === 'en2cn' ? '英→中' : this.quizMode === 'cn2en' ? '中→英' : '拼写'}</div>
      ${progressHtml}
      ${bodyHtml}
    </div>`;

    if (this.quizMode === 'spell') {
      const input = document.getElementById('quiz-spell-input');
      if (input) input.focus();
    }
  }

  _setQuizMode(mode) {
    this.quizMode = mode;
    this.quizData = null;
    this.quizIndex = 0;
    this.quizResults = [];
    this._renderQuiz();
  }

  _startQuiz() {
    const all = this.getAll().map(w => this._normalize(w));
    if (all.length < 4) {
      alert('单词数量不足4个，无法生成测试');
      return;
    }
    this.quizData = this.generateQuiz(this.quizMode, Math.min(10, all.length));
    this.quizIndex = 0;
    this.quizResults = [];
    this._renderQuiz();
  }

  _selectOption(idx) {
    const q = this.quizData[this.quizIndex];
    const options = document.querySelectorAll('#quiz-options-area .quiz-option');
    const isCorrect = idx === q.correctIndex;
    this.quizResults.push(isCorrect);

    options.forEach((opt, i) => {
      opt.onclick = null;
      if (i === q.correctIndex) opt.classList.add('correct');
      if (i === idx && !isCorrect) opt.classList.add('wrong');
    });

    const resultArea = document.getElementById('quiz-result-area');
    if (resultArea) {
      resultArea.innerHTML = isCorrect
        ? `<div class="quiz-result correct-result">✓ 回答正确！</div>`
        : `<div class="quiz-result wrong-result">✕ 回答错误<div class="correct-answer">正确答案：${q.options[q.correctIndex]}</div></div>`;
    }

    this.markReview(q.word, isCorrect ? 'remember' : 'forgot');
    this._renderStatsBar();

    const nextBtn = document.getElementById('quiz-next-btn');
    if (nextBtn) nextBtn.style.display = 'inline-block';
  }

  _checkSpell() {
    const q = this.quizData[this.quizIndex];
    const input = document.getElementById('quiz-spell-input');
    if (!input) return;
    const val = input.value.trim().toLowerCase();
    const isCorrect = val === q.answer.toLowerCase();
    this.quizResults.push(isCorrect);

    input.classList.add(isCorrect ? 'correct' : 'wrong');
    input.disabled = true;

    const resultArea = document.getElementById('quiz-result-area');
    if (resultArea) {
      resultArea.innerHTML = isCorrect
        ? `<div class="quiz-result correct-result">✓ 拼写正确！</div>`
        : `<div class="quiz-result wrong-result">✕ 拼写错误<div class="correct-answer">正确拼写：${q.answer}</div></div>`;
    }

    this.markReview(q.word, isCorrect ? 'remember' : 'forgot');
    this._renderStatsBar();

    const nextBtn = document.getElementById('quiz-next-btn');
    if (!nextBtn) {
      const nav = document.querySelector('.quiz-nav');
      if (nav) {
        const btn = document.createElement('button');
        btn.className = 'btn btn-accent';
        btn.id = 'quiz-next-btn';
        btn.textContent = this.quizIndex < this.quizData.length - 1 ? '下一题' : '查看结果';
        btn.onclick = function () { engine._nextQuiz(); };
        nav.appendChild(btn);
      }
    }
  }

  _nextQuiz() {
    this.quizIndex++;
    if (this.quizIndex >= this.quizData.length) {
      this._renderQuizResult();
      return;
    }
    this._renderQuiz();
  }

  _renderQuizResult() {
    const correct = this.quizResults.filter(r => r).length;
    const total = this.quizResults.length;
    const pct = total > 0 ? Math.round(correct / total * 100) : 0;

    let html = `<div class="quiz-area">
      <div class="card-title" style="margin-bottom:16px;">测试结果</div>
      <div style="text-align:center;padding:20px;">
        <div style="font-size:36px;font-weight:700;color:${pct >= 80 ? 'var(--success)' : pct >= 60 ? 'var(--warn)' : 'var(--error)'};">${pct}%</div>
        <div style="font-size:14px;color:var(--text2);margin-top:8px;">正确 ${correct} / ${total}</div>
      </div>
      <div class="progress-bar" style="margin-bottom:16px;">
        <div class="ok" style="flex:${correct};"></div>
        <div class="fail" style="flex:${total - correct};"></div>
      </div>
      <div style="text-align:center;display:flex;gap:8px;justify-content:center;">
        <button class="btn btn-accent" onclick="engine._startQuiz()">再测一次</button>
        <button class="btn" onclick="engine.quizData=null;engine._renderQuiz()">返回选择</button>
      </div>
    </div>`;

    this.targetEl.innerHTML = html;
    this.quizData = null;
  }

  _renderProgress() {
    const stats = this.getStats();
    const sourceStats = this.getSourceStats();
    const calendarData = this.getCalendarData();

    const ringSize = 100;
    const ringWidth = 8;
    const circumference = 2 * Math.PI * ((ringSize - ringWidth) / 2);

    const masteredPct = stats.total > 0 ? stats.mastered / stats.total : 0;
    const learningPct = stats.total > 0 ? stats.learning / stats.total : 0;
    const newPct = stats.total > 0 ? stats.new / stats.total : 0;

    const ringsHtml = [
      { pct: masteredPct, label: '已掌握', color: 'var(--success)' },
      { pct: learningPct, label: '学习中', color: 'var(--warn)' },
      { pct: newPct, label: '新词', color: 'var(--accent)' }
    ].map(r => {
      const offset = circumference * (1 - r.pct);
      return `<div class="ring-item">
        <div class="progress-ring">
          <svg width="${ringSize}" height="${ringSize}">
            <circle cx="${ringSize/2}" cy="${ringSize/2}" r="${(ringSize-ringWidth)/2}" fill="none" stroke="var(--border)" stroke-width="${ringWidth}"/>
            <circle cx="${ringSize/2}" cy="${ringSize/2}" r="${(ringSize-ringWidth)/2}" fill="none" stroke="${r.color}" stroke-width="${ringWidth}" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" stroke-linecap="round"/>
          </svg>
          <span class="ring-text">${Math.round(r.pct * 100)}%</span>
        </div>
        <span class="ring-label">${r.label}</span>
      </div>`;
    }).join('');

    const today = this._today();
    const dates = Object.keys(calendarData).sort();
    const maxCount = Math.max(1, ...Object.values(calendarData));

    let calendarHtml = `<div class="calendar-grid">`;
    const dayLabels = ['一', '二', '三', '四', '五', '六', '日'];
    dayLabels.forEach(d => {
      calendarHtml += `<div class="calendar-cell" style="font-weight:600;color:var(--text2);font-size:10px;">${d}</div>`;
    });
    dates.forEach(dateStr => {
      const count = calendarData[dateStr];
      let level = '';
      if (count > 0) {
        const ratio = count / maxCount;
        if (ratio <= 0.25) level = 'l1';
        else if (ratio <= 0.5) level = 'l2';
        else if (ratio <= 0.75) level = 'l3';
        else level = 'l4';
      }
      const isToday = dateStr === today ? ' today' : '';
      const dayNum = dateStr.split('-')[2];
      calendarHtml += `<div class="calendar-cell${level ? ' ' + level : ''}${isToday}">${parseInt(dayNum)}<div class="cell-tip">${dateStr}: ${count}次复习</div></div>`;
    });
    calendarHtml += `</div>`;

    const sourceLabels = {
      'Phase 1': '传统阅读',
      'Phase 2a': '传统阅读',
      'Phase 2b': '传统阅读',
      'Phase 2c': '传统阅读',
      'Phase 3': '传统阅读',
      'Phase 4': '传统阅读'
    };

    let sourceHtml = `<div class="source-stats">`;
    const grouped = {};
    Object.entries(sourceStats).forEach(([src, count]) => {
      const label = sourceLabels[src] || src;
      if (!grouped[label]) grouped[label] = 0;
      grouped[label] += count;
    });
    if (Object.keys(grouped).length === 0) {
      sourceHtml += `<div class="source-item"><div class="source-name">暂无数据</div><div class="source-count">0</div><div class="source-label">单词</div></div>`;
    } else {
      Object.entries(grouped).forEach(([name, count]) => {
        sourceHtml += `<div class="source-item"><div class="source-name">${name}</div><div class="source-count">${count}</div><div class="source-label">单词</div></div>`;
      });
    }
    sourceHtml += `</div>`;

    let html = `<div class="progress-section">
      <div class="section-title">掌握度分布</div>
      <div class="rings-row">${ringsHtml}</div>
    </div>
    <div class="progress-section">
      <div class="section-title">复习日历（近30天）</div>
      ${calendarHtml}
    </div>
    <div class="progress-section">
      <div class="section-title">来源统计</div>
      ${sourceHtml}
    </div>`;

    this.targetEl.innerHTML = html;
  }
}
