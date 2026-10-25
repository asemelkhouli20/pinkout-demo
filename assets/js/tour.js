// PinkOut Partners — the event tour: one continuous scroll through the whole venue (event page).
// Stops: 0 overview · 1–8 the visitor loop (in through the Pink Passage, the worlds, out through it again) · 9 finale. Inside a zone stop the card fills in
// step by step (what it is → what the brand can do → what it gets). tour3d.js films it when WebGL is fine;
// otherwise the stops read as illustrated cards. Text comes from src/tour.json (embedded), in EN or AR.
import { get, on, safeStore, $, $$ } from './store.js?v=20';
import { ZONES } from './data.js?v=22';

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
    labelTheme(lang);
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

  /* ---------- Themed days: one button on the map; each click dresses the venue for the next day (themes3d.js), and
     after the last one it is back to every day ---------- */
  let theme = 'default', themeAt = 0;
  function labelTheme(lang) {
    const btn = $('[data-theme-next]', root);
    if (!btn) return;
    const next = data.themes[(themeAt + 1) % data.themes.length][lang].name;
    btn.title = data.ui[lang].themeNext.replace('{name}', next);
    btn.setAttribute('aria-label', `${data.ui[lang].themes}: ${data.themes[themeAt][lang].name}. ${btn.title}`);
  }
  const themeBtn = $('[data-theme-next]', root);
  let peekBack = 0;
  const showIcon = (id) => { // swap the icon with a little spin-in
    $$('[data-theme-icon]', themeBtn).forEach((svg) => svg.toggleAttribute('hidden', svg.dataset.themeIcon !== id)); // an <svg> has no .hidden property
    themeBtn.classList.remove('is-switching'); void themeBtn.offsetWidth; themeBtn.classList.add('is-switching'); // restart the pop
  };
  themeBtn?.addEventListener('animationend', (e) => { if (e.animationName === 'theme-pop') themeBtn.classList.remove('is-switching'); });
  themeBtn?.addEventListener('click', () => {
    clearTimeout(peekBack);
    themeAt = (themeAt + 1) % data.themes.length;
    theme = data.themes[themeAt].id;
    showIcon(theme);
    labelTheme(get('lang'));
    scene?.setTheme(theme);
  });
  // with each puff of sparks the icon turns into the next day's for a moment, then back: a hint of what a click does
  const peek = () => {
    if (document.hidden || get('motion') !== 'full') return;
    showIcon(data.themes[(themeAt + 1) % data.themes.length].id);
    clearTimeout(peekBack);
    peekBack = setTimeout(() => showIcon(theme), 1400);
  };
  const spark = $('.tour__theme-sparks i', root); // the sparks' CSS animation sets the beat (none with reduced motion)
  spark?.addEventListener('animationstart', peek);
  spark?.addEventListener('animationiteration', peek);

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
    // the visitors' route, drawn like a doodle in one flowing stroke: down the Entrance passage, then waves that swoop
    // up through each world's doorway and back, a swing past the stage, and out through the Exit passage to an arrowhead.
    // Each node is [x, y, tangent x, tangent y] (plan metres); neighbouring nodes are joined by Hermite curves, so every
    // join is smooth. The line only crosses a wall at a doorway (venue.js): Make and Market on the hall's north wall
    // (y 12), Beauty (y 30.7) and Move (y 30) on its south wall; PinkOut Live opens onto the hall.
    const nodes = [
      [2.8, -2, 0, 12], [2.8, 10, 0, 12], [7.4, 17.6, 9, 2],                        // in, down the passage, into the hall
      [12.9, 17.6, 7, -15], [17.7, 5.6, 17, 0], [22.5, 17.6, 7, 15],                 // up through Make Studio and back
      [28.6, 20.6, 12, 0],                                                           // a dip along the hall
      [35, 17.6, 7, -15], [39.8, 5.6, 17, 0], [44.6, 17.6, 4, 15],                   // Pink Market
      [46.4, 22.4, -1, 9],                                                           // swinging past the PinkOut Live stage
      [40.8, 27.2, -6, 15], [37.1, 38.6, -15, 0], [33.4, 27.2, -6, -15],             // down through Beauty Lab and back
      [26.4, 24.6, -11, 0],                                                          // a rise along the hall
      [18, 26.8, -5, 15], [14.8, 38.6, -14, 0], [11.6, 26.8, -5, -15],               // Move Studio
      [6.6, 25.2, -8, 0], [2.8, 31.6, 0, 12], [2.8, 45.2, 0, 12],                    // round to the Exit passage and out
    ];
    const pts = [nodes[0].slice(0, 2)];
    nodes.slice(1).forEach(([x1, y1, u1, v1], i) => {
      const [x0, y0, u0, v0] = nodes[i];
      const c1 = [x0 + u0 / 3, y0 + v0 / 3], c2 = [x1 - u1 / 3, y1 - v1 / 3];
      for (let n = 1; n <= 20; n++) { const t = n / 20, w = 1 - t; pts.push([[x0, c1[0], c2[0], x1], [y0, c1[1], c2[1], y1]].map(([a0, a1, a2, a3]) => w * w * w * a0 + 3 * w * w * t * a1 + 3 * w * t * t * a2 + t * t * t * a3)); }
    });
    const route = `M${pts.map((p) => p.map((v) => v.toFixed(2)).join(' ')).join('L')}`;
    svg.append(el('path', { d: route, class: 'tour__plan-road' }), el('path', { d: route, class: 'tour__plan-loop' }));
    svg.append(el('path', { d: 'M1 44.4q1 .7 1.8 2.3q.8-1.6 1.8-2.3', class: 'tour__plan-arrow' })); // a doodled arrowhead at the way out
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

  /* ---------- World navigation: wheel, keys, touch swipes and zone picks move one stop ---------- */
  let animating = false, run = 0;
  let queued = 0; // keyboard and touch can queue a step; wheel momentum never queues one
  const stopTop = (i) => stops[i].getBoundingClientRect().top + scrollY;
  const scrollToY = (y) => {
    const start = scrollY, dist = y - start;
    if (Math.abs(dist) < 2) return;
    if (get('motion') !== 'full') { ++run; animating = false; scrollTo(0, y); measure(); return; }
    const dur = Math.min(1000, 620 + Math.abs(dist) * 0.08);
    const t0 = performance.now(), mine = ++run; // a newer move (a click on the plan, say) takes over from this one
    animating = true;
    const frame = (now) => {
      if (mine !== run) return;
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
  /** A long card scrolls its own text first, but only the card on show, and only when the pointer is really over it.
   *  (Not the event's target: when the page moves under a still mouse, browsers keep reporting the element that WAS
   *  under it, often the previous stop's card, now off screen. Scrolling that hidden card swallowed the scroll and the
   *  tour looked stuck until the mouse moved.) */
  const overCard = (x, y, dir) => {
    const card = stops[Math.min(last, Math.max(0, Math.round(position)))]?.querySelector('.stop-card');
    // only a card opened with "Details" scrolls its own text; otherwise scrolling moves the tour
    if (!card?.hasAttribute('data-open') || card.scrollHeight <= card.clientHeight + 2) return false;
    const r = card.getBoundingClientRect();
    if (x < r.left || x > r.right || y < r.top || y > r.bottom) return false;
    const canScroll = dir > 0 ? card.scrollTop + card.clientHeight < card.scrollHeight - 1 : card.scrollTop > 0;
    return canScroll ? card : null;
  };
  /* One world per transition. The lock has a fixed deadline: incoming momentum never extends it.
     After landing, a quiet new gesture or sustained deliberate input can move on. A fading tail or
     isolated spike cannot queue a world. Pointer movement and stale wheel targets are irrelevant. */
  const WHEEL_LOCK = 700, WHEEL_QUIET = 180;
  let wheelUsed = false, wheelUntil = 0, wheelDir = 0, lastWheel = -Infinity, lastAmount = 0;
  let intentDir = 0, intentSince = 0, intentDistance = 0, intentSamples = 0;
  const clearWheelIntent = () => { intentDir = 0; intentDistance = 0; intentSamples = 0; };
  addEventListener('wheel', (e) => {
    if (e.ctrlKey || (!e.deltaY && !e.deltaX) || !e.cancelable || !live()) return;
    const bounds = root.getBoundingClientRect();
    if (!animating && (bounds.bottom <= 0 || bounds.top >= innerHeight)) {
      wheelUsed = false;
      clearWheelIntent();
      return;
    }
    const now = performance.now(), quiet = now - lastWheel >= WHEEL_QUIET;
    lastWheel = now;
    const vertical = e.deltaY && Math.abs(e.deltaY) >= Math.abs(e.deltaX);
    const dir = Math.sign(e.deltaY);
    let delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1);
    const amount = Math.abs(delta), previous = lastAmount;
    lastAmount = amount;
    if (animating || (wheelUsed && now < wheelUntil)) {
      // Do not queue wheel input, or slide the deadline forward with every event.
      wheelUsed = true;
      clearWheelIntent();
      e.preventDefault();
      return;
    }
    if (!vertical) {
      if (wheelUsed) e.preventDefault();
      clearWheelIntent();
      return;
    }
    if (wheelUsed && !quiet) {
      // Small tails and deceleration carry no new intent. Count a bounded amount per event
      // so a single large macOS momentum spike cannot trigger another world.
      if (amount <= 4 || (dir === wheelDir && amount < previous * 0.98)) {
        clearWheelIntent();
        e.preventDefault();
        return;
      }
      if (intentDir !== dir) clearWheelIntent();
      if (!intentSamples) { intentDir = dir; intentSince = now; }
      intentDistance += Math.min(40, amount);
      intentSamples++;
      if (intentSamples < 3 || intentDistance < 120 || now - intentSince < 80) {
        e.preventDefault();
        return;
      }
    }
    clearWheelIntent();
    const card = overCard(e.clientX, e.clientY, dir);
    if (card) {
      // Scroll the card actually under the pointer, not an offscreen browser-latched target.
      e.preventDefault();
      const before = card.scrollTop;
      card.scrollTop = Math.max(0, Math.min(card.scrollHeight - card.clientHeight, before + delta));
      delta -= card.scrollTop - before;
      if (Math.abs(delta) < 1) return;
    }
    wheelUsed = step(dir);
    if (wheelUsed) {
      wheelDir = dir;
      wheelUntil = now + WHEEL_LOCK;
      e.preventDefault();
    }
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
    if (!touchUsed && !animating && overCard(e.touches[0].clientX, e.touches[0].clientY, dir)) return;
    if (touchUsed) { e.preventDefault(); return; }
    if (animating) { e.preventDefault(); if (Math.abs(dy) > 36) { queued = dir; touchUsed = true; } return; }
    if (holds(dir) || (live() && arriving(dir))) {
      e.preventDefault();
      if (Math.abs(dy) > 36) touchUsed = step(dir);
    }
  }, { passive: false });
  addEventListener('touchend', () => { touchY = null; touchUsed = false; }, { passive: true });
  plan.forEach((r) => r.addEventListener('click', () => jump(data.zones.findIndex((z) => (z.zone || z.id) === r.dataset.planZone) + 1)));

  /* Desktop: a card that does not fit the screen (a laptop's height) shows its short version with a "Details" button,
     like on phones, instead of a scrolling box that would catch the scroll meant for the tour. Tall screens keep the
     whole card. */
  const phone = matchMedia('(max-width: 800px)');
  const fitCards = () => {
    if (!live()) return;
    $$('.stop-card', root).forEach((card) => {
      if (card.hasAttribute('data-open')) return;
      card.removeAttribute('data-tight');
      if (!phone.matches && card.scrollHeight > card.clientHeight + 2) card.setAttribute('data-tight', '');
    });
  };
  render();
  on('lang', () => { render(); fitCards(); });
  let measuring = 0; // at most once per frame: scroll events can come faster than the screen redraws
  addEventListener('scroll', () => { measuring ||= requestAnimationFrame(() => { measuring = 0; measure(); }); }, { passive: true });
  addEventListener('resize', () => { if (live() && pinned() && !animating) scrollTo(0, stopTop(Math.round(position))); fitCards(); measure(); });
  measure();

  /* ---------- Live mode (3D) only when the device can do it well ---------- */
  const saveData = navigator.connection?.saveData === true;
  const canWebGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
  const lowPower = (navigator.hardwareConcurrency || 4) <= 2 || (navigator.deviceMemory || 4) <= 1;
  if (!stage || !canWebGL || saveData || lowPower) return;
  root.classList.add('is-live');
  requestAnimationFrame(fitCards); document.fonts?.ready.then(fitCards); // once the live layout (and its fonts) apply
  /* Loading: the hero film plays under the cycling worlds until the venue is drawn (poster only without motion) */
  const loader = $('[data-tour-loader]', stage), film = loader && $('video', loader);
  if (film && get('motion') === 'full') {
    film.src = matchMedia('(max-width: 800px)').matches ? film.dataset.srcMobile : film.dataset.srcDesktop;
    film.play().then(() => film.setAttribute('data-playing', '')).catch(() => {}); // autoplay blocked: the poster stays
  }
  const ready = () => setTimeout(() => { if (film) { film.pause(); film.removeAttribute('src'); film.load(); } loader?.remove(); }, 1000); // after the fade
  new IntersectionObserver(([en], obs) => {
    if (!en.isIntersecting) return;
    obs.disconnect();
    const load = () => import('./tour3d.js?v=57');
    load().catch(() => new Promise((r) => setTimeout(r, 900)).then(load)) // one retry on a flaky network
      .then((m) => { scene = m.mount(stage, { zones: ZONES, data, get, on, onPick: jump, onReady: ready }); scene.setTheme(theme); measure(); })
      .catch((err) => { root.classList.remove('is-live'); root.dataset.error = String(err?.message || err); console.warn('Tour 3D unavailable:', err); }); // falls back to the illustrated stops
  }, { rootMargin: '600px 0px' }).observe(root);
}
