// PinkOut Partners — page controller.
// Layers: HTML works alone → this adds behaviour → motion.js adds GSAP → map3d.js adds the 3D map.
import { get, set, on, safeStore, $, $$ } from './store.js?v=20';
import { initI18n, t } from './i18n.js?v=21';
import { ZONES } from './data.js?v=20';
import { AR } from './copy.js?v=21';
import { initForm, openApplication } from './form.js?v=21';
import { initJourney } from './journey.js?v=20';
import { initTour } from './tour.js?v=37';

const reducedMotionQuery = matchMedia('(prefers-reduced-motion: reduce)');
const phoneQuery = matchMedia('(max-width: 800px)');
const saveData = navigator.connection?.saveData === true;
// 'home' or a partner type: on a track page, generic buttons and the form default to that type.
const page = document.body.dataset.page || 'home';
const pageType = ['event', 'beauty', 'shop'].includes(page) ? page : '';

/* ---------- Toasts ---------- */
export function toast(message) {
  const el = Object.assign(document.createElement('div'), { className: 'toast', textContent: message });
  el.setAttribute('role', 'status');
  $('[data-toasts]').append(el);
  setTimeout(() => el.remove(), 2400);
}

/* ---------- Motion preference (OS setting + footer toggle) ---------- */
function initMotionPreference() {
  const btn = $('[data-motion-toggle]');
  const saved = safeStore.get('localStorage', 'po-motion');
  const resolve = () => (saved === 'off' || document.documentElement.dataset.motion === 'off' || reducedMotionQuery.matches ? 'reduced' : 'full');
  if (saved === 'off' || new URLSearchParams(location.search).get('motion') === 'off') document.documentElement.dataset.motion = 'off'; // ?motion=off: still screenshots and demos
  const label = () => {
    const off = document.documentElement.dataset.motion === 'off';
    btn.textContent = off ? t('motionOff') : t('motionOn');
    btn.setAttribute('aria-pressed', String(off));
  };
  set('motion', resolve());
  label();
  btn.addEventListener('click', () => {
    const off = document.documentElement.dataset.motion !== 'off';
    document.documentElement.dataset.motion = off ? 'off' : 'on';
    safeStore.set('localStorage', 'po-motion', off ? 'off' : 'on');
    set('motion', off || reducedMotionQuery.matches ? 'reduced' : 'full');
    label();
  });
  reducedMotionQuery.addEventListener('change', () => set('motion', resolve()));
  on('lang', label);
}

/* ---------- Personal welcome (?for=event|beauty|shop) ---------- */
function initWelcome() {
  const fromUrl = new URLSearchParams(location.search).get('for');
  const saved = safeStore.get('sessionStorage', 'po-for');
  const who = ['event', 'beauty', 'shop'].includes(fromUrl) ? fromUrl : ['event', 'beauty', 'shop'].includes(saved) ? saved : '';
  if (who) safeStore.set('sessionStorage', 'po-for', who);
  set('for', who);
  document.body.dataset.for = who;

  const render = () => {
    if (!$('[data-welcome]') && !$('[data-door]')) return;
    const w = t(`welcome.${get('for')}`) || t('welcome.');
    $$('[data-welcome]').forEach((el) => { el.textContent = w[el.dataset.welcome]; });
    $$('[data-welcome="cta"], [data-welcome="deck"]').forEach((b) => { b.dataset.apply = get('for'); });
    const eyebrow = $('.hero .eyebrow');
    if (eyebrow) eyebrow.style.background = who ? `var(--track-${who})` : '';
    $$('[data-door]').forEach((d) => d.toggleAttribute('data-for-me', d.dataset.door === who));
  };
  render();
  on('lang', render);
}

/* ---------- Header: compact on scroll, active section, phone menu ---------- */
function initHeader() {
  const header = $('#site-header');
  const onScroll = () => header.toggleAttribute('data-compact', scrollY > 24);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const links = $$('.site-nav a').filter((a) => a.hash && a.pathname === location.pathname);
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (!en.isIntersecting) return;
    links.forEach((a) => {
      if (a.hash === `#${en.target.id}`) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }), { rootMargin: '-45% 0px -50% 0px' });
  $$('main > section[id]').forEach((s) => io.observe(s));

  const sheet = $('#menu-sheet');
  const openBtn = $('[data-menu-open]');
  openBtn.addEventListener('click', () => { sheet.showModal(); openBtn.setAttribute('aria-expanded', 'true'); });
  sheet.addEventListener('close', () => openBtn.setAttribute('aria-expanded', 'false'));
  $('[data-menu-close]').addEventListener('click', () => sheet.close());
  $$('[data-menu-link], .menu-sheet [data-apply], .menu-sheet [data-lang-toggle]').forEach((el) => el.addEventListener('click', () => sheet.close()));
  phoneQuery.addEventListener('change', (e) => { if (!e.matches && sheet.open) sheet.close(); });
}

/* ---------- Hero film: plays only when allowed, visible and the tab is shown ---------- */
function initFilm() {
  const video = $('.hero__film');
  const toggle = $('[data-film-toggle]');
  if (!video || !toggle) return;
  let userPaused = false;
  let visible = true;

  const allowed = () => get('motion') === 'full' && !saveData;
  const source = () => (phoneQuery.matches ? video.dataset.srcMobile : video.dataset.srcDesktop);
  const label = () => {
    toggle.setAttribute('aria-label', video.paused ? t('filmPlay') : t('filmPause'));
    $('[data-icon-pause]', toggle).toggleAttribute('hidden', video.paused);
    $('[data-icon-play]', toggle).toggleAttribute('hidden', !video.paused);
  };
  const play = () => {
    if (!allowed() || userPaused || !visible || document.hidden) return;
    if (!video.src.endsWith(source())) { video.src = source(); }
    video.hidden = false;
    video.play().then(() => { video.setAttribute('data-playing', ''); label(); }).catch(() => { /* autoplay blocked: poster stays */ });
  };
  const pause = () => { video.pause(); label(); };

  if (!allowed()) return; // poster only
  toggle.hidden = false;
  toggle.addEventListener('click', () => {
    if (video.paused) { userPaused = false; play(); } else { userPaused = true; pause(); }
  });
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; visible ? play() : pause(); }, { threshold: 0.15 }).observe($('.hero'));
  document.addEventListener('visibilitychange', () => (document.hidden ? pause() : play()));
  phoneQuery.addEventListener('change', () => { video.removeAttribute('data-playing'); play(); });
  on('motion', (m) => { if (m !== 'full') { pause(); video.removeAttribute('data-playing'); toggle.hidden = true; } else { toggle.hidden = false; play(); } });
  on('lang', label);
  play();
}

/* ---------- Phone sticky bar: appears after the hero, label follows the track on screen ---------- */
function initStickyBar() {
  const bar = $('[data-cta-bar]');
  const cta = $('[data-sticky-cta]');
  let heroVisible = true;
  let current = '';
  const render = () => {
    const type = current || pageType || get('for');
    cta.textContent = t(`sticky.${type}`) || t('sticky.');
    cta.dataset.apply = type;
    bar.toggleAttribute('data-hidden', heroVisible || $('#apply').open);
  };
  const hero = $('.hero') || $('[data-page-hero] .page-hero');
  if (hero) new IntersectionObserver(([en]) => { heroVisible = en.isIntersecting; render(); }, { threshold: 0.05 }).observe(hero);
  else heroVisible = false;
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { current = ['event', 'beauty', 'shop'].includes(en.target.id) ? en.target.id : ''; render(); }
  }), { rootMargin: '-40% 0px -55% 0px' });
  $$('main > section').forEach((s) => io.observe(s));
  $('#apply').addEventListener('close', render);
  on('lang', render);
  on('for', render);
  render();
  return render;
}

/* ---------- The world: zone chips, track filter, panel ---------- */
const zoneById = (id) => ZONES.find((z) => z.id === id) || null;

function renderZonePanel(focus) {
  const zone = zoneById(get('zone'));
  const lang = get('lang');
  const panel = $('[data-zone-panel]');
  panel.toggleAttribute('data-empty', !zone);
  $('[data-zp-media]').hidden = !zone;
  $('[data-zp-tag]').hidden = !zone;
  $('[data-zp-offers]').hidden = !zone;
  $('[data-zp-actions]').hidden = !zone;
  const title = $('[data-zp-title]');
  const text = $('[data-zp-text]');

  $$('[data-zone-chips] [data-zone]').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.zone || null) === get('zone'))));

  if (!zone) {
    title.textContent = lang === 'ar' ? AR.selectZone : title.dataset.en;
    text.textContent = lang === 'ar' ? AR.selectZoneText : text.dataset.en;
    panel.style.removeProperty('--zone-c');
    return;
  }
  panel.style.setProperty('--zone-c', `var(${zone.colour})`);
  const img = $('[data-zp-img]');
  img.src = `assets/images/worlds/${zone.image}-960.webp?v=1`;
  img.srcset = `assets/images/worlds/${zone.image}-480.webp?v=1 480w, assets/images/worlds/${zone.image}-960.webp?v=1 960w`;
  img.sizes = '(max-width: 960px) 100vw, 420px';
  img.alt = lang === 'ar' ? `تصوّر لمنطقة ${zone.name}` : `Concept render of ${zone.name}`;
  // Beauty Lab render shows third-party brand names on its left wall: zoom into the lower centre (counters only).
  img.style.transform = zone.id === 'beauty' ? 'scale(1.8)' : '';
  img.style.transformOrigin = zone.id === 'beauty' ? '50% 100%' : '';
  $('[data-zp-tag]').textContent = zone.tag[lang];
  title.textContent = zone.name;
  text.textContent = zone.line[lang];

  const dl = $('[data-zp-offers]');
  dl.innerHTML = '';
  const filter = get('track');
  zone.tracks.forEach((track) => {
    const o = zone.offers[track];
    const dt = document.createElement('dt');
    dt.textContent = t(`trackName.${track}`);
    if (filter !== 'all' && filter !== track) dt.style.opacity = '0.55';
    const dd = document.createElement('dd');
    [...(o.sponsorship ? o.sponsorship[lang] : []), ...o.items[lang]].forEach((label) => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = label;
      dd.append(chip);
    });
    dl.append(dt, dd);
  });
  // From the concept floor plan: room size and what's inside
  const dtPlan = document.createElement('dt');
  dtPlan.textContent = `${t('inPlan')} · ≈ ${zone.plan.size}`;
  const ddPlan = document.createElement('dd');
  zone.stations[lang].forEach((label) => {
    const chip = document.createElement('span');
    chip.className = 'chip chip--plan';
    chip.textContent = label;
    ddPlan.append(chip);
  });
  dl.prepend(dtPlan, ddPlan);
  const enquire = $('[data-zp-enquire]');
  enquire.dataset.apply = zone.tracks.includes(filter) ? filter : zone.tracks.includes(get('for')) ? get('for') : zone.tracks[0];
  enquire.dataset.zone = zone.id;
  enquire.dataset.source = 'zone-map';
  if (focus) title.focus({ preventScroll: true });
}

function initWorld() {
  const section = $('#world');
  if (!section) return;

  $$('[data-zone-chips] [data-zone]').forEach((b) => b.addEventListener('click', () => {
    set('zone', b.dataset.zone || null);
    renderZonePanel(true);
  }));
  // Arrow keys move between zone chips in reading order (direction-aware).
  $('[data-zone-chips]').addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const chips = $$('[data-zone-chips] [data-zone]');
    const i = chips.indexOf(document.activeElement);
    if (i < 0) return;
    const forward = (e.key === 'ArrowRight') === (document.documentElement.dir !== 'rtl');
    chips[(i + (forward ? 1 : -1) + chips.length) % chips.length].focus();
    e.preventDefault();
  });
  on('zone', (id) => {
    renderZonePanel(false);
    history.replaceState(null, '', id ? `#world/${id}` : location.pathname + location.search);
  });

  $$('[data-track-filter]').forEach((b) => b.addEventListener('click', () => set('track', b.dataset.trackFilter)));
  on('track', (track) => {
    $$('[data-track-filter]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.trackFilter === track)));
    $$('[data-zone-chips] [data-zone]').forEach((b) => {
      const z = zoneById(b.dataset.zone);
      b.toggleAttribute('data-off', !!z && track !== 'all' && !z.tracks.includes(track));
    });
    renderZonePanel(false);
  });

  $('[data-copy-link]').addEventListener('click', async () => {
    const url = `${location.origin}${location.pathname}#world/${get('zone')}`;
    try { await navigator.clipboard.writeText(url); toast(t('linkCopied')); } catch { toast(t('linkCopyFailed')); }
  });
  on('lang', () => renderZonePanel(false));
  // The event page opens the map on the event partners' view (every zone).
  const preset = section.dataset.trackPreset;
  if (preset === 'event') set('track', preset);
  renderZonePanel(false);

  // Load the map only when the section is close, and only the version the device can handle.
  const stage = $('[data-map-stage]');
  const api = { zones: ZONES, get, on, select: (id) => { set('zone', id); renderZonePanel(false); } };
  const canWebGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
  const lowPower = (navigator.hardwareConcurrency || 4) <= 2 || (navigator.deviceMemory || 4) <= 1;
  new IntersectionObserver(([en], obs) => {
    if (!en.isIntersecting) return;
    obs.disconnect();
    const load2d = () => import('./map2d.js?v=20').then((m) => m.mount(stage, api));
    if (canWebGL && !saveData && !lowPower) import('./map3d.js?v=30').then((m) => m.mount(stage, api)).catch(load2d);
    else load2d();
  }, { rootMargin: '600px 0px' }).observe(stage);
}

/* ---------- Event track: goal picker ---------- */
function initGoals() {
  if (!$('[data-fit]')) return;
  let goal = null;
  const offers = $$('[data-fit] .offer');
  const render = () => {
    let n = 0;
    offers.forEach((o) => {
      const match = !goal || o.dataset.goals.split(' ').includes(goal);
      if (match) n++;
      o.toggleAttribute('data-dim', !match);
      o.toggleAttribute('data-match', !!goal && match);
      if (goal) o.dataset.goal = goal; else delete o.dataset.goal;
    });
    $('[data-fit-summary]').innerHTML = goal ? t('fitSome')(n, t(`goalPhrase.${goal}`)) : t('fitAll')(offers.length);
  };
  $$('[data-goal]').forEach((g) => g.addEventListener('click', () => {
    goal = g.getAttribute('aria-pressed') === 'true' ? null : g.dataset.goal;
    $$('[data-goal]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.goal === goal)));
    render();
  }));
  on('lang', render);
  render();
}

/* ---------- FAQ filter (themed days now live on the event tour's map: tour3d.js / themes3d.js) ---------- */
function initThemesAndFaq() {
  $$('[data-faq-filter]').forEach((b) => b.addEventListener('click', () => {
    const f = b.dataset.faqFilter;
    $$('[data-faq-filter]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    $$('.faq-list .faq').forEach((d) => { d.hidden = f !== 'all' && d.dataset.group !== f && d.dataset.group !== 'general'; });
  }));
}

/* ---------- Every [data-apply] opens the application with what it knows ---------- */
function initApplyButtons() {
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-apply]');
    if (!b) return;
    e.preventDefault();
    openApplication({
      type: b.dataset.apply || pageType || get('for') || '',
      interest: b.dataset.interest,
      zone: b.dataset.zone,
      theme: b.dataset.theme,
      goal: b.dataset.goal,
      deck: b.hasAttribute('data-deck'),
      source: b.dataset.source || 'page',
      opener: b,
    });
  });
}

/* ---------- Deep links ---------- */
function initDeepLinks() {
  const params = new URLSearchParams(location.search);
  const m = location.hash.match(/^#world\/([a-z]+)/);
  if (m && zoneById(m[1]) && $('#world')) {
    set('zone', m[1]);
    renderZonePanel(false);
    requestAnimationFrame(() => $('#world').scrollIntoView());
  }
  const apply = params.get('apply');
  if (['event', 'beauty', 'shop'].includes(apply)) openApplication({ type: apply, source: 'link' });
}

/* ---------- Boot ---------- */
initI18n();
initMotionPreference();
initWelcome();
initHeader();
initFilm();
initStickyBar();
initWorld();
initGoals();
initThemesAndFaq();
initForm();
initApplyButtons();
initJourney();
initTour();
initDeepLinks();

// GSAP is loaded with `defer`; start motion once it's there (it's an enhancement).
const startMotion = () => import('./motion.js?v=20').then((m) => m.initMotion()).catch(() => {});
if (window.gsap) startMotion(); else addEventListener('load', startMotion, { once: true });
