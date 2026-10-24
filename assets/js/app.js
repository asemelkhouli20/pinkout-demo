// PinkOut Partners — page controller.
// Layers: HTML works alone → this adds behaviour → motion.js adds GSAP → tour.js adds the 3D venue tour.
import { get, set, on, safeStore, $, $$ } from './store.js?v=20';
import { initI18n, t } from './i18n.js?v=22';
import { initForm, openApplication } from './form.js?v=22';
import { initJourney } from './journey.js?v=20';
import { initTour } from './tour.js?v=57';

const reducedMotionQuery = matchMedia('(prefers-reduced-motion: reduce)');
const phoneQuery = matchMedia('(max-width: 800px)');
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
  const apply = params.get('apply');
  if (['event', 'beauty', 'shop'].includes(apply)) openApplication({ type: apply, source: 'link' });
}

/* ---------- Boot ---------- */
initI18n();
initMotionPreference();
initWelcome();
initHeader();
initForm();
initApplyButtons();
initJourney();
initTour();
initDeepLinks();

// GSAP is loaded with `defer`; start motion once it's there (it's an enhancement).
const startMotion = () => import('./motion.js?v=20').then((m) => m.initMotion()).catch(() => {});
if (window.gsap) startMotion(); else addEventListener('load', startMotion, { once: true });
