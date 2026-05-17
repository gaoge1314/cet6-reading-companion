class CET6Annotate {
  constructor(storageKey) {
    this.storageKey = storageKey || 'cet6-annotations';
    this.onChange = null;
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

  add(text, paraIdx, annotation) {
    const list = this.getAll();
    const exists = list.find(a => a.text === text && a.paraIdx === paraIdx);
    if (exists) {
      exists.annotation = annotation || '';
      this._save(list);
      return false;
    }
    list.push({ text, paraIdx, annotation: annotation || '', time: new Date().toLocaleString() });
    this._save(list);
    this.applyToDOM();
    return true;
  }

  remove(index) {
    const list = this.getAll();
    if (index >= 0 && index < list.length) {
      list.splice(index, 1);
      this._save(list);
      this.applyToDOM();
    }
  }

  removeByText(text, paraIdx) {
    const list = this.getAll();
    const idx = list.findIndex(a => a.text === text && a.paraIdx === paraIdx);
    if (idx >= 0) {
      list.splice(idx, 1);
      this._save(list);
      this.applyToDOM();
      return true;
    }
    return false;
  }

  clear() {
    if (confirm('确定清除所有划线标注？')) {
      localStorage.removeItem(this.storageKey);
      if (this.onChange) this.onChange([]);
      document.querySelectorAll('.annotated').forEach(el => {
        const text = el.textContent.replace(el.querySelector('.annotated-tip')?.textContent || '', '');
        el.replaceWith(document.createTextNode(text));
      });
    }
  }

  count() {
    return this.getAll().length;
  }

  getParaAnnotations(paraIdx) {
    return this.getAll().filter(a => a.paraIdx === paraIdx);
  }

  applyToDOM() {
    const annotations = this.getAll();
    const grouped = {};
    annotations.forEach(a => {
      if (!grouped[a.paraIdx]) grouped[a.paraIdx] = [];
      grouped[a.paraIdx].push(a);
    });

    document.querySelectorAll('[data-para]').forEach(el => {
      const paraIdx = parseInt(el.dataset.para);
      const itemAnnotations = grouped[paraIdx] || [];
      if (itemAnnotations.length === 0) return;

      let html = el.innerHTML;

      itemAnnotations.forEach(a => {
        const key = 'data-a="' + a.text.replace(/"/g, '&quot;') + '"';
        if (html.includes(key)) return;

        const escaped = a.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        let replacement;
        if (a.annotation) {
          replacement = '<span class="annotated" data-a="' + a.text.replace(/"/g, '&quot;') + '">$&<span class="annotated-tip">' + a.annotation + '</span></span>';
        } else {
          replacement = '<span class="annotated" data-a="' + a.text.replace(/"/g, '&quot;') + '">$&</span>';
        }

        try {
          const regex = new RegExp('(' + escaped + ')', 'i');
          html = html.replace(regex, replacement);
        } catch (e) {
          console.warn('Annotation regex failed for:', a.text);
        }
      });

      el.innerHTML = html;
    });
  }

  renderPassage(paragraphs) {
    const annotations = this.getAll();
    const grouped = {};
    annotations.forEach(a => {
      if (!grouped[a.paraIdx]) grouped[a.paraIdx] = [];
      grouped[a.paraIdx].push(a);
    });

    return paragraphs.map((para, idx) => {
      const itemAnnotations = grouped[idx] || [];
      let text = this._escapeHtml(para);

      itemAnnotations.forEach(a => {
        const key = 'data-a="' + a.text.replace(/"/g, '&quot;') + '"';
        if (text.includes(key)) return;

        const escaped = a.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        let replacement;
        if (a.annotation) {
          replacement = '<span class="annotated" data-a="' + a.text.replace(/"/g, '&quot;') + '">$&<span class="annotated-tip">' + this._escapeHtml(a.annotation) + '</span></span>';
        } else {
          replacement = '<span class="annotated" data-a="' + a.text.replace(/"/g, '&quot;') + '">$&</span>';
        }
        try {
          const regex = new RegExp('(' + escaped + ')', 'i');
          text = text.replace(regex, replacement);
        } catch (e) {}
      });

      return `<p data-para="${idx}"><span class="para-number">¶${idx + 1}</span>${text}</p>`;
    }).join('');
  }

  renderSentences(sections) {
    return sections.map(sec => {
      let html = `<div class="card"><div class="card-title">${sec.paragraph}</div><div class="passage">`;
      if (sec.firstSentence) {
        const text = this._escapeHtml(sec.firstSentence);
        const annotated = this._applyInline(text);
        html += `<p><span class="sentence-tag">首</span>${annotated}</p>`;
      }
      if (sec.lastSentence) {
        const text = this._escapeHtml(sec.lastSentence);
        const annotated = this._applyInline(text);
        html += `<p><span class="sentence-tag">尾</span>${annotated}</p>`;
      }
      html += `</div>`;
      if (sec.monologue) {
        html += `<div class="mono">${sec.monologue}</div>`;
      }
      html += `</div>`;
      return html;
    }).join('');
  }

  _applyInline(text) {
    const annotations = this.getAll();
    annotations.forEach(a => {
      const escaped = a.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      try {
        const regex = new RegExp('(' + escaped + ')', 'i');
        let replacement;
        if (a.annotation) {
          replacement = '<span class="annotated" data-a="' + a.text.replace(/"/g, '&quot;') + '">$&<span class="annotated-tip">' + this._escapeHtml(a.annotation) + '</span></span>';
        } else {
          replacement = '<span class="annotated" data-a="' + a.text.replace(/"/g, '&quot;') + '">$&</span>';
        }
        text = text.replace(regex, replacement);
      } catch (e) {}
    });
    return text;
  }

  _escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }
}