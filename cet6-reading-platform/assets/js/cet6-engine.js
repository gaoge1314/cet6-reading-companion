class CET6Engine {
  constructor(data, vocab, annotate, examId) {
    this.data = data;
    this.vocab = vocab;
    this.annotate = annotate;
    this.selectedOptions = {};
    this.currentPhase = '1';
    this._containerSelector = null;
    this.examId = examId;
    this.progressKey = CET6Utils.storageKeys.examsState + '-' + examId + '-reading';
    this._loadProgress();
  }



  reRenderCurrentPhase() {
    const target = document.querySelector(this._containerSelector);
    if (!target) return;
    target.innerHTML = '';
    const phases = this.data.phases;
    this._renderPhase1(target, phases.phase1);
    this._renderPhase2a(target, phases.phase2a);
    this._renderPhase2b(target, phases.phase2b);
    this._renderPhase2c(target, phases.phase2c);
    this._renderPhase3(target, phases.phase3);
    this._renderPhase4(target, phases.phase4);
    this.switchPhase(this.currentPhase);
    this._restoreSelections();
    this._renderAnswerCard();
    this.updateSidebar();
  }

  _restoreSelections() {
    Object.entries(this.selectedOptions).forEach(([qNum, opt]) => {
      document.querySelectorAll(`.options-grid[data-q="${qNum}"] .option-item`).forEach(el => {
        if (el.dataset.opt === opt) el.classList.add('selected');
      });
    });
  }

  _loadProgress() {
    try {
      const saved = JSON.parse(localStorage.getItem(this.progressKey) || '{}');
      this.selectedOptions = saved.selectedOptions || {};
      this.currentPhase = saved.currentPhase || '1';
    } catch (e) {
      this.selectedOptions = {};
      this.currentPhase = '1';
    }
  }

  _saveProgress() {
    localStorage.setItem(this.progressKey, JSON.stringify({
      selectedOptions: this.selectedOptions,
      currentPhase: this.currentPhase,
      time: new Date().toISOString()
    }));
  }

  init(containerSelector) {
    this._containerSelector = containerSelector;
    const target = document.querySelector(containerSelector);
    if (!target) return;
    target.innerHTML = '';

    const phases = this.data.phases;

    this._renderPhase1(target, phases.phase1);
    this._renderPhase2a(target, phases.phase2a);
    this._renderPhase2b(target, phases.phase2b);
    this._renderPhase2c(target, phases.phase2c);
    this._renderPhase3(target, phases.phase3);
    this._renderPhase4(target, phases.phase4);

    this.switchPhase(this.currentPhase);
    this._restoreSelections();
    this._renderAnswerCard();
    this.updateSidebar();
  }

  destroy() {
  }

  _renderPhase1(container, p) {
    const div = document.createElement('div');
    div.className = 'phase active';
    div.id = 'phase-1';

    let html = '';

    if (p.topicPrediction) {
      html += `<div class="card"><div class="card-title">${p.topicPrediction.title || '主题预测'}</div><div style="font-size:13px;">${p.topicPrediction.content}</div></div>`;
    }

    if (p.questionTypes) {
      html += `<div class="card"><div class="card-title">${p.questionTypes.title || '题型 & 定位词'}</div><div style="font-size:12px;color:var(--text2);">${p.questionTypes.content}</div></div>`;
    }

    if (p.passage && p.passage.paragraphs) {
      html += `<div class="card"><div class="card-title">${p.passage.title || '文章全文'}</div><div class="passage">`;
      if (this.annotate) {
        html += this.annotate.renderPassage(p.passage.paragraphs);
      } else {
        p.passage.paragraphs.forEach((para, idx) => {
          html += `<p data-para="${idx}"><span class="para-number">¶${idx + 1}</span>${para}</p>`;
        });
      }
      html += `</div></div>`;
    }

    if (p.questionPreview) {
      html += this._renderQuestions(p.questionPreview.items || this.data.questions, false);
    }

    div.innerHTML = html;
    container.appendChild(div);
  }

  _renderPhase2a(container, p) {
    const div = document.createElement('div');
    div.className = 'phase';
    div.id = 'phase-2a';

    let html = '';

    if (p.instruction) {
      html += `<div class="center-box"><div class="label">${p.instruction.title || 'T7 首尾句聚焦'}</div><div>${p.instruction.content}</div></div>`;
    }

    if (p.sections) {
      if (this.annotate) {
        html += this.annotate.renderSentences(p.sections);
      } else {
        p.sections.forEach(sec => {
          html += `<div class="card">`;
          html += `<div class="card-title">${sec.paragraph}</div>`;
          html += `<div class="passage">`;
          if (sec.firstSentence) {
            html += `<p><span class="sentence-tag">首</span>${sec.firstSentence}</p>`;
          }
          if (sec.lastSentence) {
            html += `<p><span class="sentence-tag">尾</span>${sec.lastSentence}</p>`;
          }
          html += `</div>`;
          if (sec.monologue) {
            html += `<div class="mono">${sec.monologue}</div>`;
          }
          html += `</div>`;
        });
      }
    }

    if (p.centerSummary) {
      html += `<div class="center-box"><div class="label">${p.centerSummary.title || '中心归纳'}</div><div>${p.centerSummary.content}</div></div>`;
    }

    div.innerHTML = html;
    container.appendChild(div);
  }

  _renderPhase2b(container, p) {
    const div = document.createElement('div');
    div.className = 'phase';
    div.id = 'phase-2b';

    let html = '';

    if (p.instruction) {
      html += `<div class="center-box"><div class="label">${p.instruction.title || '用中心做题'}</div><div>${p.instruction.content}</div></div>`;
    }

    if (p.solvableItems) {
      p.solvableItems.forEach(item => {
        html += `<div class="card">`;
        html += `<div class="card-title">${item.question} <span class="tag tag-green">${item.status || '可用中心做'}</span></div>`;
        html += this._renderOptions(item.id, this.data, true);
        if (item.monologue) {
          html += `<div class="mono">${item.monologue}</div>`;
        }
        html += `</div>`;
      });
    }

    if (p.pendingItems && p.pendingItems.length > 0) {
      html += `<div class="card" style="border-color:var(--warn);border-style:dashed;">`;
      html += `<div class="card-title">${p.pendingItems.map(it => it.id).join(' · ')} <span class="tag tag-orange">需要定位精读</span></div>`;
      html += `<div style="font-size:13px;color:var(--text2);">${p.pendingItems.map(it => it.description).join('<br>')}</div>`;
      if (p.pendingMonologue) {
        html += `<div class="mono">${p.pendingMonologue}</div>`;
      }
      html += `</div>`;
    }

    div.innerHTML = html;
    container.appendChild(div);
  }

  _renderPhase2c(container, p) {
    const div = document.createElement('div');
    div.className = 'phase';
    div.id = 'phase-2c';

    let html = '';

    if (p.instruction) {
      html += `<div class="center-box"><div class="label">${p.instruction.title || 'T4 定位 + T6 段落锁定 + T3 同义替换'}</div><div>${p.instruction.content}</div></div>`;
    }

    if (p.locators && p.locators.length > 0) {
      html += `<div class="locator">`;
      p.locators.forEach(loc => {
        html += `<div class="locator-item">${loc}</div>`;
      });
      html += `</div>`;
    }

    if (p.detailItems) {
      p.detailItems.forEach((item, idx) => {
        html += `<div class="card">`;
        html += `<div class="card-title">${item.paragraph} <span class="tag tag-orange">${item.skill || '定位精读'}</span></div>`;
        html += `<div class="passage"><p data-para="detail-${idx}">`;
        if (this.annotate) {
          html += this.annotate._applyInline(this.annotate._escapeHtml(item.passageSnippet));
        } else {
          html += item.passageSnippet;
        }
        html += `</p></div>`;
        html += `<div style="margin-top:8px;">`;
        html += `<div style="font-weight:600;font-size:13px;margin-bottom:4px;">${item.question}</div>`;
        html += this._renderOptions(item.id, this.data, true);
        if (item.monologue) {
          html += `<div class="mono">${item.monologue}</div>`;
        }
        html += `</div></div>`;
      });
    }

    div.innerHTML = html;
    container.appendChild(div);
  }

  _renderPhase3(container, p) {
    const div = document.createElement('div');
    div.className = 'phase';
    div.id = 'phase-3';

    let html = `<div class="card"><div class="card-title">${p.title || '统一对答案'}`;
    if (p.source) html += ` <span class="tag tag-green">${p.source}</span>`;
    html += `</div>`;

    html += this._renderScoreDisplay();

    if (p.answers) {
      html += `<div style="display:grid;gap:6px;">`;
      p.answers.forEach(ans => {
        const userAnswer = this.selectedOptions[ans.id];
        const isCorrect = userAnswer === ans.correct;
        const bg = isCorrect ? '#f0fdf4' : '#fff5f5';
        const border = isCorrect ? 'var(--success)' : 'var(--error)';
        html += `<div style="background:${bg};border:1px solid ${border};border-radius:8px;padding:10px;">`;
        html += `<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px;">`;
        html += `<span><b>${ans.id}.</b> ${ans.label} ${isCorrect ? '✅' : '❌'}</span>`;
        html += `<span style="font-size:11px;color:var(--text2);">${userAnswer ? '你的选择 ' + userAnswer + ' → ' : ''}正确答案 ${ans.correct}</span>`;
        html += `</div>`;
        if (ans.tip) {
          html += `<div style="font-size:12px;color:var(--text2);margin-top:4px;">${ans.tip}</div>`;
        }
        html += `</div>`;
      });
      html += `</div>`;
    }

    html += `</div>`;
    div.innerHTML = html;
    container.appendChild(div);
  }

  _renderPhase4(container, p) {
    const div = document.createElement('div');
    div.className = 'phase';
    div.id = 'phase-4';

    let html = '';

    if (p.centerReview) {
      html += `<div class="center-box"><div class="label">${p.centerReview.title || '文章中心'}</div><div>${p.centerReview.content}</div></div>`;
    }

    if (p.skillStats) {
      html += `<div class="card"><div class="card-title">${p.skillStats.title || '技巧使用统计'}</div>`;
      html += `<div class="skill-grid">`;
      p.skillStats.items.forEach(skill => {
        html += `<div class="skill-item"><div class="num">${skill.name}</div><div style="color:var(--text2);">${skill.desc}</div><div style="font-size:10px;color:var(--text3);">${skill.usedIn || ''}</div></div>`;
      });
      html += `</div></div>`;
    }

    if (p.reviewItems) {
      p.reviewItems.forEach(item => {
        html += `<div class="review-item"><strong>${item.title}</strong><br>${item.content}</div>`;
      });
    }

    if (p.pitfalls) {
      html += `<div class="tip-box"><strong>${p.pitfalls.title || '易错点提醒'}</strong><br>${p.pitfalls.content}</div>`;
    }

    if (p.vocabSummary && p.vocabSummary.words) {
      html += `<div class="card"><div class="card-title">${p.vocabSummary.title || '生词汇总'}</div>`;
      html += `<div class="vocab-grid">`;
      p.vocabSummary.words.forEach(w => {
        html += `<div class="vocab-grid-item">${w}</div>`;
      });
      html += `</div></div>`;
    }

    html += `<div style="margin-top:20px;display:flex;gap:8px;flex-wrap:wrap;">
      <button class="btn btn-accent" onclick="window._vocab.exportMarkdown('${this.data.meta?.title || '六级生词本'}')">导出 .md 生词本</button>
      <button class="btn btn-danger" onclick="window._vocab.clear()">清空生词本</button>
    </div>`;

    div.innerHTML = html;
    container.appendChild(div);
  }

  _renderQuestions(questions, interactive) {
    let html = '';
    questions.forEach(q => {
      html += `<div class="card"><div class="card-title">${q.number || q.id}. ${q.text}`;
      if (q.type) {
        const tagClass = q.type === '细节题' ? 'tag-detail' : q.type === '推断题' ? 'tag-infer' : 'tag-blue';
        html += ` <span class="tag ${tagClass}">${q.type}</span>`;
      }
      html += `</div>`;
      html += this._renderOptions(q.id, this.data, interactive);
      if (q.locationTip) {
        html += `<div style="margin-top:6px;font-size:11px;color:var(--text2);">定位词: ${q.locationTip}</div>`;
      }
      html += `</div>`;
    });
    return html;
  }

  _renderOptions(qId, data, interactive) {
    const question = data.questions.find(q => q.id === qId);
    if (!question || !question.options) return '';
    let html = `<div class="options-grid" data-q="${qId}">`;
    question.options.forEach(opt => {
      const label = opt.label;
      const cls = interactive ? 'option-item' : 'option-item';
      const onclick = interactive ? `onclick="window._engine.selectOption(${qId},'${label}')"` : '';
      html += `<div class="${cls}" ${onclick} data-opt="${label}">${label}) ${opt.text}</div>`;
    });
    html += `</div>`;
    return html;
  }

  _renderScoreDisplay() {
    const total = this.data.answers.length;
    let score = 0;
    let answered = 0;
    this.data.answers.forEach(a => {
      if (this.selectedOptions[a.id] !== undefined) answered++;
      if (this.selectedOptions[a.id] === a.correct) score++;
    });

    let desc = '';
    if (answered === 0) desc = '暂未选择答案';
    else if (answered < total) desc = `已做 ${answered}/${total} 题，正确 ${score} 题`;
    else {
      const pct = score / total;
      if (pct === 1) desc = '全对！太棒了！';
      else if (pct >= 0.8) desc = '非常好！继续保持！';
      else if (pct >= 0.6) desc = '不错，还有提升空间！';
      else desc = '需要加强，看看错题分析！';
    }

    const okPct = answered > 0 ? score / total : 0;
    const failPct = answered > 0 ? (answered - score) / total : 0;
    const remainingPct = 1 - okPct - failPct;

    return `
      <div class="score-display">
        <div class="score-num">${score}/${total}</div>
        <div><div style="font-weight:600;font-size:15px;">${desc}</div></div>
      </div>
      <div class="progress-bar" style="margin-bottom:12px;">
        <div class="ok" style="flex:${Math.max(okPct * 100, 0)};"></div>
        <div class="fail" style="flex:${Math.max(failPct * 100, 0)};"></div>
        ${remainingPct > 0 ? `<div style="flex:${remainingPct * 100};background:#e0e0e0;"></div>` : ''}
      </div>`;
  }

  _renderAnswerCard() {
    const card = document.getElementById('answer-card');
    if (!card) return;
    let html = '';
    this.data.answers.forEach(a => {
      const user = this.selectedOptions[a.id];
      if (user) {
        const isCorrect = user === a.correct;
        const bg = isCorrect ? '#e8f5e9' : '#ffebee';
        const color = isCorrect ? '#2e7d32' : '#c62828';
        const icon = isCorrect ? '✅' : '❌';
        html += `<div class="answer-row" style="background:${bg};border-color:transparent;"><span class="qn" style="color:${color};">${a.id}</span><span class="ans-text" style="font-size:12px;color:${color};">${user}${icon}</span></div>`;
      } else {
        html += `<div class="answer-row" style="background:#f0f0f0;border-color:transparent;"><span class="qn" style="color:var(--text2);">${a.id}</span><span class="ans-text" style="font-size:12px;color:var(--text2);">— 待做</span></div>`;
      }
    });
    card.innerHTML = html;
  }

  updateSidebar() {
    const list = this.vocab ? this.vocab.getAll() : [];
    const vocabCount = list.length;
    const annotateCount = this.annotate ? this.annotate.getAll().length : 0;

    CET6Shell.updateSidebarCounts({ vocab: vocabCount, annotate: annotateCount });

    const vocabListEl = document.getElementById('vocab-list');
    if (vocabListEl) {
      vocabListEl.innerHTML = CET6Shell.renderVocabList(list, 'window._app.currentEngine.removeVocab');
    }

    const annotateListEl = document.getElementById('annotate-list');
    if (annotateListEl) {
      annotateListEl.innerHTML = CET6Shell.renderAnnotateList(
        this.annotate ? this.annotate.getAll() : [],
        'window._app.currentEngine.removeAnnotate'
      );
    }
  }

  removeVocab(index) {
    if (this.vocab) {
      this.vocab.remove(index);
      this.reRenderCurrentPhase();
      this.updateSidebar();
    }
  }

  removeAnnotate(index) {
    if (this.annotate) {
      this.annotate.remove(index);
      this.reRenderCurrentPhase();
      this.updateSidebar();
    }
  }

  selectOption(qNum, opt) {
    this.selectedOptions[qNum] = opt;
    this._saveProgress();

    document.querySelectorAll(`.options-grid[data-q="${qNum}"] .option-item`).forEach(el => {
      el.classList.remove('selected');
      if (el.dataset.opt === opt) el.classList.add('selected');
    });

    this._renderAnswerCard();

    const phase3 = document.getElementById('phase-3');
    if (phase3) {
      const card = phase3.querySelector('.card');
      if (card) {
        const scoreHTML = this._renderScoreDisplay();
        const existingScore = card.querySelector('.score-display');
        if (existingScore) {
          existingScore.outerHTML = scoreHTML;
        }
      }
    }
  }

  switchPhase(phase) {
    this.currentPhase = String(phase);
    this._saveProgress();

    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    const tab = document.querySelector(`.tab[data-phase="${phase}"]`);
    if (tab) tab.classList.add('active');

    document.querySelectorAll('.phase').forEach(p => p.classList.remove('active'));
    const phaseEl = document.getElementById(`phase-${phase}`);
    if (phaseEl) phaseEl.classList.add('active');

    if (phase === '3' || phase === 3) {
      this._renderAnswerCard();
    }

    this.updateSidebar();
  }
}