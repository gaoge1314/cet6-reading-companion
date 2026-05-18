var DataMigrator = {
  migrateExistingData: function() {
    const existing = CET6Utils.loadJSON(CET6Utils.storageKeys.exams);
    if (existing && existing.length > 0) {
      this._importBatchExams(existing);
      return false;
    }

    const dataFiles = [
      { id: '2025-12-passage1', type: 'reading', path: 'assets/data/2025-12-passage1.json' },
      { id: '2025-12-longread', type: 'matching', path: 'assets/data/2025-12-longread.json' },
      { id: '2025-12-cloze', type: 'cloze', path: 'assets/data/2025-12-cloze.json' }
    ];

    const exam = {
      id: '2025-12-exam1',
      meta: {
        examDate: '2025年12月',
        level: 'CET6',
        title: '2025年12月六级真题第1套',
        importedAt: new Date().toISOString()
      },
      modules: {},
      availableModules: []
    };

    var self = this;
    Promise.all(dataFiles.map(function(item) {
      return CET6Loader.load(item.path).then(function(data) {
        exam.modules[item.type] = data;
        exam.availableModules.push(item.type);
        return data;
      });
    })).then(function() {
      var exams = [exam];
      CET6Utils.saveJSON(CET6Utils.storageKeys.exams, exams);
      console.log('Auto migrated existing data to:', exam);
      self._importBatchExams(exams);
    }).catch(function(err) {
      console.error('Migration failed:', err);
    });

    return true;
  },

  _importBatchExams: function(existing) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'assets/data/exams_batch.json?_t=' + Date.now(), true);
    xhr.onload = function() {
      if (xhr.status === 200) {
        try {
          var batch = JSON.parse(xhr.responseText);
          var changed = false;
          batch.forEach(function(bExam) {
            var idx = existing.findIndex(function(e) { return e.id === bExam.id; });
            if (idx === -1) {
              existing.push(bExam);
              changed = true;
              console.log('Imported batch exam:', bExam.id);
            }
          });
          if (changed) {
            CET6Utils.saveJSON(CET6Utils.storageKeys.exams, existing);
            console.log('Batch exam import complete, total:', existing.length);
          }
        } catch (e) {
          console.warn('Batch exam import skipped:', e.message);
        }
      }
    };
    xhr.onerror = function() { console.warn('Batch exam file not found, skipping.'); };
    xhr.send();
  },

  extractVocabToGlobal: function(exam) {
    if (exam.modules.cloze && exam.modules.cloze.wordAnalysis) {
      exam.modules.cloze.wordAnalysis.forEach(function(wa) {
        if (wa.word && !window._app.vocab.has(wa.word)) {
          const source = exam.id + ' ' + CET6Utils.moduleLabels.cloze;
          window._app.vocab.addRich(wa.word, {
            pos: wa.pos,
            meaning: wa.meaning,
            source: source,
            rootPrefix: wa.rootPrefix,
            rootExplanation: wa.rootExplanation,
            cognates: wa.cognates || [],
            examSentence: wa.examSentence || '',
            mnemonic: wa.mnemonic || '',
            collocations: wa.collocations || []
          });
        }
      });
    }
  }
};
