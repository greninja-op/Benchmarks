// Precision leader lines: 3D sockets projected to screen space every frame.
import * as THREE from 'three';

const SVGNS = 'http://www.w3.org/2000/svg';
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

export class Callouts {
  constructor(svg, layer, defs, anchors) {
    this.svg = svg;
    this.items = defs.map((d) => {
      const g = document.createElementNS(SVGNS, 'g');
      const path = document.createElementNS(SVGNS, 'path');
      path.setAttribute('class', 'leader');
      const ring = document.createElementNS(SVGNS, 'circle');
      ring.setAttribute('class', 'leader-ring');
      ring.setAttribute('r', '9');
      const dot = document.createElementNS(SVGNS, 'circle');
      dot.setAttribute('class', 'leader-dot');
      const end = document.createElementNS(SVGNS, 'circle');
      end.setAttribute('class', 'leader-end');
      end.setAttribute('r', '2');
      g.append(path, ring, dot, end);
      svg.appendChild(g);
      const card = document.createElement('div');
      card.className = 'callout glass';
      card.innerHTML = `<span class="callout__k">${d.kicker || ''}</span><h4>${d.title}</h4><p>${d.body}</p>`;
      layer.appendChild(card);
      return { d, g, path, ring, dot, end, card, obj: anchors[d.anchor], v3: new THREE.Vector3() };
    });
  }

  update(p, camera, w, h) {
    const unit = Math.min(1.15, Math.max(0.55, Math.min(w, h) / 900));
    const mobile = w < 760;
    for (const it of this.items) {
      const { d } = it;
      const [a, b] = d.range;
      const v = smooth(a, a + 0.018, p) * (1 - smooth(b - 0.018, b, p));
      if (v <= 0.001 || !it.obj) {
        if (it.visible !== false) { it.g.style.display = 'none'; it.card.style.display = 'none'; it.visible = false; }
        continue;
      }
      if (!it.visible) { it.g.style.display = ''; it.card.style.display = ''; it.visible = true; }
      it.obj.getWorldPosition(it.v3).project(camera);
      if (it.v3.z > 1) { it.g.style.display = 'none'; it.card.style.display = 'none'; it.visible = false; continue; }
      const ax = (it.v3.x * 0.5 + 0.5) * w;
      const ay = (-it.v3.y * 0.5 + 0.5) * h;
      const dx = (mobile && d.mdx !== undefined ? d.mdx : d.dx) * unit;
      const dy = (mobile && d.mdy !== undefined ? d.mdy : d.dy) * unit;
      const cardW = mobile ? 180 : 250;
      let cx = ax + dx, cy = ay + dy;
      const side = Math.sign(dx) || 1;
      // keep the card inside the viewport
      if (side > 0) cx = Math.min(cx, w - cardW - 20); else cx = Math.max(cx, cardW + 20);
      cy = Math.min(Math.max(cy, 135), h - 90);
      const diag = Math.min(Math.abs(cy - ay), Math.abs(cx - ax) * 0.75);
      const ex = ax + Math.sign(cx - ax) * diag, ey = cy;
      const len = Math.hypot(ex - ax, ey - ay) + Math.hypot(cx - ex, cy - ey) + 0.01;
      const lp = clamp01(v * 1.6);
      it.path.setAttribute('d', `M${ax.toFixed(1)},${ay.toFixed(1)} L${ex.toFixed(1)},${ey.toFixed(1)} L${cx.toFixed(1)},${cy.toFixed(1)}`);
      it.path.style.strokeDasharray = `${len} ${len}`;
      it.path.style.strokeDashoffset = `${len * (1 - lp)}`;
      it.dot.setAttribute('cx', ax); it.dot.setAttribute('cy', ay);
      it.dot.setAttribute('r', (3.6 * clamp01(v * 3)).toFixed(2));
      it.ring.setAttribute('cx', ax); it.ring.setAttribute('cy', ay);
      it.ring.style.opacity = v;
      it.end.setAttribute('cx', cx); it.end.setAttribute('cy', cy);
      it.end.style.opacity = lp >= 0.999 ? 1 : 0;
      const co = clamp01((v - 0.5) * 2.5);
      it.card.style.opacity = co;
      it.card.style.transform = `translate3d(${(cx + side * 12).toFixed(1)}px, ${cy.toFixed(1)}px, 0) translate(${side < 0 ? '-100%' : '0'}, -50%) translateY(${((1 - co) * 8).toFixed(1)}px)`;
    }
  }
}
