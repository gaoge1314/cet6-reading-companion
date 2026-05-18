class CET6Vocab {
  constructor(examId, moduleName) {
    this.examId = examId;
    this.moduleName = moduleName || '';
    this.onChange = null;
    this._source = examId + ' ' + moduleName;
  }

  _getGlobal() {
    try {
      return JSON.parse(localStorage.getItem(CET6Utils.storageKeys.vocab) || '[]');
    } catch (e) {
      return [];
    }
  }

  _saveGlobal(list) {
    localStorage.setItem(CET6Utils.storageKeys.vocab, JSON.stringify(list));
    if (this.onChange) this.onChange(list);
  }

  getAll() {
    return this._getGlobal().filter(w => {
      if (!w.sources || w.sources.length === 0) return false;
      return w.sources.some(s => s.indexOf(this.examId) === 0);
    });
  }

  count() {
    return this.getAll().length;
  }

  add(word, source) {
    const list = this._getGlobal();
    const existed = list.find(w => w.word === word);
    const srcStr = this._source + (source ? ' - ' + source : '');
    if (existed) {
      if (!existed.sources) existed.sources = [];
      if (!existed.sources.includes(srcStr)) {
        existed.sources.push(srcStr);
      }
      this._saveGlobal(list);
      return false;
    }
    list.push({
      word: word,
      pos: '',
      meaning: '',
      sources: [srcStr],
      mastery: 0,
      reviewStage: 0,
      nextReview: null,
      addedAt: new Date().toISOString().slice(0, 10),
      history: [],
      rootPrefix: '',
      rootExplanation: '',
      cognates: [],
      examSentence: '',
      mnemonic: '',
      collocations: []
    });
    this._saveGlobal(list);
    return true;
  }

  addRich(word, richData) {
    const list = this._getGlobal();
    const existed = list.find(w => w.word === word);
    const srcStr = this._source + (richData.source ? ' - ' + richData.source : '');
    if (existed) {
      if (!existed.sources) existed.sources = [];
      if (!existed.sources.includes(srcStr)) existed.sources.push(srcStr);
      existed.pos = existed.pos || richData.pos || '';
      existed.meaning = existed.meaning || richData.meaning || '';
      existed.rootPrefix = existed.rootPrefix || richData.rootPrefix || '';
      existed.rootExplanation = existed.rootExplanation || richData.rootExplanation || '';
      existed.examSentence = existed.examSentence || richData.examSentence || '';
      existed.mnemonic = existed.mnemonic || richData.mnemonic || '';
      if (richData.cognates) existed.cognates = existed.cognates || richData.cognates;
      if (richData.collocations) existed.collocations = existed.collocations || richData.collocations;
      this._saveGlobal(list);
      return false;
    }
    list.push({
      word: word,
      pos: richData.pos || '',
      meaning: richData.meaning || '',
      sources: [srcStr],
      mastery: 0,
      reviewStage: 0,
      nextReview: null,
      addedAt: new Date().toISOString().slice(0, 10),
      history: [],
      rootPrefix: richData.rootPrefix || '',
      rootExplanation: richData.rootExplanation || '',
      cognates: richData.cognates || [],
      examSentence: richData.examSentence || '',
      mnemonic: richData.mnemonic || '',
      collocations: richData.collocations || []
    });
    this._saveGlobal(list);
    return true;
  }

  has(word) {
    return this._getGlobal().some(w => w.word === word);
  }

  remove(index) {
    const local = this.getAll();
    if (index >= 0 && index < local.length) {
      const list = this._getGlobal();
      const word = local[index].word;
      const gIdx = list.findIndex(w => w.word === word);
      if (gIdx >= 0) {
        const entry = list[gIdx];
        if (entry.sources) {
          entry.sources = entry.sources.filter(s => s.indexOf(this.examId) !== 0);
        }
        if (!entry.sources || entry.sources.length === 0) {
          list.splice(gIdx, 1);
        } else {
          list[gIdx] = entry;
        }
        this._saveGlobal(list);
      }
    }
  }

  clear() {
    if (confirm('确定清空本试卷所有生词？')) {
      const list = this._getGlobal();
      const filtered = list.filter(w => {
        if (!w.sources || w.sources.length === 0) return true;
        return !w.sources.some(s => s.indexOf(this.examId) === 0);
      });
      this._saveGlobal(filtered);
    }
  }

  exportMarkdown(title) {
    const list = this.getAll();
    if (list.length === 0) { alert('生词本为空！'); return; }
    let md = '# ' + (title || '六级生词本') + '\n\n| 单词 | 出处 | 时间 |\n|:--|:--|:--|\n';
    list.forEach(w => {
      md += '| ' + (w.word || '') + ' | ' + ((w.sources || []).join(', ') || '-') + ' | ' + (w.addedAt || '-') + ' |\n';
    });
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '生词本_' + new Date().toISOString().slice(0, 10) + '.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }
}