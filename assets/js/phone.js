// PinkOut Partners — the app journey: beauty service and e-commerce partners live in the PinkOut app,
// so their story is told on a phone. journey.js feeds the chapter position; chapter i shows screen i.
export function mount(stageEl) {
  const screens = [...stageEl.querySelectorAll('[data-screen]')];
  const last = screens.length - 1;
  let shown = -1;
  return {
    setChapter(c) {
      // --p (0…1) drives the phone's gentle turn and the glow drifting behind it
      stageEl.style.setProperty('--p', (Math.min(last, Math.max(0, c)) / last).toFixed(3));
      const i = Math.min(last, Math.max(0, Math.round(c)));
      if (i === shown) return;
      shown = i;
      screens.forEach((s, k) => {
        s.toggleAttribute('data-on', k === i);
        s.toggleAttribute('data-past', k < i);
      });
    },
  };
}
