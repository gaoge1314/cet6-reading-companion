class CET6ClozeEngine {
  constructor(data, vocab, annotate, examId) {
    this.data = data;
    this.vocab = vocab;
    this.annotate = annotate;
    this.selectedWords = {};
    this.progressKey = CET6Utils.storageKeys.examsState + '-' + examId + '-cloze';
    this.currentPhase = '1';
    this._containerSelector = null;
    this._loadProgress();
  }

  _loadProgress() {
    try {
      const saved = JSON.parse(localStorage.getItem(this.progressKey) || '{}');
      this.selectedWords = saved.selectedWords || {};
      this.currentPhase = saved.currentPhase || '1';
    } catch (e) {
      this.selectedWords = {};
      this.currentPhase = '1';
    }
  }

  _saveProgress() {
    localStorage.setItem(this.progressKey, JSON.stringify({
      selectedWords: this.selectedWords,
      currentPhase: this.currentPhase,
      time: new Date().toISOString()
    }));
  }

  init(containerSelector) {
    this._containerSelector = containerSelector;
    const target = document.querySelector(containerSelector);
    if (!target) return;
    target.innerHTML = '';
    this._renderPhase1(target);
    this._renderPhase2(target);
    this._renderPhase3(target);
    this.switchPhase(this.currentPhase);
    this._renderAnswerCard();
    this.updateSidebar();
  }

  reRenderCurrentPhase() {
    const target = document.querySelector('#main-content');
    if (!target) return;
    target.innerHTML = '';
    this._renderPhase1(target);
    this._renderPhase2(target);
    this._renderPhase3(target);
    this.switchPhase(this.currentPhase);
    this._renderAnswerCard();
    this.updateSidebar();
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

    this.updateSidebar();
    this._renderAnswerCard();
  }

  selectWord(blankId, bankLetter) {
    const banks = this.data.banks || [];
    const bankItem = banks.find(b => b.letter === bankLetter);
    if (!bankItem) return;

    this.selectedWords[blankId] = bankLetter;
    this._saveProgress();

    this._refreshPhase1UI();
    this._renderAnswerCard();
  }

  removeWord(blankId) {
    delete this.selectedWords[blankId];
    this._saveProgress();
    this._refreshPhase1UI();
    this._renderAnswerCard();
  }

  _getPosClass(pos) {
    if (!pos) return 'pos-other';
    const p = pos.toLowerCase().trim();
    if (p.startsWith('n')) return 'pos-n';
    if (p.startsWith('v')) return 'pos-v';
    if (p.startsWith('adj')) return 'pos-adj';
    if (p.startsWith('adv')) return 'pos-adv';
    return 'pos-other';
  }

  _renderBlankSlot(blankId) {
    const selected = this.selectedWords[blankId];
    if (selected) {
      const banks = this.data.banks || [];
      const bankItem = banks.find(b => b.letter === selected);
      const display = bankItem ? `${selected}. ${bankItem.word}` : selected;

      const blanksWithSame = Object.entries(this.selectedWords)
        .filter(([b, l]) => l === selected && parseInt(b) !== blankId);

      if (blanksWithSame.length > 0) {
        const otherBlanks = blanksWithSame.map(([b]) => b).join('/');
        return `<span class="blank-slot conflict" data-blank="${blankId}" title="与空位${otherBlanks}选择了同一个词！" onclick="window._engine.removeWord(${blankId})">${display} ⚠</span>`;
      }
      return `<span class="blank-slot filled" data-blank="${blankId}" onclick="window._engine.removeWord(${blankId})">${display}</span>`;
    }
    return `<span class="blank-slot" data-blank="${blankId}" onclick="window._engine._showBankSelector(${blankId})">___${blankId}___</span>`;
  }

  _showBankSelector(blankId) {
    this._activeBlankId = blankId;

    const overlay = document.createElement('div');
    overlay.className = 'bank-selector-overlay';
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this._closeModal();
    });

    const modal = document.createElement('div');
    modal.className = 'bank-selector-modal';

    const banks = this.data.banks || [];
    const posGroups = {};
    const posOrder = ['n.', 'v.', 'adj.', 'adv.'];
    const posLabels = { 'n.': '名词', 'v.': '动词', 'adj.': '形容词', 'adv.': '副词' };

    banks.forEach(b => {
      const key = b.pos.split('/')[0].trim();
      if (!posGroups[key]) posGroups[key] = [];
      posGroups[key].push(b);
    });

    let html = `<div class="modal-header">
      <span>选择词 — 空位 ${blankId}</span>
      <button class="modal-close" onclick="window._engine._closeModal()">✕</button>
    </div>`;

    html += `<div class="modal-bank-list">`;

    posOrder.forEach(pos => {
      const group = posGroups[pos];
      if (!group || group.length === 0) return;
      html += `<div class="modal-pos-group">
        <div class="modal-pos-title">${posLabels[pos] || pos} (${group.length}个)</div>`;
      group.forEach(b => {
        const isSelected = Object.values(this.selectedWords).includes(b.letter);
        html += `<div class="modal-bank-item${isSelected ? ' selected' : ''}"
          onclick="window._engine._onModalSelect(${blankId},'${b.letter}')">
          <span class="m-letter">${b.letter}</span>
          <span class="m-word">${CET6Utils.esc(b.word)}</span>
          <span class="m-pos ${this._getPosClass(b.pos)}">${b.pos}</span>
          <span class="m-meaning">${CET6Utils.esc(b.meaning || '')}</span>
        </div>`;
      });
      html += `</div>`;
    });

    const knownPos = posOrder.concat(['n./v.', 'other']);
    Object.keys(posGroups).forEach(k => {
      if (!knownPos.includes(k)) {
        const group = posGroups[k];
        if (!group || group.length === 0) return;
        html += `<div class="modal-pos-group">
          <div class="modal-pos-title">其他 (${group.length}个)</div>`;
        group.forEach(b => {
          const isSelected = Object.values(this.selectedWords).includes(b.letter);
          html += `<div class="modal-bank-item${isSelected ? ' selected' : ''}"
            onclick="window._engine._onModalSelect(${blankId},'${b.letter}')">
            <span class="m-letter">${b.letter}</span>
            <span class="m-word">${CET6Utils.esc(b.word)}</span>
            <span class="m-pos ${this._getPosClass(b.pos)}">${b.pos}</span>
            <span class="m-meaning">${CET6Utils.esc(b.meaning || '')}</span>
          </div>`;
        });
        html += `</div>`;
      }
    });

    html += `</div>`;

    const currentSelection = this.selectedWords[blankId];
    if (currentSelection) {
      html += `<div class="modal-footer">
        <button class="modal-remove-btn" onclick="window._engine.removeWord(${blankId});window._engine._closeModal()">清除选择</button>
      </div>`;
    }

    modal.innerHTML = html;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    this._modalOverlay = overlay;
  }

  _closeModal() {
    if (this._modalOverlay) {
      this._modalOverlay.remove();
      this._modalOverlay = null;
    }
    this._activeBlankId = null;
  }

  _onModalSelect(blankId, letter) {
    this.selectWord(blankId, letter);
    this._closeModal();
  }

  _renderPhase1(container) {
    const div = document.createElement('div');
    div.className = 'phase';
    div.id = 'phase-1';
    const p = this.data.phases.phase1;
    const answers = this.data.answers || [];

    let html = '';

    if (p.instruction) {
      html += `<div class="instruction-box">${p.instruction.title} · ${p.instruction.content}</div>`;
    }

    if (p.showBanks) {
      html += `<div class="card">`;
      html += `<div class="card-title">候选词</div>`;
      html += `<div id="blank-hint" style="display:none;font-size:12px;color:var(--accent);margin-bottom:8px;font-weight:500;"></div>`;
      html += this._renderBankGrid();
      html += `</div>`;
    }

    if (p.showPassage) {
      html += `<div class="card"><div class="card-title">文章原文</div>`;
      html += `<div class="cloze-passage-sentences">`;
      const paragraphs = this.data.passage.paragraphs || [];
      paragraphs.forEach((para, idx) => {
        const sentences = this._splitParagraphIntoSentences(para);
        html += `<div class="para-group" data-para="${idx}">`;
        sentences.forEach(sentence => {
          if (sentence.blankIds.length > 0) {
            html += `<div class="sentence-card">`;
            let sentenceHtml = CET6Utils.esc(sentence.text);
            sentenceHtml = sentenceHtml.replace(/___\{(\d+)\}___/g, (match, blankId) => {
              return this._renderBlankSlot(parseInt(blankId));
            });
            html += `<div class="sentence-text">${sentenceHtml}</div>`;

            sentence.blankIds.forEach(blankId => {
              const ans = answers.find(a => a.blank === blankId);
              if (ans && ans.sentenceAnalysis) {
                html += `<div class="sentence-analysis">💭 ${CET6Utils.esc(ans.sentenceAnalysis)}</div>`;
              }
            });
            html += `</div>`;
          } else {
            html += `<span class="sentence-plain">${CET6Utils.esc(sentence.text)}</span>`;
          }
        });
        html += `</div>`;
      });
      html += `</div></div>`;
    }

    div.innerHTML = html;
    container.appendChild(div);
  }

  _splitParagraphIntoSentences(paraText) {
    const sentences = paraText.split(/(?<=[.!?])\s+(?=[A-Z])/);
    return sentences.map(s => {
      const blankIds = [];
      let dummy = s;
      dummy.replace(/___\{(\d+)\}___/g, (match, id) => {
        blankIds.push(parseInt(id));
        return match;
      });
      return { text: s.trim(), blankIds };
    });
  }

  _renderBankGrid() {
    const banks = this.data.banks || [];
    const posGroups = {};
    const posOrder = ['n.', 'v.', 'adj.', 'adv.'];
    const posLabels = { 'n.': '名词', 'v.': '动词', 'adj.': '形容词', 'adv.': '副词' };

    banks.forEach(b => {
      const pos = b.pos || 'other';
      const key = pos.split('/')[0].trim();
      if (!posGroups[key]) posGroups[key] = [];
      posGroups[key].push(b);
    });

    let html = '';

    posOrder.forEach(pos => {
      const group = posGroups[pos];
      if (!group || group.length === 0) return;
      html += `<div class="bank-section-title">${posLabels[pos] || pos}</div>`;
      html += `<div class="bank-grid" id="bank-grid">`;
      group.forEach(b => {
        const isSelected = Object.values(this.selectedWords).includes(b.letter);
        const posClass = this._getPosClass(b.pos);
        html += `<div class="bank-item${isSelected ? ' selected' : ''}" data-letter="${b.letter}" onclick="window._engine._onBankClick('${b.letter}')">`;
        html += `<span class="letter">${b.letter}</span>`;
        html += `<span class="word-text">${CET6Utils.esc(b.word)}</span>`;
        html += `<span class="word-meaning">${CET6Utils.esc(b.meaning || '')}</span>`;
        html += `<span class="pos-tag ${posClass}">${b.pos}</span>`;
        if (b.bankAnalysis) {
          html += `<span class="bank-analysis">${CET6Utils.esc(b.bankAnalysis).substring(0, 42)}</span>`;
        }
        html += `</div>`;
      });
      html += `</div>`;
    });

    const otherGroup = posGroups['other'] || posGroups['n./v.'] || [];
    if (otherGroup.length > 0 && !posOrder.includes(Object.keys(posGroups).find(k => posGroups[k] === otherGroup) || '')) {
      html += `<div class="bank-section-title">其他</div>`;
      html += `<div class="bank-grid" id="bank-grid">`;
      otherGroup.forEach(b => {
        const isSelected = Object.values(this.selectedWords).includes(b.letter);
        const posClass = this._getPosClass(b.pos);
        html += `<div class="bank-item${isSelected ? ' selected' : ''}" data-letter="${b.letter}" onclick="window._engine._onBankClick('${b.letter}')">`;
        html += `<span class="letter">${b.letter}</span>`;
        html += `<span class="word-text">${CET6Utils.esc(b.word)}</span>`;
        html += `<span class="word-meaning">${CET6Utils.esc(b.meaning || '')}</span>`;
        html += `<span class="pos-tag ${posClass}">${b.pos}</span>`;
        if (b.bankAnalysis) {
          html += `<span class="bank-analysis">${CET6Utils.esc(b.bankAnalysis).substring(0, 42)}</span>`;
        }
        html += `</div>`;
      });
      html += `</div>`;
    }

    if (Object.keys(posGroups).length === 0 || (Object.keys(posGroups).every(k => posOrder.includes(k)) && Object.values(posGroups).every(g => g.length === 0))) {
      html += `<div class="bank-grid" id="bank-grid">`;
      banks.forEach(b => {
        const isSelected = Object.values(this.selectedWords).includes(b.letter);
        const posClass = this._getPosClass(b.pos);
        html += `<div class="bank-item${isSelected ? ' selected' : ''}" data-letter="${b.letter}" onclick="window._engine._onBankClick('${b.letter}')">`;
        html += `<span class="letter">${b.letter}</span>`;
        html += `<span class="word-text">${CET6Utils.esc(b.word)}</span>`;
        html += `<span class="word-meaning">${CET6Utils.esc(b.meaning || '')}</span>`;
        html += `<span class="pos-tag ${posClass}">${b.pos}</span>`;
        if (b.bankAnalysis) {
          html += `<span class="bank-analysis">${CET6Utils.esc(b.bankAnalysis).substring(0, 42)}</span>`;
        }
        html += `</div>`;
      });
      html += `</div>`;
    }

    return html;
  }

  _onBankClick(letter) {
    if (this._activeBlankId) {
      this.selectWord(this._activeBlankId, letter);
      this._activeBlankId = null;
      const hint = document.getElementById('blank-hint');
      if (hint) hint.style.display = 'none';
      document.querySelectorAll('.blank-slot').forEach(el => {
        el.classList.remove('active-target');
      });
    } else {
      const blanks = this.data.passage.blanks || [];
      for (let i = 0; i < blanks.length; i++) {
        if (!this.selectedWords[blanks[i]]) {
          this.selectWord(blanks[i], letter);
          return;
        }
      }
    }
  }

  _refreshPhase1UI() {
    const phaseEl = document.getElementById('phase-1');
    if (!phaseEl) return;

    const sentencesEl = phaseEl.querySelector('.cloze-passage-sentences');
    if (sentencesEl) {
      const answers = this.data.answers || [];
      const paragraphs = this.data.passage.paragraphs || [];
      let html = '';
      paragraphs.forEach((para, idx) => {
        const sentences = this._splitParagraphIntoSentences(para);
        html += `<div class="para-group" data-para="${idx}">`;
        sentences.forEach(sentence => {
          if (sentence.blankIds.length > 0) {
            html += `<div class="sentence-card">`;
            let sentenceHtml = CET6Utils.esc(sentence.text);
            sentenceHtml = sentenceHtml.replace(/___\{(\d+)\}___/g, (match, blankId) => {
              return this._renderBlankSlot(parseInt(blankId));
            });
            html += `<div class="sentence-text">${sentenceHtml}</div>`;

            sentence.blankIds.forEach(blankId => {
              const ans = answers.find(a => a.blank === blankId);
              if (ans && ans.sentenceAnalysis) {
                html += `<div class="sentence-analysis">💭 ${CET6Utils.esc(ans.sentenceAnalysis)}</div>`;
              }
            });
            html += `</div>`;
          } else {
            html += `<span class="sentence-plain">${CET6Utils.esc(sentence.text)}</span>`;
          }
        });
        html += `</div>`;
      });
      sentencesEl.innerHTML = html;
    }

    const bankGrids = phaseEl.querySelectorAll('.bank-grid');
    bankGrids.forEach(grid => {
      grid.querySelectorAll('.bank-item').forEach(item => {
        const letter = item.dataset.letter;
        const isSelected = Object.values(this.selectedWords).includes(letter);
        if (isSelected) {
          item.classList.add('selected');
        } else {
          item.classList.remove('selected');
        }
      });
    });
  }

  _renderPhase2(container) {
    const div = document.createElement('div');
    div.className = 'phase';
    div.id = 'phase-2';
    const p = this.data.phases.phase2;

    let html = '';

    if (p.instruction) {
      html += `<div class="instruction-box">${p.instruction}</div>`;
    }

    html += this._renderClozeScoreDisplay();

    html += `<div style="display:grid;gap:8px;">`;
    const answers = this.data.answers || [];
    const blanks = this.data.passage.blanks || [];
    blanks.forEach(blankId => {
      const ans = answers.find(a => a.blank === blankId);
      if (!ans) return;

      const userLetter = this.selectedWords[blankId];
      const isCorrect = userLetter === ans.correct;
      const userBank = userLetter ? (this.data.banks || []).find(b => b.letter === userLetter) : null;
      const correctBank = (this.data.banks || []).find(b => b.letter === ans.correct);

      const bg = isCorrect ? '#f0fdf4' : '#fff5f5';
      const border = isCorrect ? 'var(--success)' : 'var(--error)';
      const icon = isCorrect ? '✅' : '❌';
      const resultClass = isCorrect ? 'correct-result' : 'wrong-result';
      const resultText = isCorrect ? '正确' : '错误';

      html += `<div class="answer-detail" style="background:${bg};border:1px solid ${border};">`;
      html += `<div class="detail-header">`;
      html += `<span class="detail-blank">${blankId}</span>`;
      html += `<span class="detail-result ${resultClass}">${icon} ${resultText}</span>`;
      html += `</div>`;
      html += `<div class="detail-compare">`;
      html += `<span class="user-ans">你的: ${userLetter ? userLetter + '. ' + (userBank ? CET6Utils.esc(userBank.word) : '') : '未做'}</span>`;
      html += `<span class="correct-ans">正确: ${ans.correct}. ${CET6Utils.esc(ans.word)}</span>`;
      html += `</div>`;
      if (ans.tip) {
        html += `<div class="detail-tip">${CET6Utils.esc(ans.tip)}</div>`;
      }
      html += `</div>`;
    });
    html += `</div>`;

    div.innerHTML = html;
    container.appendChild(div);
  }

  _renderClozeScoreDisplay() {
    const answers = this.data.answers || [];
    const blanks = this.data.passage.blanks || [];
    let score = 0;
    let answered = 0;

    blanks.forEach(blankId => {
      const ans = answers.find(a => a.blank === blankId);
      if (!ans) return;
      if (this.selectedWords[blankId] !== undefined) answered++;
      if (this.selectedWords[blankId] === ans.correct) score++;
    });

    const total = blanks.length;
    let desc = '';
    if (answered === 0) desc = '暂未填入任何词';
    else if (answered < total) desc = `已做 ${answered}/${total} 空，正确 ${score} 空`;
    else {
      const pct = score / total;
      if (pct === 1) desc = '全对！太棒了！';
      else if (pct >= 0.8) desc = '非常好！继续保持！';
      else if (pct >= 0.6) desc = '不错，还有提升空间！';
      else desc = '需要加强，看看错题分析！';
    }

    const okPct = total > 0 ? score / total : 0;
    const failPct = total > 0 ? (answered - score) / total : 0;
    const remainingPct = Math.max(0, 1 - okPct - failPct);

    return `
      <div class="cloze-score-bar">
        <div class="score-big">${score}/${total}</div>
        <div class="score-label">${desc}</div>
      </div>
      <div class="progress-bar" style="margin-bottom:16px;">
        <div class="ok" style="flex:${Math.max(okPct * 100, 0)};"></div>
        <div class="fail" style="flex:${Math.max(failPct * 100, 0)};"></div>
        ${remainingPct > 0 ? `<div style="flex:${remainingPct * 100};background:#e0e0e0;"></div>` : ''}
      </div>`;
  }

  _renderPhase3(container) {
    const div = document.createElement('div');
    div.className = 'phase';
    div.id = 'phase-3';
    const p = this.data.phases.phase3;

    let html = '';

    if (p.instruction) {
      html += `<div class="instruction-box">${p.instruction}</div>`;
    }

    const wordAnalysis = this.data.wordAnalysis || [];
    wordAnalysis.forEach(wa => {
      html += this._renderWordCard(wa);
    });

    div.innerHTML = html;
    container.appendChild(div);
  }

  _renderWordCard(wa) {
    const posClass = this._getPosClass(wa.pos);
    const isAdded = this._isInVocab(wa.word);

    let html = `<div class="word-card">`;

    html += `<div class="wc-header">`;
    html += `<span class="wc-word">${CET6Utils.esc(wa.word)}</span>`;
    html += `<span class="wc-pos pos-tag ${posClass}">${wa.pos || ''}</span>`;
    html += `</div>`;

    html += `<div class="wc-meaning">${CET6Utils.esc(wa.meaning)}</div>`;

    if (wa.rootPrefix) {
      html += `<div class="root-visual">`;
      html += this._renderRootVisual(wa.rootPrefix);
      html += `</div>`;
    }

    if (wa.rootExplanation) {
      html += `<div class="root-explanation">${CET6Utils.esc(wa.rootExplanation)}</div>`;
    }

    if (wa.cognates && wa.cognates.length > 0) {
      html += `<div class="cognate-list">`;
      html += `<span style="font-size:11px;color:var(--text2);margin-right:4px;">同源词:</span>`;
      wa.cognates.forEach(c => {
        html += `<span class="cognate-tag">${CET6Utils.esc(c)}</span>`;
      });
      html += `</div>`;
    }

    if (wa.examSentence && wa.examSentence !== '（本篇未使用）') {
      const sentence = CET6Utils.esc(wa.examSentence);
      const highlighted = this._highlightWord(sentence, wa.word);
      html += `<div class="exam-sentence">${highlighted}</div>`;
    }

    if (wa.collocations && wa.collocations.length > 0) {
      html += `<div class="collocations">`;
      html += `<span style="font-size:11px;color:var(--text2);margin-right:4px;">搭配:</span>`;
      wa.collocations.forEach(c => {
        html += `<span class="col-tag">${CET6Utils.esc(c)}</span>`;
      });
      html += `</div>`;
    }

    if (wa.mnemonic) {
      html += `<div class="mnemonic-box">💡 ${CET6Utils.esc(wa.mnemonic)}</div>`;
    }

    html += `<button class="add-vocab-btn${isAdded ? ' added' : ''}" onclick="window._engine.addToVocabSystem(${JSON.stringify(wa).replace(/"/g, '&quot;')})" ${isAdded ? 'disabled' : ''}>`;
    html += isAdded ? '✓ 已加入记忆系统' : '📥 加入记忆系统';
    html += `</button>`;

    html += `</div>`;
    return html;
  }

  _renderRootVisual(rootPrefix) {
    const parts = rootPrefix.split(/([+\-/])/);
    let html = '';
    parts.forEach(part => {
      const trimmed = part.trim();
      if (!trimmed) return;
      if (trimmed === '+' || trimmed === '-' || trimmed === '/') {
        html += `<span class="root-sep"> ${trimmed} </span>`;
      } else if (trimmed.startsWith('-') && trimmed.endsWith('-')) {
        html += `<span class="root-core">${CET6Utils.esc(trimmed)}</span>`;
      } else if (trimmed.startsWith('-')) {
        html += `<span class="root-suffix">${CET6Utils.esc(trimmed)}</span>`;
      } else if (trimmed.endsWith('-')) {
        html += `<span class="root-prefix">${CET6Utils.esc(trimmed)}</span>`;
      } else {
        html += `<span class="root-core">${CET6Utils.esc(trimmed)}</span>`;
      }
    });
    return html;
  }

  _highlightWord(sentence, word) {
    if (!word) return sentence;
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    try {
      const regex = new RegExp('(' + escaped + ')', 'gi');
      return sentence.replace(regex, '<b>$1</b>');
    } catch (e) {
      return sentence;
    }
  }

  _isInVocab(word) {
    if (!this.vocab) return false;
    const list = this.vocab.getAll();
    return list.some(w => w.word === word);
  }

  addToVocabSystem(wordAnalysis) {
    if (!this.vocab) return;
    if (this._isInVocab(wordAnalysis.word)) return;

    this.vocab.addRich(wordAnalysis.word, {
      pos: wordAnalysis.pos || '',
      meaning: wordAnalysis.meaning || '',
      source: this.data.meta.title || '选词填空',
      rootPrefix: wordAnalysis.rootPrefix || '',
      rootExplanation: wordAnalysis.rootExplanation || '',
      cognates: wordAnalysis.cognates || [],
      examSentence: wordAnalysis.examSentence || '',
      mnemonic: wordAnalysis.mnemonic || ''
    });

    this.updateSidebar();
    const phase3El = document.getElementById('phase-3');
    if (phase3El) {
      const btns = phase3El.querySelectorAll('.add-vocab-btn');
      btns.forEach(btn => {
        if (btn.textContent.includes(wordAnalysis.word) || btn.closest('.word-card')?.querySelector('.wc-word')?.textContent === wordAnalysis.word) {
          btn.classList.add('added');
          btn.disabled = true;
          btn.textContent = '✓ 已加入记忆系统';
        }
      });
    }
  }

  _renderAnswerCard() {
    const card = document.getElementById('answer-card');
    if (!card) return;
    const blanks = this.data.passage.blanks || [];
    let html = '';
    blanks.forEach(blankId => {
      const letter = this.selectedWords[blankId];
      if (letter) {
        const bankItem = (this.data.banks || []).find(b => b.letter === letter);
        html += `<div class="answer-row" style="background:var(--accent-light);border-color:transparent;"><span class="qn" style="color:var(--accent);">${blankId}</span><span class="ans-text" style="font-size:12px;color:var(--accent);">${letter}. ${bankItem ? CET6Utils.esc(bankItem.word) : ''}</span></div>`;
      } else {
        html += `<div class="answer-row" style="background:#f0f0f0;border-color:transparent;"><span class="qn" style="color:var(--text2);">${blankId}</span><span class="ans-text" style="font-size:12px;color:var(--text2);">— 待填</span></div>`;
      }
    });
    card.innerHTML = html;
  }

  updateSidebar() {
    const list = this.vocab ? this.vocab.getAll() : [];
    const annotateList = this.annotate ? this.annotate.getAll() : [];
    CET6Shell.updateSidebarCounts({ vocab: list.length, annotate: annotateList.length });
    const vocabListEl = document.getElementById('vocab-list');
    if (vocabListEl) { vocabListEl.innerHTML = CET6Shell.renderVocabList(list, 'window._app.currentEngine.removeVocab'); }
    const annotateListEl = document.getElementById('annotate-list');
    if (annotateListEl) { annotateListEl.innerHTML = CET6Shell.renderAnnotateList(annotateList, 'window._app.currentEngine.removeAnnotate'); }
  }
  removeVocab(index) {
    if (this.vocab) { this.vocab.remove(index); this.reRenderCurrentPhase(); this.updateSidebar(); }
  }
  removeAnnotate(index) {
    if (this.annotate) { this.annotate.remove(index); this.reRenderCurrentPhase(); this.updateSidebar(); }
  }

  destroy() {
    if (this._modalOverlay) { this._modalOverlay.remove(); this._modalOverlay = null; }
  }
}
