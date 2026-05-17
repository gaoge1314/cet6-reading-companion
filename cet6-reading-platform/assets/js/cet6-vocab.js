class CET6Vocab {
  constructor(storageKey, options) {
    this.storageKey = storageKey || 'cet6-vocab';
    this.onChange = null;
    if (!options || !options.disableListener) {
      this._initSelectionListener();
    }
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
    if (this.onChange) this.onChange(list);
  }

  add(word, source) {
    const list = this.getAll();
    if (!list.find(w => w.word === word)) {
      list.push({ word, source: source || '', time: new Date().toLocaleString() });
      this._save(list);
      return true;
    }
    return false;
  }

  remove(index) {
    const list = this.getAll();
    if (index >= 0 && index < list.length) {
      list.splice(index, 1);
      this._save(list);
    }
  }

  clear() {
    if (confirm('确定清空所有生词？')) {
      localStorage.removeItem(this.storageKey);
      if (this.onChange) this.onChange([]);
    }
  }

  count() {
    return this.getAll().length;
  }

  exportMarkdown(title) {
    const list = this.getAll();
    if (list.length === 0) { alert('生词本为空！'); return; }
    let md = `# ${title || '六级生词本'}\n\n| 单词 | 出处 | 时间 |\n|:--|:--|:--|\n`;
    list.forEach(w => { md += `| ${w.word} | ${w.source || '-'} | ${w.time || '-'} |\n`; });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
    a.download = '生词本_' + new Date().toISOString().slice(0, 10) + '.md';
    a.click();
  }

  _initSelectionListener() {
    const self = this;
    let popupTimer = null;

    document.addEventListener('mouseup', function (e) {
      const sel = window.getSelection();
      const text = sel.toString().trim();
      if (!text || text.split(/\s+/).length > 4) {
        clearTimeout(popupTimer);
        popupTimer = setTimeout(() => {
          const popup = document.getElementById('word-popup');
          if (popup) popup.style.display = 'none';
        }, 300);
        return;
      }
      const popup = document.getElementById('word-popup');
      if (!popup) return;
      clearTimeout(popupTimer);
      popup.style.display = 'block';
      const x = Math.min(e.pageX, window.innerWidth - 220);
      popup.style.left = Math.max(10, x) + 'px';
      popup.style.top = (e.pageY + 20) + 'px';
      const wordSpan = popup.querySelector('#popup-word');
      if (wordSpan) wordSpan.textContent = text;
      popup._selectedWord = text;

      let source = '';
      const activeTab = document.querySelector('.tab.active');
      if (activeTab) source = 'Phase ' + activeTab.dataset.phase;

      window.getSelection().removeAllRanges();
    });

    document.addEventListener('mousedown', function (e) {
      const popup = document.getElementById('word-popup');
      if (popup && !popup.contains(e.target) && !e.target.closest('#word-popup')) {
        popup.style.display = 'none';
      }
    });
  }

  addFromPopup() {
    const popup = document.getElementById('word-popup');
    if (!popup || !popup._selectedWord) return;
    let source = '';
    const activeTab = document.querySelector('.tab.active');
    if (activeTab) source = 'Phase ' + activeTab.dataset.phase;
    this.add(popup._selectedWord, source);
    popup.style.display = 'none';
    popup._selectedWord = null;
  }

  hidePopup() {
    const popup = document.getElementById('word-popup');
    if (popup) popup.style.display = 'none';
  }
}