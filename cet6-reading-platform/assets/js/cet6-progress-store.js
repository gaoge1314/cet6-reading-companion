var ProgressStore = {
  _key: function(examId, type) {
    return CET6Utils.storageKeys.examsState + '-' + examId + '-' + type;
  },

  load: function(examId, type) {
    try {
      return JSON.parse(localStorage.getItem(this._key(examId, type)) || '{}');
    } catch (e) {
      return {};
    }
  },

  save: function(examId, type, data) {
    data.time = new Date().toISOString();
    localStorage.setItem(this._key(examId, type), JSON.stringify(data));
  }
};
