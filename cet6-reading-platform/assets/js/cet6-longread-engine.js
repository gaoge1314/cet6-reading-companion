class CET6LongReadEngine {
  constructor(data, vocab, locateWord) {
    this.data = data;
    this.vocab = vocab;
    this.annotate = null;
    this.locateWord = locateWord;

    this.matches = {};
    this.gaveUps = new Set();
    this.otItems = new Set();
    this.timings = {};
    this.currentFocus = null;

    this.remainingSeconds = (data.meta.timeLimit || 15) * 60;
    this.totalSeconds = this.remainingSeconds;
    this.timerRunning = false;
    this.timerInterval = null;
    this.questionStartTime = null;
    this.questionElapsed = {};
    this.warnMinutes = [10, 5, 1];
    this.lastWarnedMinute = null;
    this.perQuestionLimit = 60;

    this.dataId = data.meta.id;
    this.progressKey = 'cet6-longread-' + this.dataId;
    this.currentPhase = '1';
    this._loadProgress();
  }

  setAnnotate(annotate) {
    this.annotate = annotate;
  }

  _loadProgress() {
    try {
      const saved = JSON.parse(localStorage.getItem(this.progressKey) || '{}');
      this.matches = saved.matches || {};
      this.gaveUps = new Set(saved.gaveUps || []);
      this.otItems = new Set(saved.otItems || []);
      this.timings = saved.timings || {};
      this.currentPhase = saved.phase || '1';
    } catch (e) {
      this.matches = {};
      this.gaveUps = new Set();
      this.otItems = new Set();
      this.timings = {};
      this.currentPhase = '1';
    }
  }

  _saveProgress() {
    localStorage.setItem(this.progressKey, JSON.stringify({
      matches: this.matches,
      gaveUps: Array.from(this.gaveUps),
      otItems: Array.from(this.otItems),
      timings: this.timings,
      phase: this.currentPhase,
      time: new Date().toISOString()
    }));
  }

  init(containerEl, contentEl, timerEl) {
    this._containerEl = containerEl;
    this._contentEl = contentEl;
    this._timerEl = timerEl;
    this.renderAll();
    this.switchPhase(this.currentPhase);
  }

  renderAll() {
    const c = this._contentEl;
    c.innerHTML = '';
    this._renderPhase1(c);
    this._renderPhase2(c);
    this._renderPhase3(c);
    this._renderPhase4(c);
    this._updateTimerDisplay();
  }

  _buildThinkingPrompt(opt) {
    const p1 = this.data.phases.phase1;
    const globalTemplate = (p1.thinkingPrompt && p1.thinkingPrompt.template) || '';
    const customPrompt = opt.thinkingPrompt || '';
    const template = customPrompt || globalTemplate;
    if (!template) return '';

    const lw = opt.locateWords || {};
    const properNouns = (lw.properNoun || []).join(', ');
    const normalNouns = (lw.normalNoun || []).join(', ');
    const comparatives = (lw.comparative || []).join(', ');

    let result = template;
    result = result.replace(/\{properNouns\}/g, properNouns || '（无）');
    result = result.replace(/\{normalNouns\}/g, normalNouns || '（无）');
    result = result.replace(/\{comparatives\}/g, comparatives || '（无）');
    result = result.replace(/\{text\}/g, (opt.text || '').substring(0, 60));
    result = result.replace(/\{id\}/g, String(opt.id));
    return result;
  }

  _buildOverallAnalysis() {
    const template = this.data.overallAnalysis || '';
    if (!template) return '';

    const options = this.data.options || [];
    const easyIds = [];
    const hardIds = [];
    const vars = {};

    options.forEach(opt => {
      const lw = opt.locateWords || {};
      const hasProper = lw.properNoun && lw.properNoun.length > 0;
      if (hasProper) easyIds.push(opt.id);
      else hardIds.push(opt.id);
      vars['q' + opt.id + '_properNouns'] = (lw.properNoun || []).join(', ');
      vars['q' + opt.id + '_normalNouns'] = (lw.normalNoun || []).join(', ');
      vars['q' + opt.id + '_comparatives'] = (lw.comparative || []).join(', ');
    });

    let result = template;
    result = result.replace(/\{easyCount\}/g, String(easyIds.length));
    result = result.replace(/\{hardCount\}/g, String(hardIds.length));
    result = result.replace(/\{easyIds\}/g, easyIds.join(', ') || '无');
    result = result.replace(/\{hardIds\}/g, hardIds.join(', ') || '无');
    Object.entries(vars).forEach(([key, val]) => {
      result = result.replace(new RegExp('\\{' + key + '\\}', 'g'), val || '（无）');
    });
    return result;
  }

  _renderPhase1(container) {
    const div = document.createElement('div');
    div.className = 'phase';
    div.id = 'phase-1';
    const p = this.data.phases.phase1;

    let html = '';

    if (p.instruction) {
      html += `<div class="center-box"><div class="label">${p.instruction.title}</div><div style="font-size:13px;">${p.instruction.content}</div></div>`;
    }

    if (p.showFullPassage !== false) {
      html += `<div class="card"><div class="card-title">📖 完整原文</div>`;
      html += `<div class="passage-scroll">`;
      const paragraphs = this.data.passage.paragraphs || [];
      paragraphs.forEach(para => {
        html += `<div class="para-block" data-para="${para.id}" id="p1-para-${para.id}">`;
        html += `<div class="para-header"><span class="para-badge">${para.id}</span></div>`;
        html += `<div class="para-text">${this._esc(para.text)}</div>`;
        html += `</div>`;
      });
      html += `</div></div>`;
    }

    if (p.locateStrategy) {
      html += `<div class="card"><div class="card-title">${p.locateStrategy.title}</div>`;
      (p.locateStrategy.items || []).forEach(item => {
        const tagClass = item.type.includes('专有') ? 'proper' : item.type.includes('比较') ? 'comp' : 'normal';
        html += `<div style="margin-bottom:6px;font-size:13px;">
          <span class="location-tag ${tagClass}">${item.level} ${item.type}</span>
          <span style="color:var(--text2);">${item.desc}</span>
        </div>`;
      });
      html += `</div>`;
    }

    html += `<div class="card"><div class="card-title">选项逐题分析</div>`;
    (this.data.options || []).forEach(opt => {
      const thinking = this._buildThinkingPrompt(opt);
      html += `<div class="option-analysis-card">`;
      html += `<div class="option-analysis-header">`;
      html += `<span class="id-num">${opt.id}.</span>`;
      html += `<div class="location-tags">`;
      if (opt.locateWords) {
        if (opt.locateWords.properNoun && opt.locateWords.properNoun.length) {
          opt.locateWords.properNoun.forEach(w => {
            html += `<span class="location-tag proper">${this._esc(w)}</span>`;
          });
        }
        if (opt.locateWords.normalNoun && opt.locateWords.normalNoun.length) {
          opt.locateWords.normalNoun.forEach(w => {
            html += `<span class="location-tag normal">${this._esc(w)}</span>`;
          });
        }
        if (opt.locateWords.comparative && opt.locateWords.comparative.length) {
          opt.locateWords.comparative.forEach(w => {
            html += `<span class="location-tag comp">${this._esc(w)}</span>`;
          });
        }
      }
      html += `</div>`;
      html += `</div>`;
      html += `<div class="option-analysis-text">${this._esc(opt.text)}</div>`;
      if (thinking) {
        html += `<div class="thinking-prompt">💡 ${this._esc(thinking)}</div>`;
      }
      html += `</div>`;
    });
    html += `</div>`;

    const overallAnalysis = this._buildOverallAnalysis();
    if (overallAnalysis) {
      html += `<div class="card"><div class="card-title">📊 整体分析</div>`;
      html += `<div class="overall-analysis">${this._esc(overallAnalysis)}</div>`;
      html += `</div>`;
    }

    div.innerHTML = html;
    container.appendChild(div);
  }

  _renderPhase2(container) {
    const div = document.createElement('div');
    div.className = 'phase';
    div.id = 'phase-2';
    const p = this.data.phases.phase2;

    let html = '';
    if (p.instruction) {
      html += `<div class="instruction-box">${p.instruction.title} · ${p.instruction.content}</div>`;
    }

    html += `<div class="matching-layout" id="matching-area">`;

    html += `<div class="matching-passage" id="match-passage">`;
    const paragraphs = this.data.passage.paragraphs || [];
    paragraphs.forEach(para => {
      const matchedIds = [];
      Object.entries(this.matches).forEach(([optId, paraId]) => {
        if (paraId === para.id) matchedIds.push(optId);
      });
      const isMatched = matchedIds.length > 0;
      html += `<div class="para-block${isMatched ? ' matched' : ''}" data-para="${para.id}" id="para-${para.id}">`;
      html += `<div class="para-header">`;
      html += `<span class="para-badge">${para.id}</span>`;
      if (isMatched) {
        html += `<span class="para-matched-tags">`;
        matchedIds.forEach(id => {
          html += `<span class="para-matched-tag">${id}</span>`;
        });
        html += `</span>`;
      }
      html += `</div>`;
      html += `<div class="para-text">${this._esc(para.text)}</div>`;
      html += `</div>`;
    });
    html += `</div>`;

    html += `<div class="matching-options" id="match-options">`;
    (this.data.options || []).forEach(opt => {
      html += this._buildOptionCard(opt);
    });
    html += `</div>`;

    html += `</div>`;

    div.innerHTML = html;
    container.appendChild(div);
  }

  _buildOptionCard(opt) {
    const isMatched = this.matches[opt.id] !== undefined;
    const isGaveUp = this.gaveUps.has(opt.id);
    const isOT = this.otItems.has(opt.id);

    let cardClass = 'option-match-card';
    if (isMatched) cardClass += ' matched';
    else if (isGaveUp) cardClass += ' gave-up';
    if (isOT) cardClass += ' overtime';

    let statusHtml = '';
    if (isMatched) statusHtml = `<span class="option-match-status matched-status">→ ${this.matches[opt.id]}</span>`;
    else if (isGaveUp) statusHtml = `<span class="option-match-status gaveup-status">放弃</span>`;
    else if (isOT) statusHtml = `<span class="option-match-status overtime-status">超时</span>`;
    else statusHtml = `<span class="option-match-status pending-status">未做</span>`;

    const elapsed = this.questionElapsed[opt.id] || 0;
    const elapsedClass = elapsed > this.perQuestionLimit ? 'over' : '';

    let html = `<div class="${cardClass}" data-opt="${opt.id}" id="opt-card-${opt.id}">`;
    html += `<div class="option-match-id">`;
    html += `<span><span class="id-num">${opt.id}.</span> ${statusHtml}</span>`;
    html += `<span class="per-question-timer ${elapsedClass}" id="qtimer-${opt.id}">${elapsed > 0 ? this._fmtTime(elapsed) : ''}</span>`;
    html += `</div>`;
    html += `<div class="option-match-text" data-opt="${opt.id}">${this._esc(opt.text)}</div>`;

    if (isMatched) {
      const matchedParaId = this.matches[opt.id];
      const matchedPara = (this.data.passage.paragraphs || []).find(p => p.id === matchedParaId);
      if (matchedPara) {
        html += `<div class="matched-para-toggle" id="para-toggle-${opt.id}" onclick="window._engine.toggleParaExpand(${opt.id})">📄 展开段落 ${matchedParaId}</div>`;
        html += `<div class="matched-para-content" id="para-content-${opt.id}" style="display:none;">`;
        html += `<div class="para-text" style="font-size:12px;line-height:1.8;color:var(--text2);background:var(--bg);padding:8px 10px;border-radius:6px;border:1px solid var(--border);">${this._esc(matchedPara.text)}</div>`;
        html += `</div>`;
      }
    }

    html += `<div class="para-selector" id="selector-${opt.id}">`;
    (this.data.passage.paragraphs || []).forEach(para => {
      const sel = this.matches[opt.id] === para.id ? ' selected' : '';
      const disabled = isGaveUp ? ' disabled' : '';
      html += `<div class="para-select-btn${sel}${disabled}" data-para="${para.id}" onclick="window._engine.selectPara(${opt.id},'${para.id}')">${para.id}</div>`;
    });
    html += `</div>`;
    const giveupLabel = isGaveUp ? '恢复' : '放弃';
    const giveupCls = isGaveUp ? 'giveup-btn undo' : 'giveup-btn';
    const giveupActive = isGaveUp ? ' active' : '';
    html += `<div style="margin-top:6px;">`;
    html += `<span class="giveup-hint${isOT && !isMatched && !isGaveUp ? ' show' : ''}" id="hint-${opt.id}">建议放弃（超过60秒）</span>`;
    html += `<button class="${giveupCls}${giveupActive}" id="giveup-btn-${opt.id}" onclick="window._engine.toggleGiveUp(${opt.id})">${giveupLabel}</button>`;
    html += `</div>`;
    html += `</div>`;
    return html;
  }

  toggleParaExpand(optId) {
    const content = document.getElementById('para-content-' + optId);
    const toggle = document.getElementById('para-toggle-' + optId);
    if (!content || !toggle) return;
    if (content.style.display === 'none') {
      content.style.display = 'block';
      const matchedParaId = this.matches[optId];
      toggle.textContent = '📄 收起段落 ' + matchedParaId;
    } else {
      content.style.display = 'none';
      const matchedParaId = this.matches[optId];
      toggle.textContent = '📄 展开段落 ' + matchedParaId;
    }
  }

  _renderPhase3(container) {
    const div = document.createElement('div');
    div.className = 'phase';
    div.id = 'phase-3';
    const p = this.data.phases.phase3;

    let html = `<div class="card"><div class="card-title">${p.title}`;
    if (p.source) html += ` <span class="tag tag-green">${p.source}</span>`;
    html += `</div>`;

    html += this._renderScoreDisplay();

    if (p.instruction) {
      html += `<div style="font-size:13px;color:var(--text2);margin-bottom:10px;">${p.instruction}</div>`;
    }

    html += `<div style="display:grid;gap:6px;">`;
    (this.data.answers || []).forEach(ans => {
      const userAnswer = this.matches[ans.id];
      const isGaveUp = this.gaveUps.has(ans.id);
      const isOT = this.otItems.has(ans.id);
      const isCorrect = userAnswer === ans.correct;

      let bg, border;
      if (isGaveUp) { bg = 'var(--warn-light)'; border = 'var(--warn)'; }
      else if (isCorrect) { bg = '#f0fdf4'; border = 'var(--success)'; }
      else { bg = '#fff5f5'; border = 'var(--error)'; }

      const icon = isGaveUp ? '⚠️ 放弃' : isCorrect ? '✅' : '❌';
      const userDisplay = isGaveUp ? '(放弃)' : (userAnswer || '未做');
      const timing = this.timings[ans.id] || 0;
      const timingStr = timing > 0 ? `⏱ ${this._fmtTime(timing)}` : '';
      const otTag = isOT ? ' <span style="font-size:10px;color:var(--error);">超时</span>' : '';

      const userLocateWords = this.locateWord ? this.locateWord.getForOption(ans.id) : [];
      const correctLocateWords = this._getCorrectLocateWords(ans.id);
      const locateCompare = this._renderLocateCompare(userLocateWords, correctLocateWords);

      html += `<div style="background:${bg};border:1px solid ${border};border-radius:8px;padding:10px;">`;
      html += `<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px;">`;
      html += `<span><b>${ans.id}.</b> ${icon} ${timingStr}${otTag}</span>`;
      html += `<span style="font-size:11px;color:var(--text2);">你的: ${userDisplay} → 正确答案: ${ans.correct}</span>`;
      html += `</div>`;
      if (ans.tip) {
        html += `<div style="font-size:12px;color:var(--text2);margin-top:4px;">${ans.tip}</div>`;
      }
      if (locateCompare) {
        html += locateCompare;
      }
      html += `</div>`;
    });
    html += `</div>`;

    html += `</div>`;
    div.innerHTML = html;
    container.appendChild(div);
  }

  _getCorrectLocateWords(optId) {
    const opt = (this.data.options || []).find(o => o.id === optId);
    if (!opt || !opt.locateWords) return [];
    const result = [];
    if (opt.locateWords.properNoun) result.push(...opt.locateWords.properNoun);
    if (opt.locateWords.normalNoun) result.push(...opt.locateWords.normalNoun);
    if (opt.locateWords.comparative) result.push(...opt.locateWords.comparative);
    return result;
  }

  _renderLocateCompare(userWords, correctWords) {
    if (userWords.length === 0 && correctWords.length === 0) return '';
    let html = `<div class="locate-compare">`;
    html += `<div style="font-size:11px;font-weight:600;margin-bottom:4px;">📍 定位词对比</div>`;
    html += `<div style="font-size:11px;display:flex;gap:12px;flex-wrap:wrap;">`;
    html += `<span>你标记: ${userWords.length > 0 ? userWords.map(w => `<span class="locate-compare-tag user">${this._esc(w)}</span>`).join(' ') : '<span style="color:var(--text3);">未标记</span>'}</span>`;
    html += `<span>正确: ${correctWords.length > 0 ? correctWords.map(w => `<span class="locate-compare-tag correct">${this._esc(w)}</span>`).join(' ') : '<span style="color:var(--text3);">无</span>'}</span>`;
    html += `</div>`;

    if (userWords.length > 0 && correctWords.length > 0) {
      const hits = userWords.filter(w => correctWords.map(c => c.toLowerCase()).includes(w.toLowerCase()));
      if (hits.length > 0) {
        html += `<div style="font-size:10px;color:var(--success);margin-top:2px;">✅ 命中 ${hits.length}/${userWords.length} 个定位词</div>`;
      } else {
        html += `<div style="font-size:10px;color:var(--error);margin-top:2px;">❌ 未命中任何正确定位词</div>`;
      }
    }
    html += `</div>`;
    return html;
  }

  _renderPhase4(container) {
    const div = document.createElement('div');
    div.className = 'phase';
    div.id = 'phase-4';
    const p = this.data.phases.phase4;

    let html = '';

    if (p.summary) {
      html += `<div class="center-box"><div class="label">${p.summary.title}</div><div style="font-size:13px;">${p.summary.content}</div></div>`;
    }

    html += this._renderTimingChart();

    html += this._renderGiveupSummary();

    html += this._renderLocateWordStats();

    html += this._renderSynonymMapping();

    if (p.skillStats) {
      html += `<div class="card"><div class="card-title">${p.skillStats.title}</div>`;
      html += `<div class="skill-grid">`;
      (p.skillStats.items || []).forEach(skill => {
        html += `<div class="skill-item"><div class="num">${skill.name}</div><div style="color:var(--text2);">${skill.desc}</div><div style="font-size:10px;color:var(--text3);">${skill.questionIds || ''}</div></div>`;
      });
      html += `</div></div>`;
    }

    if (p.pitfalls) {
      html += `<div class="tip-box"><strong>${p.pitfalls.title}</strong><br>${p.pitfalls.content}</div>`;
    }

    if (p.vocabSummary && p.vocabSummary.words) {
      html += `<div class="card"><div class="card-title">${p.vocabSummary.title}</div>`;
      html += `<div class="vocab-grid">`;
      p.vocabSummary.words.forEach(w => {
        html += `<div class="vocab-grid-item">${w}</div>`;
      });
      html += `</div></div>`;
    }

    html += `<div style="margin-top:20px;display:flex;gap:8px;flex-wrap:wrap;">
      <button class="btn btn-accent" onclick="window._vocab.exportMarkdown('${this.data.meta.title || '生词本'}')">导出 .md 生词本</button>
      <button class="btn btn-danger" onclick="window._vocab.clear()">清空生词本</button>
    </div>`;

    div.innerHTML = html;
    container.appendChild(div);
  }

  _renderLocateWordStats() {
    if (!this.locateWord) return '';
    const data = this.locateWord.getAll();
    const allMarked = Object.entries(data);
    if (allMarked.length === 0) return '';

    let html = `<div class="card"><div class="card-title">📍 定位词标记统计</div>`;
    html += `<div style="font-size:11px;color:var(--text3);margin-bottom:8px;">你在 Phase 2 中标记的定位词 vs 正确答案的定位词</div>`;

    let totalMarked = 0;
    let totalHits = 0;

    allMarked.forEach(([optId, words]) => {
      const correctWords = this._getCorrectLocateWords(parseInt(optId));
      const hits = words.filter(w => correctWords.map(c => c.toLowerCase()).includes(w.toLowerCase()));
      totalMarked += words.length;
      totalHits += hits.length;

      html += `<div class="locate-stat-item">`;
      html += `<span class="locate-stat-id">${optId}题</span>`;
      html += `<span class="locate-stat-words">`;
      words.forEach(w => {
        const isHit = correctWords.map(c => c.toLowerCase()).includes(w.toLowerCase());
        html += `<span class="locate-stat-tag ${isHit ? 'hit' : 'miss'}">${this._esc(w)}</span>`;
      });
      html += `</span>`;
      html += `<span class="locate-stat-result">${hits.length}/${words.length} 命中</span>`;
      html += `</div>`;
    });

    html += `<div class="locate-stat-summary">`;
    html += `总计标记 ${totalMarked} 个定位词，命中 ${totalHits} 个`;
    if (totalMarked > 0) {
      const pct = Math.round(totalHits / totalMarked * 100);
      html += ` (${pct}%)`;
      if (pct >= 70) html += ` — 定位能力不错！`;
      else if (pct >= 40) html += ` — 还需练习识别定位词。`;
      else html += ` — 定位词选择偏差较大，建议复习三层定位法。`;
    }
    html += `</div>`;
    html += `</div>`;
    return html;
  }

  _renderScoreDisplay() {
    const total = (this.data.answers || []).length;
    let score = 0;
    let answered = 0;
    let gaveUp = this.gaveUps.size;

    (this.data.answers || []).forEach(a => {
      if (this.gaveUps.has(a.id)) { answered++; return; }
      if (this.matches[a.id] !== undefined) answered++;
      if (this.matches[a.id] === a.correct) score++;
    });

    let desc = '';
    if (answered === 0) desc = '暂未匹配任何题';
    else if (answered < total) desc = `已做 ${answered - gaveUp}/${total} 题，放弃 ${gaveUp} 题，正确 ${score} 题`;
    else {
      desc = `全部完成 · 正确 ${score}/${total} 题 · 放弃 ${gaveUp} 题`;
    }

    const okPct = total > 0 ? score / total : 0;
    const failPct = total > 0 ? (answered - gaveUp - score) / total : 0;
    const gaveUpPct = total > 0 ? gaveUp / total : 0;
    const remainingPct = Math.max(0, 1 - okPct - failPct - gaveUpPct);

    return `
      <div class="score-display">
        <div class="score-num">${score}/${total}</div>
        <div>
          <div style="font-weight:600;font-size:15px;">${desc}</div>
          <div style="font-size:12px;color:var(--text2);">
            ${Object.values(this.timings).reduce((a,b) => a+b, 0) > 0 ? '总用时: ' + this._fmtTime(Object.values(this.timings).reduce((a,b) => a+b, 0)) : ''}
          </div>
        </div>
      </div>
      <div class="progress-bar" style="margin-bottom:12px;">
        <div class="ok" style="flex:${Math.max(okPct * 100, 0)};"></div>
        <div class="fail" style="flex:${Math.max(failPct * 100, 0)};"></div>
        ${gaveUpPct > 0 ? `<div style="flex:${gaveUpPct * 100};background:var(--warn);"></div>` : ''}
        ${remainingPct > 0 ? `<div style="flex:${remainingPct * 100};background:#e0e0e0;"></div>` : ''}
      </div>`;
  }

  _renderTimingChart() {
    if (Object.keys(this.timings).length === 0) return '<div class="card" style="text-align:center;color:var(--text2);padding:20px;">无计时数据</div>';

    const maxTime = Math.max(...Object.values(this.timings), 10);
    const maxHeight = 130;

    let html = `<div class="card"><div class="card-title">⏱ 耗时分布图</div>`;
    html += `<div style="font-size:11px;color:var(--text3);margin-bottom:8px;">绿色 ≤ 60s · 黄色 60-90s · 红色 > 90s · 灰色 = 放弃</div>`;
    html += `<div class="timing-chart">`;

    (this.data.options || []).forEach(opt => {
      const time = this.timings[opt.id] || 0;
      const isGaveUp = this.gaveUps.has(opt.id);
      const isCorrect = this.matches[opt.id] === opt.correct;

      let barClass = 'normal';
      if (isGaveUp) barClass = 'gaveup';
      else if (time > 90) barClass = 'danger';
      else if (time > 60) barClass = 'warn';
      else barClass = 'normal';

      const height = Math.max(4, Math.min(maxHeight, (time / maxTime) * maxHeight));

      html += `<div class="timing-bar-group">`;
      html += `<div class="timing-bar ${barClass}" style="height:${height}px;" title="${opt.id}题: ${time}s${isGaveUp ? ' (放弃)' : ''}${isCorrect ? ' ✅' : ' ❌'}"></div>`;
      html += `<div class="timing-bar-value">${this._fmtTime(time)}</div>`;
      html += `<div class="timing-bar-label">${opt.id}</div>`;
      html += `</div>`;
    });

    html += `</div></div>`;
    return html;
  }

  _renderGiveupSummary() {
    if (this.gaveUps.size === 0 && this.otItems.size === 0) return '';

    let html = `<div class="giveup-summary"><div class="title">🎯 放弃策略评估</div>`;

    if (this.gaveUps.size > 0) {
      html += `<div style="font-weight:600;font-size:12px;margin-bottom:4px;">主动放弃的题 (${this.gaveUps.size}道)：</div>`;
      this.gaveUps.forEach(id => {
        const correct = (this.data.answers || []).find(a => a.id === id);
        const wasCorrectAnswer = correct ? correct.correct : '?';
        html += `<div class="giveup-item">`;
        html += `<span>${id}题</span>`;
        html += `<span class="reason">正确答案: ${wasCorrectAnswer} — 你放弃了这个题是合理的吗？</span>`;
        html += `</div>`;
      });
    }

    if (this.otItems.size > 0) {
      html += `<div style="font-weight:600;font-size:12px;margin-top:8px;margin-bottom:4px;">超时未完成的题 (${this.otItems.size}道)：</div>`;
      this.otItems.forEach(id => {
        if (this.gaveUps.has(id) || this.matches[id] !== undefined) return;
        html += `<div class="giveup-item">`;
        html += `<span>${id}题</span>`;
        html += `<span class="reason">超过1分钟仍未能定位 — 下次直接放弃</span>`;
        html += `</div>`;
      });
    }

    html += `</div>`;
    return html;
  }

  _renderSynonymMapping() {
    const mappings = (this.data.options || []).filter(o => o.synonymMapping && o.synonymMapping.trim());
    if (mappings.length === 0) return '';

    let html = `<div class="card"><div class="card-title">🔄 同义替换展示</div>`;
    mappings.forEach(opt => {
      html += `<div class="synonym-box">`;
      html += `<div style="font-weight:600;margin-bottom:4px;">${opt.id}题 → ${opt.correctPara || '?'}段</div>`;
      html += `<div class="map-item">`;
      html += `<span class="opt-text">${this._esc(opt.text.substring(0, 80))}${opt.text.length > 80 ? '...' : ''}</span>`;
      html += `</div>`;
      html += `<div class="map-item" style="font-size:11px;color:var(--text2);">${this._esc(opt.synonymMapping)}</div>`;
      html += `</div>`;
    });
    html += `</div>`;
    return html;
  }

  _updateTimerDisplay() {
    if (!this._timerEl) return;
    const mins = Math.floor(this.remainingSeconds / 60);
    const secs = this.remainingSeconds % 60;
    this._timerEl.textContent = `${mins}:${String(secs).padStart(2, '0')}`;

    this._timerEl.classList.remove('warning', 'danger');
    if (this.remainingSeconds <= 60) {
      this._timerEl.classList.add('danger');
    } else if (this.remainingSeconds <= 300) {
      this._timerEl.classList.add('warning');
    }

    const segmentEl = document.getElementById('timer-segments');
    if (segmentEl) {
      const done = this.data.options ? this.data.options.filter(o => this.matches[o.id] !== undefined || this.gaveUps.has(o.id)).length : 0;
      const total = (this.data.options || []).length;
      segmentEl.textContent = `已完成 ${done}/${total} · 放弃 ${this.gaveUps.size}`;
    }
  }

  _fmtTime(seconds) {
    if (seconds < 60) return seconds + 's';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m + 'm' + s + 's';
  }

  _esc(s) {
    if (!s) return '';
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  startTimer() {
    if (this.timerRunning) return;
    this.timerRunning = true;
    this.timerInterval = setInterval(() => {
      this.remainingSeconds--;
      this._updateTimerDisplay();

      const currentMin = Math.floor(this.remainingSeconds / 60);
      if (this.warnMinutes.includes(currentMin) && this.lastWarnedMinute !== currentMin) {
        this.lastWarnedMinute = currentMin;
        this._showTimerWarning(currentMin);
      }

      if (this.currentFocus && this.questionStartTime) {
        const elapsed = Math.floor((Date.now() - this.questionStartTime) / 1000);
        this.questionElapsed[this.currentFocus] = elapsed;
        this._updateQuestionTimer(this.currentFocus, elapsed);
        if (elapsed > this.perQuestionLimit && !this.matches[this.currentFocus] && !this.gaveUps.has(this.currentFocus)) {
          this.otItems.add(this.currentFocus);
          const hint = document.getElementById('hint-' + this.currentFocus);
          if (hint) hint.classList.add('show');
        }
      }

      if (this.remainingSeconds <= 0) {
        this.stopTimer();
        this._showTimerWarning(0);
      }
    }, 1000);
  }

  stopTimer() {
    this.timerRunning = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.currentFocus && this.questionStartTime) {
      this._recordTiming(this.currentFocus);
    }
  }

  _showTimerWarning(minutes) {
    const msg = minutes === 0 ? '⏰ 时间到！请停止做题，进入对答案阶段。' : `⏰ 剩余 ${minutes} 分钟！`;
    const info = document.getElementById('timer-info-text');
    if (info) {
      info.textContent = msg;
      info.style.color = minutes <= 1 ? 'var(--error)' : 'var(--warn)';
      info.style.fontWeight = '600';
      setTimeout(() => {
        info.textContent = `总时长 15分钟 · 每题不超过 60秒 · 目标 7-8 道`;
        info.style.color = '';
        info.style.fontWeight = '';
      }, 3000);
    }
  }

  _updateQuestionTimer(optId, elapsed) {
    const el = document.getElementById('qtimer-' + optId);
    if (el) {
      el.textContent = this._fmtTime(elapsed);
      if (elapsed > this.perQuestionLimit) {
        el.classList.add('over');
      }
    }
  }

  _recordTiming(optId) {
    if (!optId || !this.questionStartTime) return;
    const elapsed = Math.floor((Date.now() - this.questionStartTime) / 1000);
    this.timings[optId] = (this.timings[optId] || 0) + elapsed;
    this.questionElapsed[optId] = 0;
    const el = document.getElementById('qtimer-' + optId);
    if (el) { el.textContent = ''; el.classList.remove('over'); }
    this.questionStartTime = null;
    this.currentFocus = null;
  }

  focusOption(optId) {
    if (optId === this.currentFocus) return;
    if (this.currentFocus) {
      this._recordTiming(this.currentFocus);
    }
    if (this.gaveUps.has(optId)) return;
    this.currentFocus = optId;
    this.questionStartTime = Date.now();
    this.questionElapsed[optId] = 0;
  }

  selectPara(optId, paraId) {
    if (this.gaveUps.has(optId)) return;

    this.focusOption(optId);

    const prevMatch = this.matches[optId];
    if (prevMatch === paraId) {
      delete this.matches[optId];
    } else {
      this.matches[optId] = paraId;
      this.otItems.delete(optId);
    }

    this._recordTiming(optId);
    this.questionStartTime = Date.now();
    this.questionElapsed[optId] = 0;

    this._saveProgress();
    this._refreshPhase2UI();
    this._updateTimerDisplay();
  }

  toggleGiveUp(optId) {
    if (this.gaveUps.has(optId)) {
      this.gaveUps.delete(optId);
      this.otItems.delete(optId);
      delete this.matches[optId];
    } else {
      this.gaveUps.add(optId);
      this.otItems.delete(optId);
      if (this.currentFocus === optId) {
        this._recordTiming(optId);
      }
      delete this.matches[optId];
    }
    this._saveProgress();
    this._refreshPhase2UI();
  }

  addLocateWord(optId, word) {
    if (!this.locateWord) return;
    this.locateWord.add(optId, word);
    this._renderLocateWordPanel();
    this.locateWord.applyToDOM();
  }

  removeLocateWord(optId, word) {
    if (!this.locateWord) return;
    this.locateWord.remove(optId, word);
    this._renderLocateWordPanel();
    this.reRenderCurrentPhase();
  }

  _renderLocateWordPanel() {
    const container = document.getElementById('locateword-list');
    const countEl = document.getElementById('locateword-count');
    if (!container) return;
    if (!this.locateWord) {
      container.innerHTML = '<div class="locateword-empty">选中单词 → 点击"标记为定位词"</div>';
      return;
    }
    const data = this.locateWord.getAll();
    const total = this.locateWord.count();
    if (countEl) countEl.textContent = total;
    if (total === 0) {
      container.innerHTML = '<div class="locateword-empty">选中单词 → 点击"标记为定位词"</div>';
      return;
    }
    let html = '';
    Object.entries(data).forEach(([optId, words]) => {
      words.forEach((w, i) => {
        html += `<div class="locateword-item">
          <div><span class="lw-id">${optId}题</span> <span class="lw-word">${this._esc(w)}</span></div>
          <span class="del" onclick="window._engine.removeLocateWord(${optId},'${this._esc(w)}');">✕</span>
        </div>`;
      });
    });
    container.innerHTML = html;
  }

  _refreshPhase2UI() {
    const passageEl = document.getElementById('match-passage');
    const optionsEl = document.getElementById('match-options');
    if (!passageEl || !optionsEl) return;

    const paragraphs = this.data.passage.paragraphs || [];
    passageEl.innerHTML = '';
    paragraphs.forEach(para => {
      const matchedIds = [];
      Object.entries(this.matches).forEach(([optId, paraId]) => {
        if (paraId === para.id) matchedIds.push(optId);
      });
      const isMatched = matchedIds.length > 0;
      const div = document.createElement('div');
      div.className = 'para-block' + (isMatched ? ' matched' : '');
      div.setAttribute('data-para', para.id);
      div.id = 'para-' + para.id;
      div.innerHTML = `
        <div class="para-header">
          <span class="para-badge">${para.id}</span>
          ${isMatched ? '<span class="para-matched-tags">' + matchedIds.map(id => `<span class="para-matched-tag">${id}</span>`).join('') + '</span>' : ''}
        </div>
        <div class="para-text">${this._esc(para.text)}</div>`;
      passageEl.appendChild(div);
    });

    optionsEl.innerHTML = '';
    (this.data.options || []).forEach(opt => {
      const card = document.createElement('div');
      card.innerHTML = this._buildOptionCard(opt);
      const cardEl = card.firstChild;
      cardEl.onclick = function(e) {
        if (e.target.closest('.para-select-btn') || e.target.closest('.giveup-btn') || e.target.closest('.matched-para-toggle')) return;
        window._engine.focusOption(opt.id);
      };
      optionsEl.appendChild(cardEl);
    });

    if (this.locateWord) this.locateWord.applyToDOM();
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

    if (phase === '2') {
      const timerBar = document.getElementById('timer-bar');
      if (timerBar) timerBar.style.display = 'flex';
      if (!this.timerRunning) this.startTimer();
    } else {
      const timerBar = document.getElementById('timer-bar');
      if (timerBar) timerBar.style.display = 'none';
      if (this.timerRunning && phase !== '2') this.stopTimer();
    }

    if (phase === '3') {
      this._refreshPhase3();
    }

    this._renderSidePanels();
  }

  _refreshPhase3() {
    const phase3El = document.getElementById('phase-3');
    if (!phase3El) return;
    const card = phase3El.querySelector('.card');
    if (!card) return;
    const scoreHTML = this._renderScoreDisplay();
    const existingScore = card.querySelector('.score-display');
    if (existingScore) {
      existingScore.outerHTML = scoreHTML;
    }
  }

  _renderSidePanels() {
    this._renderVocabPanel();
    this._renderAnnotatePanel();
    this._renderLocateWordPanel();
  }

  _renderVocabPanel() {
    const list = this.vocab ? this.vocab.getAll() : [];
    const countEl = document.getElementById('vocab-count');
    const countHeader = document.getElementById('vocab-header-count');
    const container = document.getElementById('vocab-list');
    if (countEl) countEl.textContent = list.length;
    if (countHeader) countHeader.textContent = list.length + ' 词';
    if (!container) return;
    if (list.length === 0) {
      container.innerHTML = '<div class="vocab-empty">选中任意单词 → 弹出"加入生词本"</div>';
      return;
    }
    container.innerHTML = list.map((w, i) =>
      `<div class="vocab-item">
        <div><div class="word">${this._esc(w.word)}</div><div class="src">${w.source || ''}</div></div>
        <span class="del" onclick="window._vocab.remove(${i});window._engine._renderVocabPanel();">✕</span>
      </div>`
    ).join('');
  }

  _renderAnnotatePanel() {
    const list = this.annotate ? this.annotate.getAll() : [];
    const countEl = document.getElementById('annotate-count');
    const container = document.getElementById('annotate-list');
    if (countEl) countEl.textContent = list.length;
    if (!container) return;
    if (list.length === 0) {
      container.innerHTML = '<div class="annotate-empty">选中文字 → 点击"划线标注"</div>';
      return;
    }
    container.innerHTML = list.map((a, i) =>
      `<div class="annotate-item">
        <div>
          <div class="a-text">${this._esc(a.text)}</div>
          <div class="a-para">¶${(a.paraIdx + 1) || '-'}</div>
          ${a.annotation ? `<div class="a-note">${this._esc(a.annotation)}</div>` : ''}
        </div>
        <span class="del" onclick="window._annotate.remove(${i});window._engine._renderAnnotatePanel();">✕</span>
      </div>`
    ).join('');
  }

  reRenderCurrentPhase() {
    this.renderAll();
    this.switchPhase(this.currentPhase);
  }
}
