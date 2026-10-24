"""PinkOut Partners: markup for an app partner page that opens on a stage (used by build_pages.py).

Like the event tour, the page opens straight on the scene: her booking plays on a phone over a night-lit photo, with
one glass card per step. Content: src/journey.json (a track with "tour": true). journey.js plays it and swaps in
Arabic and the partner's name at runtime from the same JSON.
"""
import html
import json
from pathlib import Path

from tour_markup import ICONS, CHECK

ROOT = Path(__file__).resolve().parent.parent
esc = html.escape


def apptour_for(track, t, journey, phone_html):
    j = journey[track]
    ui = j['ui']['en']
    name = j['default']['en']
    brand = lambda text: esc(text).replace('{brand}', f'<span class="brand-name">{esc(name)}</span>')
    accent = lambda text: brand(text).replace('[[', '<em>').replace(']]', '</em>')
    data = dict(j, ui={lang: dict(journey['ui'][lang], **j['ui'][lang]) for lang in ('en', 'ar')})
    payload = json.dumps(data, ensure_ascii=False).replace('</', '<\\/')
    chapters = j['chapters']
    n = len(chapters)
    intro = j['intro']['en']
    label_key = 'inputLabelBeauty' if track == 'beauty' else 'inputLabel'
    more = ('<button class="stop-card__more" type="button" data-card-more aria-expanded="false">'
            f'<span data-walk-ui="details">{esc(ui["details"])}</span><span data-walk-ui="less">{esc(ui["less"])}</span></button>')
    actions = ('<div class="stop-card__cta">'
               f'<button class="btn" type="button" data-apply="{track}" data-source="journey" data-i18n="{t["apply_key"]}">{t["apply"]}</button>'
               f'<button class="btn btn--secondary" type="button" data-apply="{track}" data-deck data-source="journey-deck" data-i18n="{t["deck_key"]}">{t["deck"]}</button></div>')

    facts = ''.join(f'<li data-ch-fact="{k}">{esc(f)}</li>' for k, f in enumerate(intro['facts']))
    items = [
        '      <li class="atour__stop atour__stop--intro" data-chapter="0">\n'
        '        <article class="stop-card stop-card--intro">\n'
        f'          {more}\n'
        f'          <span class="eyebrow" data-ch-kicker>{esc(intro["kicker"])}</span>\n'
        f'          <h1 id="journey-title" class="stop-card__title" data-ch-title>{accent(intro["title"])}</h1>\n'
        f'          <p class="stop-card__what" data-ch-text>{brand(intro["text"])}</p>\n'
        f'          <ul class="stop-card__facts">{facts}</ul>\n'
        f'          <label class="field stop-card__brand"><span class="field__label" data-walk-ui="{label_key}">{journey["ui"]["en"][label_key]}</span>'
        f'<input class="field__control" type="text" data-brand-input maxlength="40" autocomplete="{"name" if track == "beauty" else "organization"}" placeholder="{esc(name)}"></label>\n'
        f'          <label class="atour__photo"><input type="file" accept="image/*" data-brand-photo><span class="atour__photo-pic" data-photo-preview aria-hidden="true"></span>'
        f'<span><b data-walk-ui="photo">{esc(ui["photo"])}</b><small data-walk-ui="photoHint">{esc(ui["photoHint"])}</small></span></label>\n'
        f'          {actions}\n'
        f'          <p class="atour__scroll" data-walk-ui="scroll" aria-hidden="true">{esc(ui["scroll"])}</p>\n'
        '        </article>\n'
        '      </li>'
    ]
    for i, ch in enumerate(chapters, 1):
        en = ch['en']
        progress = ''.join('<i data-now></i>' if k == i else '<i data-done></i>' if k < i else '<i></i>' for k in range(1, n + 1))
        can = ''.join(f'<li>{CHECK}<span data-ch-can="{k}">{esc(c)}</span></li>' for k, c in enumerate(en['can']))
        gets = ''.join(f'<li><span class="stop-card__icon"><svg viewBox="0 0 24 24" aria-hidden="true">{ICONS[g["icon"]]}</svg></span>'
                       f'<span data-ch-get="{k}">{esc(g["en"])}</span></li>' for k, g in enumerate(ch['gets']))
        cta = actions if i == n else (f'<button class="btn" type="button" data-apply="{track}" data-source="journey-{i}" '
                                      f'data-i18n="{t["apply_key"]}">{t["apply"]}</button>')
        of = (f'<span data-walk-ui="step">{esc(ui["step"])}</span> <span class="t-ltr">{i}</span> '
              f'<span data-walk-ui="of">{esc(ui["of"])}</span> <span class="t-ltr">{n}</span>')
        items.append(
            f'      <li class="atour__stop" data-chapter="{i}">\n'
            '        <article class="stop-card">\n'
            f'          {more}\n'
            f'          <div class="stop-card__head"><span class="stop-card__num" aria-hidden="true">{i:02d}</span><div><span class="stop-card__of">{of}</span>'
            f'<span class="stop-card__tag" data-ch-kicker>{esc(en["kicker"])}</span></div></div>\n'
            f'          <div class="stop-card__progress" aria-hidden="true">{progress}</div>\n'
            f'          <h2 class="stop-card__title" data-ch-title>{brand(en["title"])}</h2>\n'
            f'          <p class="stop-card__what" data-ch-text>{brand(en["text"])}</p>\n'
            f'          <div class="stop-card__block"><h4 data-walk-ui="can">{esc(ui["can"])}</h4><ul class="stop-card__can">{can}</ul></div>\n'
            f'          <div class="stop-card__block"><h4 data-walk-ui="gets">{esc(ui["gets"])}</h4><ul class="stop-card__gets">{gets}</ul></div>\n'
            f'          {cta}\n'
            '        </article>\n'
            '      </li>')

    # sparkles drifting up through the light (positions fixed here, so every visit looks the same)
    air = ''.join(f'<i style="--x:{(k * 37 + 11) % 100}%;--s:{4 + k % 4 * 2}px;--d:{9 + k % 5 * 2}s;--w:-{(k * 1.7) % 12:.1f}s"></i>' for k in range(18))
    bgs = ''.join(f'<img src="assets/images/{src}?v=1" alt="" data-bg="{key}" decoding="async"{"" if k == 0 else " loading=" + chr(34) + "lazy" + chr(34)}>'
                  for k, (key, src) in enumerate(j['bgs'].items()))
    stage = phone_html.replace('>Your name<', f'>{esc(name)}<').replace('>Your brand<', f'>{esc(name)}<')
    nl = '\n'
    return f'''  <!-- ============ JOURNEY ============ -->
  <section class="atour atour--{track}" id="journey" data-walk="{track}" data-atour aria-labelledby="journey-title">
    <script type="application/json" data-walk-data>{payload}</script>
    <a class="skip-link walk__skip" href="#{track}" data-walk-ui="skip">{journey["ui"]["en"]["skip"]}</a>
    <div class="atour__stage" data-walk-stage>
      <div class="atour__bg" aria-hidden="true">{bgs}</div>
      <div class="atour__scene" data-atour-scene>
{stage}        <div class="atour__moments" data-atour-moments aria-hidden="true"></div>
      </div>
      <div class="atour__air" aria-hidden="true">{air}</div>
      <span class="concept atour__concept" data-i18n="appConcept">App concept</span>
    </div>
    <ol class="atour__stops">
{nl.join(items)}
    </ol>
  </section>

'''
