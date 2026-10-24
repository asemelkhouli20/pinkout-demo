#!/usr/bin/env python3
"""PinkOut Partners: assemble the static pages from src/partials.

The site stays plain static HTML (no build step on the server). This script only keeps the
shared parts (head, header, footer, application form, map) identical across pages.

    python3 tools/build_pages.py        # writes index.html (the event page: the home page), beauty.html, shop.html

Edit the partials in src/partials, then run this script. Never edit the generated pages directly.
"""
import html
import json
import re
from pathlib import Path

from tour_markup import tour_for

ROOT = Path(__file__).resolve().parent.parent
P = ROOT / 'src' / 'partials'
part = lambda name: (P / f'{name}.html').read_text(encoding='utf-8')

TRACKS = {
    'event': dict(
        title='Event partners · PinkOut Partners', title_ar='شركاء الفعاليات · شركاء PinkOut',
        description='Sponsorships and brand activations across the whole PinkOut event, the women-first destination coming soon to Riyadh.',
        og_image='worlds/live-1600.webp', hero=None, walk_key='startWalk',
        apply_key='enquireEvent', apply='Enquire as event partner', deck_key='deckEvent', deck='Event deck'),
    'beauty': dict(
        title='Beauty service partners · PinkOut Partners', title_ar='شركاء خدمات التجميل · شركاء PinkOut',
        description='Beauty artists and salons: clients find you and book you at home through the PinkOut app, when it launches. PinkOut is coming soon to Riyadh.',
        og_image='themes/princess-960.webp', hero=None,
        apply_key='applyBeauty', apply='Apply as beauty partner', deck_key='deckBeauty', deck='Beauty deck'),
    'shop': dict(
        title='E-commerce partners · PinkOut Partners', title_ar='شركاء التجارة الإلكترونية · شركاء PinkOut',
        description='Brands and sellers: sell your products in the PinkOut app when it launches, all year round. PinkOut is coming soon to Riyadh.',
        og_image='worlds/hero-1600.webp', hero=None,
        apply_key='applyShop', apply='Apply as seller', deck_key='deckShop', deck='E-commerce deck'),
}


def fill(template, values):
    out = template
    for k, v in values.items():
        out = out.replace('{{' + k + '}}', v)
    left = re.findall(r'\{\{[a-z_]+\}\}', out)
    assert not left, f'unfilled placeholders: {set(left)}'
    return out


def world(track, eyebrow_key, eyebrow, title_key, title, hint_key, hint):
    return fill(part('world'), dict(track=track, world_eyebrow_key=eyebrow_key, world_eyebrow=eyebrow,
                                    world_title_key=title_key, world_title=title, world_hint_key=hint_key, world_hint=hint))


def faq_for(track):
    html = part('faq')
    html = re.sub(r'\s*<div class="faq-filter".*?</div>', '', html, flags=re.S)       # no filter on a track page
    keep = {'general', track}
    html = re.sub(r'\s*<details class="faq" data-group="(\w+)">.*?</details>',
                  lambda m: m.group(0) if m.group(1) in keep else '', html, flags=re.S)
    return html


def other_ways(track):
    html = part('doors')
    html = re.sub(r'\s*<article class="door[^"]*" data-door="' + track + r'">.*?</article>', '', html, flags=re.S)
    html = html.replace('id="partner" aria-labelledby="doors-title"', 'id="other" aria-labelledby="other-title"')
    html = html.replace('<h2 id="doors-title" data-i18n="doorsTitle">Three ways to partner.</h2>',
                        '<h2 id="other-title" data-i18n="otherWays">Other ways to partner.</h2>')
    html = html.replace('<div class="doors" data-reveal-group>', '<div class="doors doors--two" data-reveal-group>')
    html = html.replace('<!-- ============ THREE DOORS ============ -->', '<!-- ============ OTHER WAYS ============ -->')
    return html


JOURNEY = json.loads((ROOT / 'src' / 'journey.json').read_text(encoding='utf-8'))  # app journeys (beauty, shop)


def journey_for(track, t):
    j = JOURNEY[track]
    ui = {lang: dict(JOURNEY['ui'][lang], **j.get('ui', {}).get(lang, {})) for lang in ('en', 'ar')}
    data = dict(j, ui=ui)
    default = j['default']['en']
    fill_brand = lambda text: html.escape(text).replace('{brand}', f'<span class="brand-name">{html.escape(default)}</span>')
    label_key = 'inputLabelBeauty' if track == 'beauty' else 'inputLabel'
    n = len(j['chapters'])
    items = []
    for i, ch in enumerate(j['chapters']):
        en = ch['en']
        extra = ''
        if i == 0:
            extra = (f'\n          <label class="field walk__brand"><span class="field__label" data-walk-ui="{label_key}">{JOURNEY["ui"]["en"][label_key]}</span>'
                     f'<input class="field__control" type="text" data-brand-input maxlength="40" autocomplete="organization" placeholder="{html.escape(default)}"></label>'
                     f'\n          <p class="field__hint" data-walk-ui="inputHint">{JOURNEY["ui"]["en"]["inputHint"]}</p>'
                     f'\n          <p class="walk__scroll" data-walk-ui="scroll" aria-hidden="true">{ui["en"]["scroll"]}</p>')
        if i == n - 1:
            extra = (f'\n          <div class="walk__cta"><button class="btn" type="button" data-apply="{track}" data-source="journey" data-i18n="{t["apply_key"]}">{t["apply"]}</button>'
                     f'<button class="btn btn--secondary" type="button" data-apply="{track}" data-deck data-source="journey-deck" data-i18n="{t["deck_key"]}">{t["deck"]}</button></div>')
        heading = 'h2 id="journey-title"' if i == 0 else 'h3'
        tag = heading.split()[0]
        items.append(f'''      <li class="walk__chapter" data-chapter="{i}">
        <article class="walk__card">
          <span class="eyebrow eyebrow--white" data-ch-kicker>{html.escape(en["kicker"])}</span>
          <{heading} class="walk__title" data-ch-title>{fill_brand(en["title"])}</{tag}>
          <p data-ch-text>{fill_brand(en["text"])}</p>{extra}
        </article>
      </li>''')
    dots = ''.join(f'<li><button type="button" data-walk-dot aria-label="{i + 1}"></button></li>' for i in range(n))
    payload = json.dumps(data, ensure_ascii=False).replace('</', '<\\/')
    stage = (part(f'phone-{track}').replace('>Your name<', f'>{html.escape(default)}<').replace('>Your brand<', f'>{html.escape(default)}<')
             + '      <span class="concept walk__concept" data-i18n="appConcept">App concept</span>')
    return f'''  <!-- ============ JOURNEY ============ -->
  <section class="walk walk--{track} walk--app" id="journey" data-walk="{track}" aria-labelledby="journey-title" style="--chapters:{n}">
    <script type="application/json" data-walk-data>{payload}</script>
    <a class="skip-link walk__skip" href="#{track}" data-walk-ui="skip">{JOURNEY["ui"]["en"]["skip"]}</a>
    <div class="walk__stage" data-walk-stage>
{stage}
      <div class="walk__hud"><span class="walk__count" data-walk-count aria-live="polite"></span><ol class="walk__dots">{dots}</ol></div>
    </div>
    <ol class="walk__chapters">
{chr(10).join(items)}
    </ol>
  </section>

'''


def closing_for(track, t):
    return f'''  <!-- ============ CLOSING ============ -->
  <section class="block block--rose arch-cta" id="start" aria-labelledby="close-title">
    <div class="arch-cta__frame" data-arch><img src="assets/images/worlds/passage-480.webp?v=1" alt="Concept render of Pink Passage, the arched entrance" width="480" height="394" loading="lazy" data-i18n-attr="alt:altPassage"></div>
    <h2 id="close-title" data-i18n="closeTrack">One short form away.</h2>
    <div class="arch-cta__actions">
      <button class="btn" type="button" data-apply="{track}" data-source="closing" data-i18n="{t['apply_key']}">{t['apply']}</button>
      <button class="btn btn--secondary" type="button" data-apply="{track}" data-deck data-source="closing-deck" data-i18n="{t['deck_key']}">{t['deck']}</button>
    </div>
  </section>
'''


# Pages kept by hand: never overwritten by this script. beauty.html carries the hand-built beauty journal
# (see docs/beauty-journal.md), which the partials do not have.
HAND_MAINTAINED = {'beauty.html'}


def page(path, page_id, title, title_ar, description, og_image, preload, sections):
    if (path or 'index.html') in HAND_MAINTAINED:
        print('kept', path, '(maintained by hand, not generated)')
        return
    home = '' if not path else 'index.html'  # links to sections of the home page (path '' = index.html)
    head = fill(part('head'), dict(title=title, description=description, og_image=og_image, path=path, preload=preload))
    header = fill(part('header'), dict(
        home=home, logo_href='#top' if not path else 'index.html',
        **{f'cur_{t}': (' aria-current="page"' if page_id == t else '') for t in TRACKS}))
    tail = fill(part('tail'), dict(home=home, logo_href='#top' if not path else 'index.html'))
    body_open = (f'<body class="site" data-for="" data-page="{page_id}" '
                 f'data-title-en="{title}" data-title-ar="{title_ar}">\n'
                 '<a class="skip-link" href="#main" data-i18n="skip">Skip to content</a>\n\n')
    generated = f'<!-- GENERATED by tools/build_pages.py from src/partials — edit the partials, not this file. -->\n'
    html = (head.replace('<!doctype html>\n', '<!doctype html>\n' + generated, 1) + body_open + header
            + '<main id="main">\n\n' + ''.join(sections) + '</main>\n\n' + tail + '</body>\n</html>\n')
    (ROOT / (path or 'index.html')).write_text(html, encoding='utf-8')
    print('wrote', path or 'index.html', f'({len(html) // 1024} KB)')


# ---------- Pages ----------
# The event page is the home page (index.html): the site opens on the venue tour. (The old home page, with the three
# partner doors and the zone map, was retired on 24 Oct 2026; it is kept in _archive/old-home/.)
# ---------- One page per partner type ----------
# Event partners get the whole event: their page opens straight on the venue tour (tools/tour_markup.py), which is
# its hero (title, brand name). Beauty service and e-commerce partners work through the app: a hero, then the app journey.
for track, t in TRACKS.items():
    preload = f'<link rel="preload" href="assets/images/{t["hero"]}?v=1" as="image" fetchpriority="high">\n' if t['hero'] else ''
    story = tour_for() if track == 'event' else journey_for(track, t)  # event: the venue tour; others: the app journey
    hero = [] if track == 'event' else [part(f'track-{track}-hero')]
    page('' if track == 'event' else f'{track}.html', track, t['title'], t['title_ar'], t['description'], t['og_image'], preload,
         hero + [story, part(f'track-{track}'),
          faq_for(track), other_ways(track), closing_for(track, t)])
