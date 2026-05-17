class CET6Loader {
  static async load(dataPath) {
    try {
      const resp = await fetch(dataPath);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
      const data = await resp.json();
      const errors = CET6Loader.validate(data);
      if (errors.length > 0) {
        console.error('数据校验失败:', errors);
        throw new Error('数据格式错误: ' + errors.join('; '));
      }
      return data;
    } catch (e) {
      console.error('加载数据失败:', e);
      throw e;
    }
  }

  static validate(data) {
    const errors = [];
    if (!data) { errors.push('数据为空'); return errors; }
    if (!data.meta) errors.push('缺少 meta');
    if (!data.passage) errors.push('缺少 passage');
    if (!data.questions || !Array.isArray(data.questions)) errors.push('缺少 questions 数组');
    if (!data.answers || !Array.isArray(data.answers)) errors.push('缺少 answers 数组');
    if (!data.phases) errors.push('缺少 phases');

    if (data.questions && data.answers && data.questions.length !== data.answers.length) {
      errors.push(`题目数量(${data.questions.length})与答案数量(${data.answers.length})不匹配`);
    }

    if (data.answers) {
      data.answers.forEach((a, i) => {
        if (!a.id) errors.push(`answers[${i}] 缺少 id`);
        if (!a.correct) errors.push(`answers[${i}] 缺少 correct`);
      });
    }

    if (data.questions) {
      data.questions.forEach((q, i) => {
        if (!q.id) errors.push(`questions[${i}] 缺少 id`);
        if (!q.options || !Array.isArray(q.options)) errors.push(`questions[${i}] 缺少 options`);
      });
    }

    if (data.phases) {
      if (!data.phases.phase1) errors.push('缺少 phases.phase1');
      if (!data.phases.phase2a) errors.push('缺少 phases.phase2a');
      if (!data.phases.phase2b) errors.push('缺少 phases.phase2b');
      if (!data.phases.phase2c) errors.push('缺少 phases.phase2c');
      if (!data.phases.phase3) errors.push('缺少 phases.phase3');
      if (!data.phases.phase4) errors.push('缺少 phases.phase4');
    }

    return errors;
  }
}