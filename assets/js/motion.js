// PinkOut Partners — GSAP motion. Pure enhancement: without it every element is already in its final state.
// Rules (docs/motion-notes.md): springy pops once, short reversible scrubs, nothing for reduced motion / motion off.
import { on } from './store.js?v=20';

export function initMotion() {
  const { gsap, ScrollTrigger } = window;
  if (!gsap || !ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  let mm = null;

  const build = () => {
    mm?.revert();
    mm = null;
    if (document.documentElement.dataset.motion === 'off') return;
    mm = gsap.matchMedia();
    mm.add({ full: '(prefers-reduced-motion: no-preference)', wide: '(min-width: 801px)' }, ({ conditions }) => {
      if (!conditions.full) return;
      const dir = document.documentElement.dir === 'rtl' ? -1 : 1;
      const once = (trigger, start = 'top 85%') => ({ trigger, start, once: true });

      // Hero: the invitation pops up once, then its lines follow.
      const has = (sel) => document.querySelector(sel);
      // Heroes hold the page's main headline (LCP): they move in, but are never invisible.
      if (has('[data-page-hero]')) gsap.from('[data-page-hero] .page-hero__copy > *, [data-page-hero] .page-hero__media', { y: 18, opacity: 0.4, duration: 0.7, stagger: 0.07, ease: 'power3.out', delay: 0.1 });
      if (has('[data-hero-panel]')) gsap.from('[data-hero-panel]', { y: 24, scale: 0.97, duration: 0.8, ease: 'back.out(1.6)', delay: 0.1 });
      if (has('[data-hero-panel]')) gsap.from('[data-hero-panel] > *', { y: 14, opacity: 0.4, duration: 0.6, stagger: 0.06, ease: 'power3.out', delay: 0.25 });
      if (conditions.wide && has('.hero')) {
        const scrub = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true };
        gsap.to('.hero__poster, .hero__film', { scale: 1.06, ease: 'none', scrollTrigger: scrub });
        gsap.to('[data-hero-panel]', { y: -40, ease: 'none', scrollTrigger: scrub });
      }

      // Section heads and card groups: one springy entrance each.
      gsap.utils.toArray('.block .section-head').filter((h) => !h.closest('[data-page-hero] .page-hero')).forEach((head) => {
        gsap.from(head.children, { y: 18, autoAlpha: 0, duration: 0.6, stagger: 0.06, ease: 'power3.out', scrollTrigger: once(head) });
      });
      gsap.utils.toArray('[data-reveal-group]').forEach((group) => {
        gsap.from(group.children, { y: 28, autoAlpha: 0, duration: 0.7, stagger: 0.09, ease: 'back.out(1.4)', scrollTrigger: once(group) });
      });
      gsap.utils.toArray('.steps').forEach((list) => {
        gsap.from(list.children, { x: 24 * dir, autoAlpha: 0, duration: 0.6, stagger: 0.08, ease: 'power3.out', scrollTrigger: once(list) });
      });
      if (has('[data-journey]')) gsap.from('[data-journey] li', { x: 24 * dir, autoAlpha: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out', scrollTrigger: once('[data-journey]') });
      if (has('[data-goals]')) gsap.from('.goal, [data-fit] .offer', { y: 20, autoAlpha: 0, duration: 0.55, stagger: 0.05, ease: 'back.out(1.4)', scrollTrigger: once('[data-goals]') });

      // Status render and the closing arch open with a clip reveal.
      if (has('[data-clip-reveal]')) gsap.fromTo('[data-clip-reveal]', { clipPath: 'inset(100% 0% 0% 0% round 24px)' }, { clipPath: 'inset(0% 0% 0% 0% round 24px)', duration: 0.9, ease: 'power3.out', scrollTrigger: once('[data-clip-reveal]', 'top 80%') });
      if (has('[data-arch]')) gsap.fromTo('[data-arch]', { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: 'power3.out', scrollTrigger: once('[data-arch]', 'top 85%') });
    });
  };

  build();
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  addEventListener('pageshow', (e) => { if (e.persisted) ScrollTrigger.refresh(); });
  on('lang', () => { build(); ScrollTrigger.refresh(); }); // direction flips: rebuild
  on('motion', build);
}
