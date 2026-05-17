import sys
import os
import json
import html


def nl2br(text):
    return text.replace('\n', '<br>')


def esc(text):
    return html.escape(str(text))


def esc_nl(text):
    return nl2br(esc(text))


def generate_article_html(data):
    parts = []
    for p in data['article']:
        para = p['para']
        text = esc_nl(p['text'])
        is_head = 'true' if p['is_head'] else 'false'
        is_tail = 'true' if p['is_tail'] else 'false'
        parts.append(
            f'<p><span class="selectable" data-para="{para}" data-head="{is_head}" data-tail="{is_tail}">{text}</span></p>'
        )
    return '\n'.join(parts)


def generate_phase2a_sentences(data):
    sentences = data['phase_data']['phase2a_center']['head_tail_sentences']
    parts = []
    for s in sentences:
        label = f'P{s["para"]} {s["type"]}：'
        text = esc_nl(s['text'])
        parts.append(
            f'<div class="s-item"><span class="s-label">{label}</span><span class="selectable">{text}</span></div>'
        )
    return '\n'.join(parts)


def generate_phase2b_strategy(data):
    strategies = data['phase_data']['phase2b_strategy']['question_strategy']
    parts = []
    for s in strategies:
        can_do = '✅ 中心可做' if s['can_do_by_center'] else '⭐ 需精读定位'
        hint = esc_nl(s['hint'])
        parts.append(
            f'<div class="analysis-box"><strong>{s["num"]}题</strong> — {can_do}<br>{hint}</div>'
        )
    return '\n'.join(parts)


def generate_phase2c_locate(data):
    locates = data['phase_data']['phase2c_locate']
    parts = []
    for l in locates:
        paras = ','.join([f'P{p}' for p in l['paras']])
        analysis = esc_nl(l['analysis'])
        parts.append(
            f'<div class="analysis-box"><strong>📍 {l["num"]}题定位 → {paras}</strong><br>{analysis}</div>'
        )
    return '\n'.join(parts)


def generate_phase3_answers(data):
    parts = []
    for q in data['questions']:
        correct = q['correct']
        opt_text = ''
        for opt in q['options']:
            if opt['label'] == correct:
                opt_text = esc(opt['text'])
                break
        reasoning = esc_nl(q['reasoning'])
        parts.append(
            f'<div class="ans-item"><strong>{q["num"]}.</strong> <span class="ans-correct">✅ {correct}) {opt_text}</span><br><span style="font-size:13px;color:var(--text2)">{reasoning}</span></div>'
        )
    parts.append('<div id="wrong-analysis-container"></div>')
    return '\n'.join(parts)


def generate_phase3_translation(data):
    questions = data['questions']
    para_key_sentences = {}
    for q in questions:
        for p in q.get('location_paras', []):
            if p not in para_key_sentences:
                para_key_sentences[p] = []
            para_key_sentences[p].append((q['num'], q['key_sentence']))

    translations = data['phase_data']['phase3_translation']
    left_parts = []
    right_parts = []

    for t in translations:
        en_text = esc_nl(t['en'])
        zh_text = esc_nl(t['zh'])

        para = t['para']
        if para in para_key_sentences:
            for q_num, key_sent in para_key_sentences[para]:
                escaped_key = esc(key_sent)
                if escaped_key in en_text:
                    wrapped = f'<span class="key-word">{escaped_key}</span><span class="key-tag">[{q_num}题]</span>'
                    en_text = en_text.replace(escaped_key, wrapped, 1)

        left_parts.append(f'<p class="trans-p">{en_text}</p>')
        right_parts.append(f'<p class="trans-p">{zh_text}</p>')

    left_html = ''.join(left_parts)
    right_html = ''.join(right_parts)
    return f'<div class="trans-col trans-left">{left_html}</div><div class="trans-col trans-right">{right_html}</div>'


def generate_phase4_tech_stats(data):
    stats = data['phase_data']['phase4_summary']['tech_stats']
    items = ''.join([f'<span class="tech-stat">{esc(s)}</span>' for s in stats])
    return f'<div class="tech-stats">{items}</div>'


def generate_phase4_question_review(data):
    reviews = data['phase_data']['phase4_summary']['question_review']
    parts = []
    for r in reviews:
        detail = esc_nl(r['detail'])
        parts.append(
            f'<div class="analysis-box"><strong>{r["num"]}题</strong> — {esc(r["tech"])}<br>{detail}</div>'
        )
    return '\n'.join(parts)


def generate_questions_preview(data):
    parts = []
    for q in data['questions']:
        tag_class = f'tag-{q["type"]}'
        q_text = esc_nl(q['text'])
        opts_html = ''.join(
            [f'<div>{esc(o["label"])}) {esc(o["text"])}</div>' for o in q['options']]
        )
        parts.append(
            f'<div class="question-item"><div class="q-text"><span class="tag {tag_class}">{esc(q["type_label"])}</span> {q["num"]}. {q_text}</div><div class="options">{opts_html}</div></div>'
        )
    return '\n'.join(parts)


def generate_questions_interactive(data):
    parts = []
    for q in data['questions']:
        tag_class = f'tag-{q["type"]}'
        q_text = esc_nl(q['text'])
        opts_html = ''.join(
            [
                f'<div onclick="selectOption({q["num"]}, \'{o["label"]}\')">{esc(o["label"])}) {esc(o["text"])}</div>'
                for o in q['options']
            ]
        )
        parts.append(
            f'<div class="question-item"><div class="q-text">{q["num"]}. {q_text}</div>'
            f'<div class="options" data-q="{q["num"]}">{opts_html}</div>'
            f'<div style="margin-top:8px;font-size:13px"><span class="tag {tag_class}">{esc(q["type_label"])}</span>'
            f'<span style="color:var(--text2)">定位词：{esc(q["location"])}</span></div></div>'
        )
    return '\n'.join(parts)


def generate_answers_html(data):
    parts = []
    parts.append(
        '<div class="score-display"><span class="score-num" id="opts-score-display">0</span><span id="opts-score-desc">/ 5</span></div>'
    )
    parts.append(
        '<div class="progress-bar"><div class="ok" style="width:0%"></div><div class="fail" style="width:0%"></div></div>'
    )
    parts.append('<div style="margin-top:12px">')
    for q in data['questions']:
        correct = q['correct']
        opt_text = ''
        for opt in q['options']:
            if opt['label'] == correct:
                opt_text = esc(opt['text'])
                break
        reasoning = esc_nl(q['reasoning'])
        parts.append(
            f'<div class="ans-item"><strong>{q["num"]}.</strong> <span class="ans-correct">✅ {correct}) {opt_text}</span><br><span style="font-size:13px;color:var(--text2)">{reasoning}</span></div>'
        )
    parts.append('</div>')
    parts.append('<div id="wrong-analysis-container-opts"></div>')
    return '\n'.join(parts)


def generate_correct_answers_js(data):
    result = {}
    for q in data['questions']:
        result[str(q['num'])] = q['correct']
    return json.dumps(result, ensure_ascii=False)


def generate_wrong_analysis_js(data):
    result = {}
    for q in data['questions']:
        wa = q.get('wrong_analysis', {})
        if wa:
            q_key = str(q['num'])
            result[q_key] = {}
            for k, v in wa.items():
                result[q_key][k] = esc_nl(v)
    return json.dumps(result, ensure_ascii=False)


def main():
    if len(sys.argv) < 2:
        print('Usage: python generate.py <json_file>')
        sys.exit(1)

    json_path = sys.argv[1]
    script_dir = os.path.dirname(os.path.abspath(__file__))
    template_path = os.path.join(script_dir, 'cet6-reader-template.html')

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    with open(template_path, 'r', encoding='utf-8') as f:
        template = f.read()

    json_basename = os.path.splitext(os.path.basename(json_path))[0]
    json_abs_path = os.path.abspath(json_path)
    json_parent_dir = os.path.dirname(json_abs_path)
    output_dir = os.path.dirname(json_parent_dir)
    output_path = os.path.join(output_dir, f'cet6-reader-{json_basename}.html')

    replacements = {
        '@@META_TITLE@@': esc(data['meta']['title']),
        '@@META_PASSAGE@@': esc(data['meta']['passage']),
        '@@META_TOPIC@@': esc(data['meta']['topic']),
        '@@ARTICLE_HTML@@': generate_article_html(data),
        '@@PHASE1_KEYWORD_SCAN@@': esc_nl(data['phase_data']['phase1_preview']['keyword_scan']),
        '@@PHASE1_SENTIMENT_ANALYSIS@@': esc_nl(data['phase_data']['phase1_preview']['sentiment_analysis']),
        '@@PHASE1_AUTHOR_ATTITUDE_GUESS@@': esc_nl(data['phase_data']['phase1_preview']['author_attitude_guess']),
        '@@PHASE1_QUESTION_TYPES@@': esc_nl(data['phase_data']['phase1_preview']['question_types']),
        '@@PHASE2A_SENTENCES@@': generate_phase2a_sentences(data),
        '@@PHASE2A_SENTIMENT_CORRECTION@@': esc_nl(data['phase_data']['phase2a_center']['sentiment_correction']),
        '@@PHASE2A_CENTER@@': esc_nl(data['phase_data']['phase2a_center']['center_conclusion']),
        '@@PHASE2A_QUESTION_PREDICTION@@': esc_nl(data['phase_data']['phase2a_center']['question_prediction']),
        '@@PHASE2B_CENTER_HINT@@': esc_nl(data['phase_data']['phase2b_strategy']['center_hint']),
        '@@PHASE2B_STRATEGY@@': generate_phase2b_strategy(data),
        '@@PHASE2B_TIPS@@': '💡 中心法则：选项中和中心靠得最近的 = 正确答案（无需定位）。如果选项都和中心无关，则需要回原文定位。',
        '@@PHASE2C_LOCATE@@': generate_phase2c_locate(data),
        '@@PHASE2C_SYNONYM_TABLE@@': '同义替换是六级阅读核心技巧：reevaluate→reexamine, harm→detrimental effects, working harder→exceptional endeavor, invest in work instead→investing time in work instead of connecting with friends',
        '@@PHASE2C_SENTIMENT@@': esc_nl(data['phase_data']['phase2c_sentiment']),
        '@@PHASE3_ANSWERS@@': generate_phase3_answers(data),
        '@@PHASE3_TRANSLATION@@': generate_phase3_translation(data),
        '@@PHASE4_CENTER@@': esc_nl(data['center_theme']),
        '@@PHASE4_TECH_STATS@@': generate_phase4_tech_stats(data),
        '@@PHASE4_QUESTION_REVIEW@@': generate_phase4_question_review(data),
        '@@PHASE4_PITFALLS@@': esc_nl(data['phase_data']['phase4_summary']['pitfalls']),
        '@@PHASE4_STATS_PANEL@@': generate_phase4_tech_stats(data),
        '@@QUESTIONS_PREVIEW_HTML@@': generate_questions_preview(data),
        '@@QUESTIONS_INTERACTIVE_HTML@@': generate_questions_interactive(data),
        '@@ANSWERS_HTML@@': generate_answers_html(data),
        '@@CORRECT_ANSWERS_JS@@': generate_correct_answers_js(data),
        '@@WRONG_ANALYSIS_JS@@': generate_wrong_analysis_js(data),
    }

    result = template
    for placeholder, value in replacements.items():
        result = result.replace(placeholder, value)

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(result)

    print(f'✅ 生成成功: {output_path}')


if __name__ == '__main__':
    main()
