var CET6Shell = {
  _selectionListenerActive: false,
  _mouseupHandler: null,
  _mousedownHandler: null,

  renderHeader: function(title, subtitle, actions) {
    const header = CET6Utils.el('div', { className: 'header' }, [
      CET6Utils.el('div', {}, [
        CET6Utils.el('h1', {}, title),
        CET6Utils.el('div', { className: 'meta' }, subtitle || '')
      ]),
      CET6Utils.el('div', { className: 'header-actions' },
        (actions || []).map(a => {
          const btn = CET6Utils.el('button', {
            className: 'btn ' + (a.class || ''),
            textContent: a.text
          });
          btn.onclick = a.onClick;
          return btn;
        })
      )
    ]);
    return header;
  },

  renderTabs: function(tabs, activeIdx, onSwitch) {
    const tabsContainer = CET6Utils.el('div', { className: 'tabs', id: 'tabs' });
    tabs.forEach((tab, idx) => {
      const tabEl = CET6Utils.el('div', {
        className: 'tab' + (idx === activeIdx ? ' active' : ''),
        textContent: tab.label,
        'data-tab': tab.id
      });
      if (tab.badge) {
        const badge = CET6Utils.el('span', { className: 'badge' }, ' ' + tab.badge);
        tabEl.appendChild(badge);
      }
      tabEl.onclick = () => onSwitch(idx, tab.id);
      tabsContainer.appendChild(tabEl);
    });
    return tabsContainer;
  },

  renderSidebar: function(panels) {
    const sidebar = CET6Utils.el('div', { className: 'sidebar' });
    panels.forEach(panel => {
      const panelEl = CET6Utils.el('div', {
        className: panel.className || panel.type + '-panel'
      });
      const titleDiv = CET6Utils.el('div', { className: 'title' }, [
        CET6Utils.el('span', {}, panel.title),
        CET6Utils.el('span', { className: 'count' }, panel.countId ? '已选: <span id="' + panel.countId + '">0</span>' : '')
      ]);
      panelEl.appendChild(titleDiv);
      const content = CET6Utils.el('div', {
        id: panel.contentId,
        className: panel.contentId.includes('list') ? panel.contentId : ''
      });
      content.innerHTML = '<div class="' + (panel.type || 'vocab') + '-empty">' + (panel.emptyText || '') + '</div>';
      panelEl.appendChild(content);
      sidebar.appendChild(panelEl);
    });
    return sidebar;
  },

  renderPopup: function(extraButtons) {
    const popup = CET6Utils.el('div', { id: 'word-popup' });
    const selectedText = CET6Utils.el('div', { className: 'selected-text' }, [
      CET6Utils.el('span', { id: 'popup-word' }, '')
    ]);
    const input = CET6Utils.el('input', {
      id: 'popup-annotation',
      className: 'popup-input',
      placeholder: '标注备注（可选）...',
      maxlength: '30'
    });
    const btnGroup = CET6Utils.el('div', { className: 'btn-group' }, [
      CET6Utils.el('button', {
        className: 'btn-add',
        id: 'popup-add-vocab',
        textContent: '加入生词本'
      }),
      CET6Utils.el('button', {
        className: 'btn-annotate',
        id: 'popup-add-annotate',
        textContent: '划线 + 标注'
      })
    ]);
    const btnRow = CET6Utils.el('div', { className: 'btn-row' }, [
      CET6Utils.el('button', {
        className: 'btn-underline',
        id: 'popup-underline-only',
        textContent: '仅划线'
      }),
      CET6Utils.el('button', {
        className: 'btn-cancel',
        id: 'popup-cancel',
        textContent: '取消'
      })
    ]);
    (extraButtons || []).forEach(btn => {
      const extraBtn = CET6Utils.el('button', {
        className: btn.class || '',
        textContent: btn.label
      });
      extraBtn.onclick = btn.onClick;
      btnRow.appendChild(extraBtn);
    });
    const hint = CET6Utils.el('div', { className: 'popup-hint' }, '划线后文字下方会出现橙色标记');
    popup.appendChild(selectedText);
    popup.appendChild(input);
    popup.appendChild(btnGroup);
    popup.appendChild(btnRow);
    popup.appendChild(hint);
    return popup;
  },

  showPopup: function(x, y) {
    const popup = document.getElementById('word-popup');
    if (!popup) return;
    popup.style.display = 'block';
    const maxX = window.innerWidth - 280;
    popup.style.left = Math.max(10, Math.min(x, maxX)) + 'px';
    popup.style.top = (y + 10) + 'px';
  },

  hidePopup: function() {
    const popup = document.getElementById('word-popup');
    if (!popup) return;
    popup.style.display = 'none';
    const input = document.getElementById('popup-annotation');
    if (input) input.value = '';
    this._currentSelection = { text: '', paraIdx: 0 };
    window.getSelection().removeAllRanges();
  },

  _currentSelection: { text: '', paraIdx: 0 },

  getSelectedText: function() {
    return this._currentSelection.text;
  },

  getSelectedPara: function() {
    return this._currentSelection.paraIdx;
  },

  initSelection: function(onVocabAdd, onAnnotateAdd, onUnderlineOnly, extraHandlers) {
    if (this._selectionListenerActive) {
      return;
    }

    const self = this;

    this._mouseupHandler = function(e) {
      if (e.target.closest && e.target.closest('#word-popup')) return;
      if (e.target.closest && e.target.closest('.blank-slot')) return;
      if (e.target.closest && e.target.closest('.bank-item')) return;

      const sel = window.getSelection();
      const text = sel.toString().trim();
      if (!text || text.split(/\s+/).length > 8) return;
      if (text.length > 80) return;

      let paraIdx = 0;
      try {
        if (sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          paraIdx = CET6Utils.findClosestPara(range.startContainer);
        }
      } catch (err) {}

      self._currentSelection = { text: text, paraIdx: paraIdx };

      const popupWord = document.getElementById('popup-word');
      if (popupWord) popupWord.textContent = text;

      self.showPopup(e.clientX, e.clientY);

      const addVocabBtn = document.getElementById('popup-add-vocab');
      const addAnnotateBtn = document.getElementById('popup-add-annotate');
      const underlineBtn = document.getElementById('popup-underline-only');
      const cancelBtn = document.getElementById('popup-cancel');

      if (addVocabBtn) addVocabBtn.onclick = () => {
        onVocabAdd(text, paraIdx);
        self.hidePopup();
      };
      if (addAnnotateBtn) addAnnotateBtn.onclick = () => {
        const note = document.getElementById('popup-annotation')?.value.trim() || '';
        onAnnotateAdd(text, paraIdx, note);
        self.hidePopup();
      };
      if (underlineBtn) underlineBtn.onclick = () => {
        const note = document.getElementById('popup-annotation')?.value.trim() || '';
        onUnderlineOnly(text, paraIdx, note);
        self.hidePopup();
      };
      if (cancelBtn) cancelBtn.onclick = () => self.hidePopup();

      if (extraHandlers && extraHandlers.locateword) {
        const locateBtn = document.getElementById('popup-btn-locate');
        if (locateBtn) locateBtn.onclick = () => {
          extraHandlers.locateword(text, paraIdx);
          self.hidePopup();
        };
      }
    };

    this._mousedownHandler = function(e) {
      const popup = document.getElementById('word-popup');
      if (!popup || popup.style.display !== 'block') return;
      if (popup.contains(e.target)) return;
      if (e.target.closest && e.target.closest('#word-popup')) return;
      self.hidePopup();
    };

    document.addEventListener('mouseup', this._mouseupHandler);
    document.addEventListener('mousedown', this._mousedownHandler);
    this._selectionListenerActive = true;
  },

  destroy: function() {
    if (this._mouseupHandler) {
      document.removeEventListener('mouseup', this._mouseupHandler);
    }
    if (this._mousedownHandler) {
      document.removeEventListener('mousedown', this._mousedownHandler);
    }
    this._destroyEventDelegate();
    this._selectionListenerActive = false;
    this._currentSelection = { text: '', paraIdx: 0 };
    const root = document.getElementById('app-root');
    if (root) root.innerHTML = '';
  },

  _delegateHandler: null,

  initEventDelegate: function(engine, vocab) {
    this._destroyEventDelegate();
    const self = this;
    this._delegateHandler = function(e) {
      const target = e.target.closest('[data-ea]');
      if (!target) return;
      const ea = target.getAttribute('data-ea');
      const argsAttr = target.getAttribute('data-ea-args');
      const after = target.getAttribute('data-ea-after');
      var args = [];
      if (argsAttr) {
        try { args = JSON.parse(argsAttr); } catch (err) { args = []; }
      }
      if (ea === 'engine' && engine) {
        var method = target.getAttribute('data-ea-method');
        if (method && typeof engine[method] === 'function') {
          engine[method].apply(engine, args);
        }
      } else if (ea === 'vocab' && vocab) {
        var method = target.getAttribute('data-ea-method');
        if (method && typeof vocab[method] === 'function') {
          vocab[method].apply(vocab, args);
        }
      }
      if (after && engine && typeof engine[after] === 'function') {
        engine[after]();
      }
    };
    document.addEventListener('click', this._delegateHandler);
  },

  _destroyEventDelegate: function() {
    if (this._delegateHandler) {
      document.removeEventListener('click', this._delegateHandler);
      this._delegateHandler = null;
    }
  },

  renderVocabList: function(list, onDelete) {
    if (!list || list.length === 0) {
      return '<div class="vocab-empty">选中任意单词 → 弹出"加入生词本"</div>';
    }
    return list.map((w, i) => `
      <div class="vocab-item">
        <div><div class="word">${CET6Utils.esc(w.word)}</div><div class="src">${CET6Utils.esc(w.source || '')}</div></div>
        <span class="del" data-ea="engine" data-ea-method="${onDelete}" data-ea-args='[${i}]'>✕</span>
      </div>
    `).join('');
  },

  renderAnnotateList: function(list, onDelete) {
    if (!list || list.length === 0) {
      return '<div class="annotate-empty">选中文字 → 点击"划线标注"</div>';
    }
    return list.map((a, i) => `
      <div class="annotate-item">
        <div>
          <div class="a-text">${CET6Utils.esc(a.text)}</div>
          <div class="a-para">¶${(a.paraIdx + 1) || '-'}</div>
          ${a.annotation ? `<div class="a-note">${CET6Utils.esc(a.annotation)}</div>` : ''}
        </div>
        <span class="del" data-ea="engine" data-ea-method="${onDelete}" data-ea-args='[${i}]'>✕</span>
      </div>
    `).join('');
  },

  renderLocateWordList: function(data, onDelete) {
    if (!data || Object.keys(data).length === 0) {
      return '<div class="locateword-empty">选中单词 → 点击"标记为定位词"</div>';
    }
    let html = '';
    Object.entries(data).forEach(([optId, words]) => {
      words.forEach((w, i) => {
        html += `<div class="locateword-item">
          <div><span class="lw-id">${optId}题</span> <span class="lw-word">${CET6Utils.esc(w)}</span></div>
          <span class="del" data-ea="engine" data-ea-method="${onDelete}" data-ea-args='[${optId},"${CET6Utils.esc(w).replace(/"/g, '\\"')}"]'>✕</span>
        </div>`;
      });
    });
    return html;
  },

  renderScoreDisplay: function(stats) {
    const total = stats.total || 0;
    const score = stats.score || 0;
    const answered = stats.answered || 0;

    let desc = '';
    if (answered === 0) desc = stats.emptyText || '暂未作答';
    else if (answered < total) desc = '已做 ' + answered + '/' + total + ' 题，正确 ' + score + ' 题';
    else {
      const pct = total > 0 ? score / total : 0;
      if (pct === 1) desc = '全对！太棒了！';
      else if (pct >= 0.8) desc = '非常好！继续保持！';
      else if (pct >= 0.6) desc = '不错，还有提升空间！';
      else desc = '需要加强，看看错题分析！';
    }
    if (stats.extraText) desc += stats.extraText;

    const okPct = total > 0 ? score / total : 0;
    const failPct = total > 0 && answered > 0 ? (answered - score) / total : 0;
    const remainingPct = Math.max(0, 1 - okPct - failPct - (stats.extraPct || 0));
    const gaveUpPct = stats.extraPct || 0;

    return '<div class="score-display"><div class="score-num">' + score + '/' + total + '</div><div><div style="font-weight:600;font-size:15px;">' + desc + '</div></div></div><div class="progress-bar" style="margin-bottom:12px;"><div class="ok" style="flex:' + Math.max(okPct * 100, 0) + ';"></div><div class="fail" style="flex:' + Math.max(failPct * 100, 0) + ';"></div>' + (gaveUpPct > 0 ? '<div style="flex:' + gaveUpPct * 100 + ';background:var(--warn);"></div>' : '') + (remainingPct > 0 ? '<div style="flex:' + remainingPct * 100 + ';background:#e0e0e0;"></div>' : '') + '</div>';
  },

  updateSidebarCounts: function(counts) {
    if (counts.vocab !== undefined) {
      const el = document.getElementById('vocab-count');
      if (el) el.textContent = counts.vocab;
    }
    if (counts.annotate !== undefined) {
      const el = document.getElementById('annotate-count');
      if (el) el.textContent = counts.annotate;
    }
    if (counts.locateword !== undefined) {
      const el = document.getElementById('locateword-count');
      if (el) el.textContent = counts.locateword;
    }
  }
};
