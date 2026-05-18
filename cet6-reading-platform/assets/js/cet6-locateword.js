class CET6LocateWord {
  constructor(storageKey) {
    this.storageKey = storageKey || 'cet6-locatewords';
    this.onChange = null;
  }

  getAll() {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey) || '{}');
    } catch (e) {
      return {};
    }
  }

  _save(data) {
    localStorage.setItem(this.storageKey, JSON.stringify(data));
    if (this.onChange) this.onChange(data);
  }

  add(optId, word) {
    const data = this.getAll();
    const key = String(optId);
    if (!data[key]) data[key] = [];
    if (!data[key].includes(word)) {
      data[key].push(word);
      this._save(data);
      return true;
    }
    return false;
  }

  remove(optId, word) {
    const data = this.getAll();
    const key = String(optId);
    if (data[key]) {
      data[key] = data[key].filter(w => w !== word);
      if (data[key].length === 0) delete data[key];
      this._save(data);
      return true;
    }
    return false;
  }

  removeByIndex(optId, index) {
    const data = this.getAll();
    const key = String(optId);
    if (data[key] && index >= 0 && index < data[key].length) {
      data[key].splice(index, 1);
      if (data[key].length === 0) delete data[key];
      this._save(data);
      return true;
    }
    return false;
  }

  getForOption(optId) {
    const data = this.getAll();
    return data[String(optId)] || [];
  }

  isMarked(optId, word) {
    const words = this.getForOption(optId);
    return words.includes(word);
  }

  count() {
    const data = this.getAll();
    let total = 0;
    Object.values(data).forEach(arr => { total += arr.length; });
    return total;
  }

  clear() {
    if (confirm('确定清除所有定位词标记？')) {
      localStorage.removeItem(this.storageKey);
      if (this.onChange) this.onChange({});
    }
  }

  applyToDOM() {
    const data = this.getAll();
    document.querySelectorAll('.locate-highlight').forEach(el => {
      const parent = el.parentNode;
      parent.replaceChild(document.createTextNode(el.textContent), el);
      parent.normalize();
    });

    Object.entries(data).forEach(([optId, words]) => {
      words.forEach(word => {
        document.querySelectorAll('[data-opt="' + optId + '"], [data-para]').forEach(el => {
          let html = el.innerHTML;
          const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          try {
            const regex = new RegExp('(?!<[^>]*?)(' + escaped + ')(?![^<]*?>)', 'gi');
            html = html.replace(regex, '<span class="locate-highlight" data-lw="' + word.replace(/"/g, '&quot;') + '" data-opt="' + optId + '">$1</span>');
          } catch (e) {}
          el.innerHTML = html;
        });
      });
    });
  }
}
