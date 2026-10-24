// PinkOut Partners — the event tour: one continuous scroll through the whole venue (event page).
// Stops: 0 overview · 1–8 the visitor loop (in through the Pink Passage, the worlds, out through it again) · 9 finale. Inside a zone stop the card fills in
// step by step (what it is → what the brand can do → what it gets). tour3d.js films it when WebGL is fine;
// otherwise the stops read as illustrated cards. Text comes from src/tour.json (embedded), in EN or AR.
import { get, on, safeStore, $, $$ } from './store.js?v=20';
import { ZONES } from './data.js?v=20';

const BRAND_KEY = 'po-brand';
const brand = () => (safeStore.get('sessionStorage', BRAND_KEY) || '').trim();

export function initTour() {
  const root = $('[data-tour]');
  if (!root) return;
  const data = JSON.parse($('[data-tour-data]', root).textContent);
  const stops = $$('[data-stop]', root);
  const last = stops.length - 1;
  const stage = $('[data-tour-stage]', root);
  const stopAt = (i) => (i >= 1 && i <= data.zones.length ? data.zones[i - 1] : null);
  const zoneOf = (i) => { const s = stopAt(i); return s ? s.zone || s.id : null; }; // the venue zone a stop films

  /* ---------- Text: every [data-tx] reads its string from the JSON, with the partner's name ---------- */
  const lookup = (path, lang) => {
    const [kind, a, b, c] = path.split('.');
    if (kind === 'u') return data.ui[lang][a];
    if (kind === 'i' || kind === 'f') { const v = (kind === 'i' ? data.intro : data.finale)[lang][a]; return b === undefined ? v : v[b]; }
    if (kind === 'z') { const v = data.zones[a][lang][b]; return c === undefined ? v : v[c]; }
    if (kind === 's') return ZONES.find((z) => z.id === a).stations[lang][b];
    if (kind === 't') return data.themes[a][lang][b];
    return '';
  };
  const fill = (el, str, lang) => {
    const name = brand();
    let s = str;
    if (!name && lang === 'ar') s = s.replace(/لـ\{brand\}/g, 'للعلامة'); // "لـالعلامة" → "للعلامة"
    s = s.replace('{n}', el.dataset.n || '').replace('{zone}', el.dataset.zoneName || '').replace('{size}', el.dataset.size || '');
    el.textContent = '';
    s.split('{brand}').forEach((part, k, all) => {
      el.append(part);
      if (k < all.length - 1) el.append(Object.assign(document.createElement('span'), { className: 'brand-name', textContent: name || data.ui[lang].default }));
    });
  };
  const render = () => {
    const lang = get('lang');
    $$('[data-tx]', root).forEach((el) => fill(el, lookup(el.dataset.tx, lang), lang));
    $$('[data-tx-label]', root).forEach((el) => el.setAttribute('aria-label', lookup(el.dataset.txLabel, lang)));
    $$('[data-theme-pick]', root).forEach((el) => { el.title = el.getAttribute('aria-label'); });
    $$('[data-brand-input]').forEach((input) => { input.placeholder = data.ui[lang].default; });
    progress();
  };

  $$('[data-brand-input]').forEach((input) => {
    input.value = brand();
    input.addEventListener('input', () => {
      safeStore.set('sessionStorage', BRAND_KEY, input.value.slice(0, 40));
      $$('[data-brand-input]').forEach((other) => { if (other !== input) other.value = input.value; });
      render();
    });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); input.blur(); jump(1); } }); // the name is in: start the walk
  });

  /* ---------- Themed days: the icons on the map dress the venue for that day (themes3d.js); every day = default ---------- */
  let theme = 'default';
  $$('[data-theme-pick]', root).forEach((b) => b.addEventListener('click', () => {
    theme = b.dataset.themePick;
    $$('[data-theme-pick]', root).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    scene?.setTheme(theme);
  }));

  /* ---------- Phones: a card shows the essentials (a quarter of the screen at most); "Details" opens the rest ---------- */
  function openCard(card, open) {
    card.toggleAttribute('data-open', open);
    $('[data-card-more]', card)?.setAttribute('aria-expanded', String(open));
    if (!open) card.scrollTop = 0;
  }
  $$('[data-card-more]', root).forEach((b) => b.addEventListener('click', () => { const card = b.closest('.stop-card'); openCard(card, !card.hasAttribute('data-open')); }));

  /* ---------- Mini floor plan: the zones, the visitor loop, "you are here" ---------- */
  const planBox = $('[data-tour-plan]', root);
  if (planBox) {
    const svgNS = 'http://www.w3.org/2000/svg';
    const el = (tag, attrs) => Object.entries(attrs).reduce((n, [k, v]) => { n.setAttribute(k, v); return n; }, document.createElementNS(svgNS, tag));
    const svg = el('svg', { viewBox: '-2 -2 54 49', class: 'tour__plan-svg' });
    svg.append(el('rect', { x: -0.5, y: -0.5, width: 51, height: 46, rx: 1.2, class: 'tour__plan-building' }));
    ZONES.forEach((z) => z.plan.rects.forEach(([x1, y1, x2, y2]) => {
      svg.append(el('rect', { x: x1, y: y1, width: x2 - x1, height: y2 - y1, rx: 0.6, fill: z.hex, 'data-plan-zone': z.id }));
    }));
    // the visitors' route: in at the north door through the Entrance passage, round the worlds, out through the Exit passage
    const loop = [[2.8, -2], [2.8, 15], [4.4, 18.2], [9, 20.6], ...['make', 'market', 'live', 'beauty', 'move'].map((id) => ZONES.find((q) => q.id === id).plan.label), [9, 23.6], [4.4, 26.6], [2.8, 30], [2.8, 47]];
    svg.append(el('polyline', { points: loop.map((p) => p.join(',')).join(' '), class: 'tour__plan-loop' }));
    const hereDot = el('g', { 'data-plan-here': '', hidden: '' });
    hereDot.append(el('circle', { r: 3.2, class: 'tour__plan-pulse' }), el('circle', { r: 1.6, class: 'tour__plan-dot' }));
    svg.append(hereDot);
    planBox.append(svg);
  }

  /* ---------- Position: which stop is under the viewport middle (fractional while travelling) ---------- */
  let scene = null;
  let position = 0;
  const plan = $$('[data-plan-zone]', root);
  const here = $('[data-plan-here]', root);
  let shown = -1;
  function progress() {
    const active = Math.min(last, Math.max(0, Math.round(position)));
    if (active !== shown) { shown = active; $$('.stop-card[data-open]', root).forEach((c) => openCard(c, false)); } // each chapter starts compact
    const zone = zoneOf(active);
    stops.forEach((li, i) => li.toggleAttribute('data-active', i === active));
    plan.forEach((r) => r.toggleAttribute('data-on', r.dataset.planZone === zone));
    root.dataset.at = zone || (active === 0 ? 'overview' : 'finale');
    if (here) {
      const z = zone && ZONES.find((q) => q.id === zone);
      const [hx, hy] = stopAt(active)?.here || z?.plan.label || [0, 0];
      here.toggleAttribute('hidden', !z);
      if (z) here.setAttribute('transform', `translate(${hx} ${hy})`);
    }
  }
  // Position = which stop fills the screen; fractional while the page moves from one stop to the next.
  const measure = () => {
    let pos = 0;
    for (let i = 0; i <= last; i++) {
      const r = stops[i].getBoundingClientRect();
      if (r.top <= 1) pos = Math.min(last, i + Math.min(1, -r.top / r.height));
    }
    position = pos;
    scene?.setPosition(pos);
    progress();
  };

  /* ---------- World by world: one scroll, swipe or key press moves exactly one stop ---------- */
  let animating = false;
  let queued = 0; // a flick or swipe that came in while the camera was still moving: it goes as soon as it lands
  const stopTop = (i) => stops[i].getBoundingClientRect().top + scrollY;
  const scrollToY = (y) => {
    const start = scrollY, dist = y - start;
    if (Math.abs(dist) < 2) return;
    if (get('motion') !== 'full') { scrollTo(0, y); return; }
    const dur = Math.min(1000, 620 + Math.abs(dist) * 0.08);
    const t0 = performance.now();
    animating = true;
    const frame = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      scrollTo(0, start + dist * e);
      if (k < 1) { requestAnimationFrame(frame); return; }
      animating = false;
      measure(); // the stop we landed on, before a queued move picks the next one
      if (queued) { const d = queued; queued = 0; step(d); }
    };
    requestAnimationFrame(frame);
  };
  const jump = (i) => { if (stops[i]) scrollToY(stopTop(i)); };
  const live = () => root.classList.contains('is-live');
  const pinned = () => { const r = root.getBoundingClientRect(); return r.top <= 2 && r.bottom >= innerHeight - 2; };
  const atEdge = (dir) => (dir > 0 ? Math.round(position) >= last : Math.round(position) <= 0); // past the ends the page scrolls on as usual
  const arriving = (dir) => {
    const r = root.getBoundingClientRect();
    return dir > 0 ? r.top > 2 && r.top < innerHeight * 0.6 : r.bottom < innerHeight - 2 && r.bottom > innerHeight * 0.4;
  };
  /** move one stop in `dir`; true when the tour took the gesture */
  const step = (dir) => {
    if (!live()) return false;
    if (arriving(dir)) { jump(dir > 0 ? 0 : last); return true; }
    if (!pinned() || atEdge(dir)) return false;
    jump(Math.round(position) + dir);
    return true;
  };
  const holds = (dir) => animating || (live() && pinned() && !atEdge(dir));
  /** a long card scrolls its own content first */
  const cardScrolls = (target, dir) => {
    const card = target.closest?.('.stop-card');
    return !!card && card.scrollHeight > card.clientHeight + 2 && (dir > 0 ? card.scrollTop + card.clientHeight < card.scrollHeight - 1 : card.scrollTop > 0);
  };
  /* Wheel and trackpad: one gesture = one stop, however far or long the scroll. A gesture is a continuous stream of
     wheel events in one direction (a trackpad's whole momentum tail included); a new one starts only after a short
     pause or when the direction turns. A gesture started while the camera is still moving goes next, once. */
  const QUIET = 300; // ms without wheel events that ends a gesture
  let lastWheel = 0, gestureDir = 0, gestureOnCard = false;
  addEventListener('wheel', (e) => {
    if (e.ctrlKey || Math.abs(e.deltaY) < 1) return;
    const now = performance.now(), dir = Math.sign(e.deltaY);
    const continuing = now - lastWheel < QUIET && dir === gestureDir;
    lastWheel = now;
    if (continuing) { // the rest of a gesture: it scrolls the card it started on, or it already moved us
      if (gestureOnCard && cardScrolls(e.target, dir)) return;
      if (holds(dir)) e.preventDefault();
      return;
    }
    gestureDir = dir;                                                // a new gesture
    gestureOnCard = false;
    if (animating) { e.preventDefault(); queued = dir; return; }
    if (cardScrolls(e.target, dir)) { gestureOnCard = true; return; } // a long card scrolls its own text first
    if (step(dir)) e.preventDefault();
  }, { passive: false });
  addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea, select, button, a, [contenteditable], dialog')) return;
    const k = e.key || e.code; // some keyboards report only the code
    const dir = ['ArrowDown', 'PageDown'].includes(k) || ['ArrowDown', 'PageDown'].includes(e.code) || (e.code === 'Space' && !e.shiftKey) ? 1
      : ['ArrowUp', 'PageUp'].includes(k) || ['ArrowUp', 'PageUp'].includes(e.code) || (e.code === 'Space' && e.shiftKey) ? -1 : 0;
    if (dir && animating) { e.preventDefault(); queued = dir; return; }
    if (dir && step(dir)) e.preventDefault();
  });
  // Touch: one swipe = one stop. Once a swipe has moved us (or while the camera moves), the rest of it is held, so the
  // page never fights the animation; a swipe made while the camera is moving waits its turn.
  let touchY = null, touchUsed = false;
  addEventListener('touchstart', (e) => { touchY = e.touches[0].clientY; touchUsed = false; }, { passive: true });
  addEventListener('touchmove', (e) => {
    if (touchY === null) return;
    const dy = touchY - e.touches[0].clientY, dir = Math.sign(dy);
    if (!dir) return;
    if (!touchUsed && !animating && cardScrolls(e.target, dir)) return;
    if (touchUsed) { e.preventDefault(); return; }
    if (animating) { e.preventDefault(); if (Math.abs(dy) > 36) { queued = dir; touchUsed = true; } return; }
    if (holds(dir) || (live() && arriving(dir))) {
      e.preventDefault();
      if (Math.abs(dy) > 36) touchUsed = step(dir);
    }
  }, { passive: false });
  addEventListener('touchend', () => { touchY = null; touchUsed = false; }, { passive: true });
  plan.forEach((r) => r.addEventListener('click', () => jump(data.zones.findIndex((z) => (z.zone || z.id) === r.dataset.planZone) + 1)));

  render();
  on('lang', render);
  let measuring = 0; // at most once per frame: scroll events can come faster than the screen redraws
  addEventListener('scroll', () => { measuring ||= requestAnimationFrame(() => { measuring = 0; measure(); }); }, { passive: true });
  addEventListener('resize', () => { if (live() && pinned() && !animating) scrollTo(0, stopTop(Math.round(position))); measure(); });
  measure();

  /* ---------- Live mode (3D) only when the device can do it well ---------- */
  const saveData = navigator.connection?.saveData === true;
  const canWebGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
  const lowPower = (navigator.hardwareConcurrency || 4) <= 2 || (navigator.deviceMemory || 4) <= 1;
  if (!stage || !canWebGL || saveData || lowPower) return;
  root.classList.add('is-live');
  new IntersectionObserver(([en], obs) => {
    if (!en.isIntersecting) return;
    obs.disconnect();
    const load = () => import('./tour3d.js?v=41');
    load().catch(() => new Promise((r) => setTimeout(r, 900)).then(load)) // one retry on a flaky network
      .then((m) => { scene = m.mount(stage, { zones: ZONES, data, get, on, onPick: jump }); scene.setTheme(theme); measure(); })
      .catch((err) => { root.classList.remove('is-live'); root.dataset.error = String(err?.message || err); console.warn('Tour 3D unavailable:', err); }); // falls back to the illustrated stops
  }, { rootMargin: '600px 0px' }).observe(root);
}
