// PinkOut Partners — the app journey (beauty service + e-commerce pages): story text, the partner's name,
// scroll progress. The story plays on a phone (phone.js); it needs no WebGL. The event page has its own tour (tour.js).
import { get, on, safeStore, $, $$ } from './store.js?v=20';

const BRAND_KEY = 'po-brand';
export const brandName = () => (safeStore.get('sessionStorage', BRAND_KEY) || '').trim();

export function initJourney() {
  const root = $('[data-walk]');
  if (!root) return;
  const data = JSON.parse($('[data-walk-data]', root).textContent);
  const chapters = $$('[data-chapter]', root);
  const n = chapters.length;
  const stage = $('[data-walk-stage]', root);
  const input = $('[data-brand-input]', root);

  /* ---------- Text: chapter copy in the current language, with the partner's name ---------- */
  const renderText = () => {
    const lang = get('lang');
    const ui = data.ui[lang];
    const name = brandName() || data.default[lang];
    chapters.forEach((li, i) => {
      const c = data.chapters[i][lang];
      $('[data-ch-kicker]', li).textContent = c.kicker;
      ['title', 'text'].forEach((field) => {
        const el = $(`[data-ch-${field}]`, li);
        el.textContent = '';
        c[field].split('{brand}').forEach((part, k, all) => {
          el.append(part);
          if (k < all.length - 1) el.append(Object.assign(document.createElement('span'), { className: 'brand-name', textContent: name }));
        });
      });
    });
    $$('[data-brand]', root).forEach((el) => { el.textContent = name; });
    $$('[data-brand-initial]', root).forEach((el) => { el.textContent = [...name][0]?.toUpperCase() || ''; });
    $$('[data-walk-ui]', root).forEach((el) => { el.textContent = ui[el.dataset.walkUi]; });
    if (input) input.placeholder = data.default[lang];
    updateProgress();
  };

  if (input) {
    input.value = brandName();
    input.addEventListener('input', () => {
      safeStore.set('sessionStorage', BRAND_KEY, input.value.slice(0, 40));
      renderText();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      jumpTo(1);
    });
  }

  /* ---------- Progress: which chapter is on screen (fractional while scrolling) ---------- */
  let scene = null;
  let chapterFloat = 0;
  const count = $('[data-walk-count]', root);
  const dots = $$('[data-walk-dot]', root);
  function updateProgress() {
    const active = Math.min(n - 1, Math.max(0, Math.round(chapterFloat)));
    chapters.forEach((li, i) => li.toggleAttribute('data-active', i === active));
    dots.forEach((d, i) => d.setAttribute('aria-current', String(i === active)));
    if (count) count.textContent = `${data.ui[get('lang')].chapter} ${active + 1} ${data.ui[get('lang')].of} ${n}`;
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
    scrollTo({ top, behavior: get('motion') === 'full' ? 'smooth' : 'auto' });
  };
  dots.forEach((d, i) => d.addEventListener('click', () => jumpTo(i)));

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
