"""PinkOut Partners: markup for the event-page tour, generated from src/tour.json (used by build_pages.py).

The English text is written into the page (works without JS); tour.js swaps in Arabic and the partner's
name at runtime from the same JSON, through the data-tx hooks.
"""
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TOUR = json.loads((ROOT / 'src' / 'tour.json').read_text(encoding='utf-8'))
_data_js = (ROOT / 'assets' / 'js' / 'data.js').read_text(encoding='utf-8')
ZONE_FACTS = {m.group(1): dict(name=m.group(2), size=m.group(3), stations=re.findall(r"'([^']*)'", m.group(4)))
              for m in re.finditer(r"id: '(\w+)', name: '([^']*)'.*?size: '([^']*)'.*?stations: \{ en: \[(.*?)\]", _data_js, re.S)}
FALLBACK_SIZE = {'passage': 787}
ICONS = {
    'eye': '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    'camera': '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    'palette': '<path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-1 2-2s-1-1.5-1-2.5 1-1.5 2-1.5h2a4 4 0 0 0 4-4c0-4.4-4-8-9-8z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/>',
    'people': '<circle cx="8" cy="8" r="3"/><path d="M2 20c0-3.3 2.7-5 6-5s6 1.7 6 5"/><path d="M16 5a3 3 0 0 1 0 6M16 15c3.3 0 6 1.7 6 5"/>',
    'clock': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    'repeat': '<path d="M20 11a8 8 0 0 0-14.6-4.5M4 13a8 8 0 0 0 14.6 4.5"/><path d="M5 3v4h4M19 21v-4h-4"/>',
    'hand': '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11m0-1.5v-6a1.5 1.5 0 0 1 3 0V11m0-4.5a1.5 1.5 0 0 1 3 0V13c0 4-2.5 8-7 8-3 0-4.5-1.5-6-4l-2-3.5a1.5 1.5 0 0 1 2.6-1.5L8 13"/>',
    'gift': '<path d="M4 11h16v10H4zM3 7h18v4H3zM12 7v14"/><path d="M12 7c-1.5-3-5-3-5-1s3 1 5 1zm0 0c1.5-3 5-3 5-1s-3 1-5 1z"/>',
    'search': '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l5 5"/>',
    'store': '<path d="M4 9l1.5-5h13L20 9M4 9h16v11H4zM9 20v-6h6v6"/>',
    'star': '<path d="M12 3l2.5 5 5.5.8-4 3.9 1 5.5-5-2.6-5 2.6 1-5.5-4-3.9 5.5-.8z"/>',
    'sparkle': '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18"/>',
    'heart': '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
}
# the themed-day switcher on the map (one icon per theme in tour.json "themes"; default = every day)
THEME_ICONS = {
    'default': '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    'kpop': '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/>',
    'movie': '<path d="M6 9l1.5 12h9L18 9z"/><path d="M10 9.5l.5 11.5M14 9.5l-.5 11.5"/><path d="M6 9a2.5 2.5 0 0 1 2-4 2.6 2.6 0 0 1 4-1.3A2.6 2.6 0 0 1 16 5a2.5 2.5 0 0 1 2 4"/>',
    'henna': '<path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M16 11h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8 3c0 1.5 1.5 1.5 1.5 3M12 3c0 1.5 1.5 1.5 1.5 3"/>',
    'princess': '<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 10H5z"/><path d="M5 21h14"/>',
    'pajama': '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    'japan': '<path d="M3 6.5c6 1 12 1 18 0M5 10h14M7 7v14M17 7v14"/>',
    'camping': '<path d="M3 20L12 4l9 16z"/><path d="M9 20l3-6 3 6"/>',
    'horror': '<path d="M6 20V10a6 6 0 0 1 12 0v10l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5z"/><circle cx="10" cy="10.5" r="1"/><circle cx="14" cy="10.5" r="1"/>',
}
CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
esc = html.escape


def _brand(text, default):
    return esc(text).replace('{brand}', f'<span class="brand-name">{esc(default)}</span>')


def _intro(ui):
    intro = TOUR['intro']['en']
    facts = ''.join(f'<li data-tx="i.facts.{k}">{esc(f)}</li>' for k, f in enumerate(intro['facts']))
    return f'''      <li class="tour__stop tour__stop--intro" data-stop="0" id="stop-overview">
        <article class="stop-card stop-card--intro">
          <span class="eyebrow" data-tx="i.kicker">{esc(intro["kicker"])}</span>
          <h1 id="tour-title" class="stop-card__title" data-tx="i.title">{_brand(intro["title"], ui["default"])}</h1>
          <p class="stop-card__what" data-tx="i.text">{_brand(intro["text"], ui["default"])}</p>
          <ul class="stop-card__facts">{facts}</ul>
          <label class="field stop-card__brand"><span class="field__label" data-i18n="brandLabel">Your brand name</span><input class="field__control" type="text" data-brand-input maxlength="40" autocomplete="organization" placeholder="{esc(ui["default"])}"></label>
          <p class="tour__scroll" data-tx="u.scroll" aria-hidden="true">{esc(ui["scroll"])}</p>
        </article>
        <figure class="tour__fallback media-frame"><img src="assets/images/worlds/hero-960.webp?v=1" alt="" width="960" height="544" loading="lazy"><span class="concept" data-i18n="concept">Concept</span></figure>
      </li>'''


def _zone(i, z, ui):
    # a stop films one venue zone ('zone', default its own id): stop 08 is the Pink Passage again, on the way out
    zid, en = z['id'], z['en']
    zone = z.get('zone', zid)
    f = ZONE_FACTS[zone]
    name = en.get('name', f['name'])
    name_tx = f' data-tx="z.{i - 1}.name"' if 'name' in en else ''
    can = ''.join(f'<li>{CHECK}<span data-tx="z.{i - 1}.can.{k}">{esc(c)}</span></li>' for k, c in enumerate(en['can']))
    gets = ''.join(f'<li><span class="stop-card__icon"><svg viewBox="0 0 24 24" aria-hidden="true">{ICONS[ic]}</svg></span>'
                   f'<span data-tx="z.{i - 1}.gets.{k}">{esc(g)}</span></li>' for k, (ic, g) in enumerate(zip(z['icons'], en['gets'])))
    beauty = ' tour__fallback--beauty' if zone == 'beauty' else ''
    return f'''      <li class="tour__stop" data-stop="{i}" id="stop-{zid}" style="--zone-c:var(--zone-{zone})">
        <article class="stop-card">
          <div class="stop-card__head"><span class="stop-card__num" aria-hidden="true">{i:02d}</span><div><span class="stop-card__of" data-tx="u.zoneOf" data-n="{i}">{esc(ui["zoneOf"].replace("{n}", str(i)))}</span><span class="stop-card__tag" data-tx="z.{i - 1}.tag">{esc(en["tag"])}</span></div></div>
          <h3 class="stop-card__title"{name_tx}>{esc(name)}</h3>
          <p class="stop-card__what" data-tx="z.{i - 1}.what">{esc(en["what"])}</p>
          <div class="stop-card__block" data-reveal="1"><h4 data-tx="u.can">{_brand(ui["can"], ui["default"])}</h4><ul class="stop-card__can">{can}</ul></div>
          <div class="stop-card__block" data-reveal="2"><h4 data-tx="u.gets">{_brand(ui["gets"], ui["default"])}</h4><ul class="stop-card__gets">{gets}</ul></div>
          <button class="btn" type="button" data-apply="event" data-interest="activation" data-zone="{zone}" data-source="tour" data-tx="u.enquire" data-zone-name="{esc(f["name"])}">{esc(ui["enquire"].replace("{zone}", f["name"]))}</button>
        </article>
        <figure class="tour__fallback media-frame{beauty}"><img src="assets/images/worlds/{zone}-960.webp?v=1" alt="" width="960" height="{FALLBACK_SIZE.get(zone, 541)}" loading="lazy"><span class="concept" data-i18n="concept">Concept</span></figure>
      </li>'''


def _finale(i, ui):
    fin = TOUR['finale']['en']
    keys = ['season', 'zone', 'stage', 'theme']
    pk = ''.join(f'<button class="chip chip--pkg" type="button" data-apply="event" data-interest="sponsorship"{" data-zone=" + chr(34) + "live" + chr(34) if k == "stage" else ""} data-source="tour-{k}" data-tx="f.packages.{j}">{esc(p)}</button>'
                 for j, (k, p) in enumerate(zip(keys, fin['packages'])))
    return f'''      <li class="tour__stop tour__stop--finale" data-stop="{i}" id="stop-finale">
        <article class="stop-card stop-card--finale">
          <span class="eyebrow" data-tx="f.kicker">{esc(fin["kicker"])}</span>
          <h3 class="stop-card__title" data-tx="f.title">{_brand(fin["title"], ui["default"])}</h3>
          <p class="stop-card__what" data-tx="f.text">{_brand(fin["text"], ui["default"])}</p>
          <div class="stop-card__packages">{pk}</div>
          <div class="stop-card__cta"><button class="btn" type="button" data-apply="event" data-source="tour-finale" data-i18n="enquireEvent">Enquire as event partner</button><button class="btn btn--secondary" type="button" data-apply="event" data-deck data-source="tour-deck" data-i18n="deckEvent">Event deck</button></div>
          <p class="tour__explore" data-tx="u.explore">{esc(ui["explore"])}</p>
        </article>
        <figure class="tour__fallback media-frame"><img src="assets/images/worlds/live-960.webp?v=1" alt="" width="960" height="541" loading="lazy"><span class="concept" data-i18n="concept">Concept</span></figure>
      </li>'''


def _themes(ui):
    buttons = ''.join(
        f'<button class="tour__theme" type="button" data-theme-pick="{th["id"]}" aria-pressed="{str(th["id"] == "default").lower()}" '
        f'aria-label="{esc(th["en"]["name"])}" title="{esc(th["en"]["name"])}" data-tx-label="t.{k}.name">'
        f'<svg viewBox="0 0 24 24" aria-hidden="true">{THEME_ICONS[th["id"]]}</svg></button>'
        for k, th in enumerate(TOUR['themes']))
    return f'''      <div class="tour__themes" data-tour-themes role="group" aria-labelledby="tour-themes-title">
        <span class="tour__themes-title" id="tour-themes-title" data-tx="u.themes">{esc(ui["themes"])}</span>{buttons}
      </div>
'''


def tour_for():
    ui = TOUR['ui']['en']
    n = len(TOUR['zones']) + 2
    items = [_intro(ui)] + [_zone(i, z, ui) for i, z in enumerate(TOUR['zones'], 1)] + [_finale(n - 1, ui)]
    payload = json.dumps(TOUR, ensure_ascii=False).replace('</', '<\\/')
    nl = '\n'
    return f'''  <!-- ============ THE TOUR ============ -->
  <section class="tour" id="tour" data-tour aria-labelledby="tour-title">
    <script type="application/json" data-tour-data>{payload}</script>
    <a class="skip-link tour__skip" href="#event" data-tx="u.skip">{esc(ui["skip"])}</a>
    <div class="tour__stage" data-tour-stage>
      <div class="tour__labels" data-tour-labels aria-hidden="true"></div>
      <div class="tour__plan" data-tour-plan aria-hidden="true"><span class="tour__plan-title" data-tx="u.plan">{esc(ui["plan"])}</span></div>
{_themes(ui)}    </div>
    <ol class="tour__stops">
{nl.join(items)}
    </ol>
  </section>

'''
