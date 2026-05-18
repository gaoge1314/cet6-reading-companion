var ImportParser = {
  parseReading: function(passageText, questionsText, answersText) {
    if (!passageText.trim() || !questionsText.trim() || !answersText.trim()) return null;

    const paragraphs = passageText.split(/\n\n+/).map(p => p.trim()).filter(p => p);

    const questionMatches = questionsText.match(/(?:^|\n)(?:Q\d+\.|[\dX]+\.)\s*([\s\S]*?)(?=(?:\n(?:Q\d+\.|[\dX]+\.)\s)|$)/g);
    const questions = [];
    let qid = 46;
    (questionMatches || []).forEach(qBlock => {
      qBlock = qBlock.trim();
      const firstLineBreak = qBlock.indexOf('\n');
      const questionText = firstLineBreak > 0 ? qBlock.slice(0, firstLineBreak).trim().replace(/^[\dX]+\.\s*/, '') : qBlock.trim().replace(/^[\dX]+\.\s*/, '');
      const optionsText = firstLineBreak > 0 ? qBlock.slice(firstLineBreak) : '';
      const options = [];
      ['A.', 'B.', 'C.', 'D.'].forEach((opt, idx) => {
        const re = new RegExp('(?:^|\\n)' + opt + '\\s*');
        const match = re.exec(optionsText);
        if (match) {
          const start = match.index + match[0].length;
          let end;
          if (idx < 3) {
            const nextRe = new RegExp('(?:^|\\n)' + ['A.', 'B.', 'C.', 'D.'][idx + 1] + '\\s*');
            const nextMatch = nextRe.exec(optionsText);
            end = nextMatch ? nextMatch.index : optionsText.length;
          } else {
            end = optionsText.length;
          }
          options.push({ label: opt[0], text: optionsText.slice(start, end).trim() });
        }
      });
      questions.push({ id: qid++, text: questionText, options: options });
    });

    const answers = [];
    const answerRegex = /(\d+)[.\s]+([A-D])/gi;
    let match;
    while ((match = answerRegex.exec(answersText))) {
      answers.push({ id: parseInt(match[1]), correct: match[2] });
    }

    if (questions.length !== answers.length) {
      throw new Error('题目数量(' + questions.length + ')与答案数量(' + answers.length + ')不匹配');
    }

    return {
      meta: { type: 'reading' },
      passage: { paragraphs },
      questions: questions,
      answers: answers,
      phases: {
        phase1: { topicPrediction: null, questionTypes: null },
        phase2a: { instruction: { title: 'T1 全景扫描', content: '扫描题干 → 找关键词 → 判断题型' } },
        phase2b: { instruction: { title: 'T3 中心做题', content: '用找到的中心去匹配选项' } },
        phase2c: { instruction: { title: 'T4 定位 + T6 段落锁定 + T3 同义替换', content: '找到定位词 → 锁定段落' } },
        phase3: { title: '统一对答案' },
        phase4: { summary: { title: '文章复盘', content: '对照错题分析原因' } }
      }
    };
  },

  parseMatching: function(paragraphsText, optionsText, answersText) {
    if (!paragraphsText.trim() || !optionsText.trim() || !answersText.trim()) return null;

    const paragraphs = paragraphsText.split(/\n\n+/).map(function(p, idx) {
      return { id: String.fromCharCode(65 + idx), text: p.trim() };
    }).filter(function(p) { return p.text; });

    const options = [];
    const lines = optionsText.split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l; });
    lines.forEach(function(line) {
      const m = line.match(/^(\d+)[\.、]?\s*(.+)$/);
      if (m) {
        options.push({ id: parseInt(m[1]), text: m[2] });
      }
    });

    const answers = [];
    const answerRegex = /(\d+)[.\s]+([A-P])[.\s]+(\d+)/gi;
    let match;
    while ((match = answerRegex.exec(answersText))) {
      const paraId = String.fromCharCode(65 + (parseInt(match[3]) - 1));
      answers.push({ id: parseInt(match[1]), correctPara: paraId });
    }

    if (options.length !== 10) throw new Error('长篇阅读应有10个选项，当前' + options.length + '个');
    if (answers.length !== 10) throw new Error('长篇阅读应有10个答案，当前' + answers.length + '个');

    return {
      meta: { type: 'matching', timeLimit: 15 },
      passage: { paragraphs },
      options: options,
      answers: answers,
      phases: {
        phase1: { instruction: { title: 'Phase 1', content: '选项扫读 → 识别定位词' } },
        phase2: { instruction: { title: 'Phase 2', content: '带着定位词找匹配' } },
        phase3: { title: '对答案' },
        phase4: { summary: { title: '定位词分析', content: '对比自己标记与正确定位词' } }
      },
      overallAnalysis: ''
    };
  },

  parseCloze: function(passageText, banksText, answersText) {
    if (!passageText.trim() || !banksText.trim() || !answersText.trim()) return null;

    const blankRegex = /___(\d+)___/g;
    const blanks = [];
    let m;
    while ((m = blankRegex.exec(passageText))) {
      blanks.push(parseInt(m[1]));
    }

    const banks = [];
    const lines = banksText.split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l; });
    lines.forEach(function(line) {
      const m = line.match(/^([A-O])\.?\s*(\w+)\s*([a-z][a-z]\.?)\s*(.+)$/i);
      if (m) {
        banks.push({ letter: m[1], word: m[2], pos: m[3], meaning: m[4] });
      }
    });

    if (banks.length !== 15) throw new Error('选词填空应有15个候选词，当前' + banks.length + '个');

    const answers = [];
    const answerRegex = /(\d+)[.\s]+([A-O])/gi;
    let match;
    while ((match = answerRegex.exec(answersText))) {
      const bank = banks.find(function(b) { return b.letter === match[2]; });
      answers.push({ blank: parseInt(match[1]), correct: match[2], word: bank ? bank.word : '' });
    }

    if (blanks.length !== 10) throw new Error('选词填空应有10个空位，当前' + blanks.length + '个');
    if (answers.length !== 10) throw new Error('选词填空应有10个答案，当前' + answers.length + '个');

    const paragraphs = [];
    const paraBlocks = passageText.split(/\n\n+/);
    paraBlocks.forEach(function(block) { paragraphs.push(block.trim()); });

    return {
      meta: { type: 'cloze' },
      passage: { paragraphs, blanks },
      banks: banks,
      answers: answers,
      wordAnalysis: [],
      phases: {
        phase1: { instruction: '浏览全文 → 选词填空 → 词性分类缩小范围' },
        phase2: { title: '对答案' },
        phase3: { title: '单词舱' }
      }
    };
  },

  getRootRules: function() {
    return {
      'tion': { suffix: '-tion', meaning: '名词后缀，表示动作、状态' },
      'sion': { suffix: '-sion', meaning: '名词后缀，表示动作、状态' },
      'ment': { suffix: '-ment', meaning: '名词后缀，表示行为、结果' },
      'ness': { suffix: '-ness', meaning: '名词后缀，表示性质、状态' },
      'ity': { suffix: '-ity', meaning: '名词后缀，表示性质' },
      'ty': { suffix: '-ty', meaning: '名词后缀' },
      'al': { suffix: '-al', meaning: '形容词/名词后缀' },
      'able': { suffix: '-able', meaning: '形容词后缀，表示可...的' },
      'ible': { suffix: '-ible', meaning: '形容词后缀，表示可...的' },
      'ive': { suffix: '-ive', meaning: '形容词后缀' },
      'ous': { suffix: '-ous', meaning: '形容词后缀，表示多...的' },
      'ful': { suffix: '-ful', meaning: '形容词后缀，表示充满...的' },
      'less': { suffix: '-less', meaning: '形容词后缀，表示无...的' },
      'ly': { suffix: '-ly', meaning: '副词/形容词后缀' },
      'ify': { suffix: '-ify', meaning: '动词后缀，表示使...' },
      'ize': { suffix: '-ize', meaning: '动词后缀，表示使...化' },
      'ise': { suffix: '-ise', meaning: '动词后缀，表示使...化' },
      'ing': { suffix: '-ing', meaning: '现在分词/动名词后缀' },
      'ed': { suffix: '-ed', meaning: '过去分词/形容词后缀' },
      'er': { suffix: '-er', meaning: '名词/动词后缀，表示人或物' },
      'or': { suffix: '-or', meaning: '名词后缀，表示人' },
      'ic': { suffix: '-ic', meaning: '形容词后缀' },
      'ical': { suffix: '-ical', meaning: '形容词后缀' },
      'ant': { suffix: '-ant', meaning: '形容词/名词后缀' },
      'ent': { suffix: '-ent', meaning: '形容词/名词后缀' },
      'ance': { suffix: '-ance', meaning: '名词后缀' },
      'ence': { suffix: '-ence', meaning: '名词后缀' },
      'age': { suffix: '-age', meaning: '名词后缀' },
      'ship': { suffix: '-ship', meaning: '名词后缀，表示状态、身份' },
      'hood': { suffix: '-hood', meaning: '名词后缀，表示时期' },
      'dom': { suffix: '-dom', meaning: '名词后缀，表示领域' }
    };
  },

  generateClozeWordAnalysis: function(clozeData, rootRules) {
    if (!rootRules) rootRules = ImportParser.getRootRules();
    clozeData.banks.forEach(function(bank) {
      const analysis = ImportParser.analyzeRoot(bank.word, rootRules);
      bank.rootPrefix = analysis.prefix;
      bank.rootExplanation = analysis.explanation;
    });
    clozeData.wordAnalysis = clozeData.banks.map(function(b) {
      return {
        word: b.word,
        pos: b.pos,
        meaning: b.meaning,
        rootPrefix: b.rootPrefix,
        rootExplanation: b.rootExplanation,
        cognates: [],
        examSentence: '',
        mnemonic: '',
        collocations: []
      };
    });
    return clozeData;
  },

  analyzeRoot: function(word, rules) {
    let bestMatch = null;
    let maxLen = 0;
    for (const suffix in rules) {
      if (word.endsWith(suffix) && suffix.length > maxLen) {
        maxLen = suffix.length;
        bestMatch = rules[suffix];
      }
    }
    if (bestMatch) {
      return {
        prefix: word.slice(0, -maxLen) + '-' + bestMatch.suffix,
        explanation: bestMatch.meaning
      };
    }
    return { prefix: '', explanation: '' };
  },

  generateClozeGuides: function(clozeData) {
    return clozeData;
  }
};
