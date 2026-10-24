// PinkOut Partners — 2D floor plan: the fallback when WebGL, battery or data saving rule out 3D.
// Same zone rectangles (metres, from the concept floor plan), same state as the 3D model.

const NS = 'http://www.w3.org/2000/svg';
const el = (name, attrs = {}) => { const n = document.createElementNS(NS, name); Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v)); return n; };

export function mount(stage, api) {
  const svg = el('svg', { class: 'map-2d', viewBox: '-3 -2 56 49', 'aria-hidden': 'true' });
  svg.append(el('rect', { x: 0, y: 0, width: 50, height: 45, rx: 0.6, fill: '#fff', stroke: '#7d163f', 'stroke-width': 0.35 }));
  svg.append(el('rect', { x: 0.8, y: -0.4, width: 4.2, height: 0.8, fill: '#fff5f8' }));            // entrance door (north, into the Entrance passage)
  svg.append(el('rect', { x: 0.8, y: 44.6, width: 4.2, height: 0.8, fill: '#fff5f8' }));            // exit door (south, out of the Exit passage)
  svg.append(el('path', { d: 'M 2.9 -0.7 L 1.8 -2.2 L 4.0 -2.2 Z', fill: '#df004c' }));             // way in
  svg.append(el('path', { d: 'M 2.9 47.2 L 1.8 45.7 L 4.0 45.7 Z', fill: '#7d163f' }));             // way out

  const nodes = api.zones.map((z) => {
    const g = el('g', { class: 'zone' });
    g.dataset.zone = z.id;
    z.plan.rects.forEach(([x1, y1, x2, y2]) => g.append(el('rect', { x: x1, y: y1, width: x2 - x1, height: y2 - y1, rx: 0.5, fill: z.hex })));
    const [lx, ly] = z.plan.label;
    const label = el('text', { x: lx, y: ly + 0.5, 'font-size': 1.6 });
    label.textContent = z.name;
    g.append(label);
    g.addEventListener('click', () => api.select(z.id));
    svg.append(g);
    return g;
  });

  const render = () => {
    const zone = api.get('zone');
    const track = api.get('track');
    nodes.forEach((g) => {
      const z = api.zones.find((x) => x.id === g.dataset.zone);
      g.toggleAttribute('data-selected', z.id === zone);
      g.toggleAttribute('data-off', track !== 'all' && !z.tracks.includes(track));
    });
  };
  api.on('zone', render);
  api.on('track', render);
  render();
  stage.append(svg);
  stage.dataset.mode = '2d';
}
