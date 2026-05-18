var CET6Utils = {
  esc: function (html) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(html));
    return div.innerHTML;
  },

  findClosestPara: function (element) {
    while (element && element.nodeType !== Node.ELEMENT_NODE) {
      element = element.parentElement;
    }
    while (element) {
      if (element.hasAttribute && element.hasAttribute('data-para')) {
        return parseInt(element.getAttribute('data-para'));
      }
      element = element.parentElement;
    }
    return 0;
  },

  findClosestAttr: function (element, attr) {
    while (element && element.nodeType !== Node.ELEMENT_NODE) {
      element = element.parentElement;
    }
    while (element) {
      if (element.hasAttribute && element.hasAttribute(attr)) {
        return element.getAttribute(attr);
      }
      element = element.parentElement;
    }
    return null;
  },

  formatScore: function (correct, total) {
    if (!total || total === 0) return { text: '未作答', pct: 0 };
    var pct = Math.round((correct / total) * 100);
    return {
      text: correct + '/' + total + ' (' + pct + '%)',
      pct: pct,
      correct: correct,
      total: total
    };
  },

  debounce: function (fn, ms) {
    var timer = null;
    return function () {
      var context = this;
      var args = arguments;
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () {
        timer = null;
        fn.apply(context, args);
      }, ms);
    };
  },

  el: function (tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'className') el.className = attrs[k];
        else if (k === 'innerHTML') el.innerHTML = attrs[k];
        else if (k === 'textContent') el.textContent = attrs[k];
        else if (k === 'style' && typeof attrs[k] === 'string') el.style.cssText = attrs[k];
        else if (k.indexOf('on') === 0) el.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        else el.setAttribute(k, attrs[k]);
      });
    }
    if (children) {
      (Array.isArray(children) ? children : [children]).forEach(function (c) {
        if (typeof c === 'string') el.appendChild(document.createTextNode(c));
        else if (c instanceof Node) el.appendChild(c);
      });
    }
    return el;
  },

  storageKeys: {
    exams: 'cet6-exams',
    examsState: 'cet6-exams-state',
    vocab: 'cet6-vocab',
    annotations: 'cet6-annotations',
    locatewords: 'cet6-locatewords',
    recent: 'cet6-recent'
  },

  loadJSON: function (key) {
    try {
      return JSON.parse(localStorage.getItem(key) || 'null') || null;
    } catch (e) {
      return null;
    }
  },

  saveJSON: function (key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  },

  examIdFromParts: function (year, month, setNum) {
    return year + '-' + String(month).padStart(2, '0') + '-exam' + setNum;
  },

  moduleLabels: {
    reading: '传统阅读',
    matching: '长篇阅读',
    cloze: '选词填空'
  },

  moduleTypes: {
    reading: 'reading',
    matching: 'matching',
    cloze: 'cloze'
  }
};