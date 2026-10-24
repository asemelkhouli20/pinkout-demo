// PinkOut Partners — the app journey (beauty service + e-commerce pages): story text, the partner's name,
// scroll progress. The story plays on a phone (phone.js); it needs no WebGL. The event page has its own tour (tour.js).
// A track with "tour": true (tools/apptour_markup.py) opens on a stage like the event tour: glass step cards, a photo
// backdrop per step, bubbles around the phone for her side and the partner's side, and a route of the steps.
import { get, on, safeStore, $, $$ } from './store.js?v=20';

const BRAND_KEY = 'po-brand';
const PHOTO_KEY = 'po-photo';
export const brandName = () => (safeStore.get('sessionStorage', BRAND_KEY) || '').trim();

// Text with the partner's name ({brand}) and an accent ([[…]]) written as nodes, never as HTML.
function rich(el, text, name) {
  el.textContent = '';
  text.split('{brand}').forEach((part, k, all) => {
    part.split(/\[\[|\]\]/).forEach((bit, b) => { if (bit) el.append(b % 2 ? Object.assign(document.createElement('em'), { textContent: bit }) : bit); });
    if (k < all.length - 1) el.append(Object.assign(document.createElement('span'), { className: 'brand-name', textContent: name }));
  });
}

export function initJourney() {
  const root = $('[data-walk]');
  if (!root) return;
  const data = JSON.parse($('[data-walk-data]', root).textContent);
  const tour = !!data.tour;
  const chapters = $$('[data-chapter]', root);
  const n = chapters.length;
  const stage = $('[data-walk-stage]', root);
  const input = $('[data-brand-input]', root);
  let active = -1;

  /* ---------- Text: chapter copy in the current language, with the partner's name ---------- */
  const copyOf = (i, lang) => (tour ? (i === 0 ? data.intro[lang] : data.chapters[i - 1][lang]) : data.chapters[i][lang]);
  const renderText = () => {
    const lang = get('lang');
    const ui = data.ui[lang];
    const name = brandName() || data.default[lang];
    chapters.forEach((li, i) => {
      const c = copyOf(i, lang);
      ['kicker', 'title', 'text'].forEach((field) => { const el = $(`[data-ch-${field}]`, li); if (el) rich(el, c[field], name); });
      $$('[data-ch-fact]', li).forEach((el) => { el.textContent = c.facts[el.dataset.chFact]; });
      $$('[data-ch-can]', li).forEach((el) => { el.textContent = c.can[el.dataset.chCan]; });
      if (tour && i > 0) $$('[data-ch-get]', li).forEach((el) => { el.textContent = data.chapters[i - 1].gets[el.dataset.chGet][lang]; });
    });
    if (tour) $$('[data-ch-route]', root).forEach((el) => { el.textContent = data.chapters[el.dataset.chRoute - 1].route[lang]; });
    $$('[data-brand]', root).forEach((el) => { el.textContent = name; });
    $$('[data-brand-initial]', root).forEach((el) => { el.textContent = [...name][0]?.toUpperCase() || ''; });
    $$('[data-walk-ui]', root).forEach((el) => { if (ui[el.dataset.walkUi] !== undefined) el.textContent = ui[el.dataset.walkUi]; });
    if (input) input.placeholder = data.default[lang];
    if (tour && active > 0) showMoments(active, true);
    updateProgress();
  };

  if (input) {
    input.value = brandName();
    input.addEventListener('input', () => {
      safeStore.set('sessionStorage', BRAND_KEY, input.value.slice(0, 40));
      renderText();
      // her name lights up where it appears in the app, as she types it
      $$('.phone__screen[data-on] [data-brand]', root).forEach((el) => { el.removeAttribute('data-flash'); void el.offsetWidth; el.setAttribute('data-flash', ''); });
    });
    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      jumpTo(1);
    });
  }

  /* ---------- Her photo in the app: resized here, kept in this tab only, never sent ---------- */
  const photoInput = $('[data-brand-photo]', root);
  const applyPhoto = (url) => {
    $$('[data-brand-initial], [data-photo-preview]', root).forEach((el) => {
      el.style.backgroundImage = url ? `url("${url}")` : '';
      el.classList.toggle('has-photo', !!url);
    });
  };
  applyPhoto(safeStore.get('sessionStorage', PHOTO_KEY));
  photoInput?.addEventListener('change', () => {
    const file = photoInput.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const img = new Image();
    const src = URL.createObjectURL(file);
    img.onload = () => {
      const size = 240;
      const k = Math.max(size / img.width, size / img.height);
      const canvas = Object.assign(document.createElement('canvas'), { width: size, height: size });
      canvas.getContext('2d').drawImage(img, (size - img.width * k) / 2, (size - img.height * k) / 2, img.width * k, img.height * k);
      URL.revokeObjectURL(src);
      const url = canvas.toDataURL('image/jpeg', 0.85);
      safeStore.set('sessionStorage', PHOTO_KEY, url);
      applyPhoto(url);
      if (tour && data.photoStep && active < data.photoStep) jumpTo(data.photoStep); // show it where it matters: her profile, the brand page
    };
    img.src = src;
  });

  /* ---------- The phone's status bar keeps the real time ---------- */
  const clocks = $$('[data-ph-clock]', root);
  if (clocks.length) {
    const tick = () => { const d = new Date(); clocks.forEach((c) => { c.textContent = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; }); };
    tick();
    setInterval(tick, 20000);
  }

  /* ---------- The stage (tour mode): backdrop, bubbles, a light across the glass ---------- */
  const momentsBox = $('[data-atour-moments]', root);
  let momentTimers = [];
  function showMoments(i, instant = false) {
    if (!momentsBox) return;
    momentTimers.forEach(clearTimeout);
    momentTimers = [];
    momentsBox.replaceChildren();
    const ch = data.chapters[i - 1];
    if (!ch) return;
    const lang = get('lang');
    const ui = data.ui[lang];
    ch.moments.forEach((m, k) => {
      const el = document.createElement('span');
      el.className = `atour__moment atour__moment--${m.side}`;
      el.style.setProperty('--x', `${m.x}%`);
      el.style.setProperty('--y', `${m.y}%`);
      el.append(Object.assign(document.createElement('small'), { textContent: m.side === 'you' ? ui.you : ui.her }),
        Object.assign(document.createElement('b'), { textContent: m[lang] }));
      el.setAttribute('data-hidden', '');
      momentsBox.append(el);
      // they fade in where they belong, one after the other, all within a second of the step arriving
      const show = () => el.removeAttribute('data-hidden');
      if (instant || get('motion') !== 'full') show(); else momentTimers.push(setTimeout(show, 450 + k * 280));
    });
  }
  function setStage(i) {
    if (!tour || !stage) return;
    const bg = i === 0 ? data.chapters[0].bg : data.chapters[i - 1].bg;
    $$('[data-bg]', stage).forEach((img) => img.toggleAttribute('data-on', img.dataset.bg === bg));
    stage.dataset.step = String(i);
    stage.removeAttribute('data-sweep'); void stage.offsetWidth; stage.setAttribute('data-sweep', '');
    showMoments(i);
  }

  /* ---------- Progress: which chapter is on screen (fractional while scrolling) ---------- */
  let scene = null;
  let chapterFloat = 0;
  const count = $('[data-walk-count]', root);
  const dots = $$('[data-walk-dot]', root);
  const dotOffset = tour ? 1 : 0; // the stage's route lists the steps, not the opening card
  function updateProgress() {
    const now = Math.min(n - 1, Math.max(0, Math.round(chapterFloat)));
    chapters.forEach((li, i) => li.toggleAttribute('data-active', i === now));
    dots.forEach((d, i) => d.setAttribute('aria-current', String(i + dotOffset === now)));
    if (count) count.textContent = `${data.ui[get('lang')].chapter} ${now + 1} ${data.ui[get('lang')].of} ${n}`;
    if (now !== active) {
      const prev = active;
      active = now;
      setStage(now);
      // a card opened with "Details" closes when its step moves on
      if (prev >= 0) { const card = $('.stop-card[data-open]', chapters[prev]); if (card) openCard(card, false); }
    }
  }
  const measure = () => {
    // Each chapter card's centre crossing the viewport centre marks that chapter.
    const mid = innerHeight / 2;
    const centres = chapters.map((li) => { const r = li.getBoundingClientRect(); return r.top + r.height / 2; });
    let c = 0;
    if (mid <= centres[0]) c = 0;
    else if (mid >= centres[n - 1]) c = n - 1;
    else {
      const i = centres.findIndex((y, k) => mid >= y && mid < centres[k + 1]);
      // hold on each chapter, travel in between
      const f = (mid - centres[i]) / (centres[i + 1] - centres[i]);
      const eased = f < 0.3 ? 0 : f > 0.7 ? 1 : ((f - 0.3) / 0.4) ** 2 * (3 - 2 * ((f - 0.3) / 0.4));
      c = i + eased;
    }
    chapterFloat = c;
    scene?.setChapter(c);
    updateProgress();
  };
  const jumpTo = (i) => {
    const li = chapters[i];
    if (!li) return;
    const top = li.getBoundingClientRect().top + scrollY + li.offsetHeight / 2 - innerHeight / 2;
    // on the stage the step's card and backdrop animate in, so a jump lands at once (a smooth scroll across several
    // screens takes seconds); the plain journey still glides
    scrollTo({ top, behavior: tour || get('motion') !== 'full' ? 'auto' : 'smooth' });
  };
  dots.forEach((d, i) => d.addEventListener('click', () => jumpTo(i + dotOffset)));

  /* ---------- Phones: a card shows the essentials; "Details" opens the rest ---------- */
  function openCard(card, open) {
    card.toggleAttribute('data-open', open);
    $('[data-card-more]', card)?.setAttribute('aria-expanded', String(open));
    if (!open) card.scrollTop = 0;
  }
  $$('[data-card-more]', root).forEach((b) => b.addEventListener('click', () => { const card = b.closest('.stop-card'); openCard(card, !card.hasAttribute('data-open')); }));

  /* ---------- The pointer: the phone leans towards it a little (desktop, motion on) ---------- */
  if (tour && stage && matchMedia('(pointer: fine)').matches) {
    stage.addEventListener('pointermove', (e) => {
      if (get('motion') !== 'full') return;
      const r = stage.getBoundingClientRect();
      stage.style.setProperty('--lx', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
      stage.style.setProperty('--ly', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
    });
    stage.addEventListener('pointerleave', () => { stage.style.setProperty('--lx', '0'); stage.style.setProperty('--ly', '0'); });
  }

  renderText();
  on('lang', renderText);

  if (stage) {
    root.classList.add('is-live');
    addEventListener('scroll', measure, { passive: true });
    addEventListener('resize', measure);
    new IntersectionObserver(([en], obs) => {
      if (!en.isIntersecting) return;
      obs.disconnect();
      import('./phone.js?v=20')
        .then((m) => { scene = m.mount(stage); measure(); })
        .catch(() => root.classList.remove('is-live')); // falls back to the plain chapters
    }, { rootMargin: '400px 0px' }).observe(root);
    measure();
    // ?walk=N opens the page at chapter N (1-based)
    const deep = parseInt(new URLSearchParams(location.search).get('walk'), 10);
    if (deep >= 1 && deep <= n) requestAnimationFrame(() => {
      const li = chapters[deep - 1];
      scrollTo({ top: li.getBoundingClientRect().top + scrollY + li.offsetHeight / 2 - innerHeight / 2, behavior: 'auto' });
      measure();
    });
  }
}
