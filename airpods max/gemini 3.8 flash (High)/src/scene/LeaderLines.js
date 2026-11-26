import * as THREE from 'three';

/**
 * LeaderLines Overlay System
 * Projects 3D mesh anchor positions to 2D screen coordinates (Vector3.project)
 * and renders precision animated SVG leader lines and glassmorphic technical cards.
 */

export class LeaderLinesOverlay {
  constructor(container, camera, anchors) {
    this.container = container;
    this.camera = camera;
    this.anchors = anchors;
    this.items = [];

    // Create SVG Canvas Layer
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('class', 'leader-lines-svg');
    this.svg.style.position = 'fixed';
    this.svg.style.top = '0';
    this.svg.style.left = '0';
    this.svg.style.width = '100vw';
    this.svg.style.height = '100vh';
    this.svg.style.pointerEvents = 'none';
    this.svg.style.zIndex = '20';
    container.appendChild(this.svg);

    // Create HTML Cards Container
    this.cardsContainer = document.createElement('div');
    this.cardsContainer.setAttribute('class', 'leader-cards-container');
    this.cardsContainer.style.position = 'fixed';
    this.cardsContainer.style.top = '0';
    this.cardsContainer.style.left = '0';
    this.cardsContainer.style.width = '100vw';
    this.cardsContainer.style.height = '100vh';
    this.cardsContainer.style.pointerEvents = 'none';
    this.cardsContainer.style.zIndex = '25';
    container.appendChild(this.cardsContainer);

    this.tempVec = new THREE.Vector3();
    this.initCallouts();
  }

  initCallouts() {
    this.definitions = [
      // Stage 3: Digital Crown & Noise Control Button
      {
        id: 'crown',
        anchorKey: 'digitalCrown',
        stageMin: 0.26,
        stageMax: 0.44,
        align: 'right',
        dx: 140,
        dy: -40,
        badge: 'DIGITAL CROWN',
        title: 'Tactile Dial & Control',
        desc: 'Turn for smooth volume control. Press to play, pause, or answer calls. Double-press to skip forward. Press and hold for Siri.'
      },
      {
        id: 'noiseBtn',
        anchorKey: 'noiseButton',
        stageMin: 0.28,
        stageMax: 0.44,
        align: 'left',
        dx: -160,
        dy: -55,
        badge: 'NOISE CONTROL',
        title: 'ANC / Transparency Toggle',
        desc: 'Switch effortlessly between industry-leading Active Noise Cancellation and Transparency mode with a single crisp click.'
      },
      // Stage 4: Mesh Canopy & Cushion Textile
      {
        id: 'canopyArch',
        anchorKey: 'canopy',
        stageMin: 0.45,
        stageMax: 0.57,
        align: 'left',
        dx: -170,
        dy: -30,
        badge: 'BREATHABLE CANOPY',
        title: 'Zero-Pressure Suspension',
        desc: 'Acoustically transparent knit mesh distributes weight evenly to eliminate pressure points across any head shape.'
      },
      {
        id: 'cushionTextile',
        anchorKey: 'cushionMesh',
        stageMin: 0.47,
        stageMax: 0.57,
        align: 'right',
        dx: 150,
        dy: 30,
        badge: 'ACOUSTIC FABRIC',
        title: '3D Diamond-Knit Weave',
        desc: 'Memory foam ear cushions wrapped in custom textile deliver pillow-soft contact and an airtight acoustic seal.'
      },
      // Stage 5: Magnetic Attachment
      {
        id: 'magneticSnap',
        anchorKey: 'speakerBaffle',
        stageMin: 0.59,
        stageMax: 0.71,
        align: 'left',
        dx: -180,
        dy: 40,
        badge: 'MAGNETIC SYSTEM',
        title: 'Effortless Detachment',
        desc: 'Rare-earth neodymium magnets snap cushions into perfect acoustic alignment with a clean mechanical click.'
      },
      // Stage 6: Exploded View Components
      {
        id: 'h1Board',
        anchorKey: 'h1Chip',
        stageMin: 0.73,
        stageMax: 0.87,
        align: 'left',
        dx: -180,
        dy: -70,
        badge: 'APPLE SILICON',
        title: 'Dual H1 Audio Processors',
        desc: '10 audio cores per chip execute 9 billion operations per second, enabling real-time computational audio & Adaptive EQ.'
      },
      {
        id: 'driver40mm',
        anchorKey: 'acousticDriver',
        stageMin: 0.74,
        stageMax: 0.87,
        align: 'right',
        dx: 160,
        dy: -40,
        badge: '40MM TRANSDUCER',
        title: 'Dual-Neodymium Ring Motor',
        desc: 'Inspired by high-end floor-standing speakers, minimizing harmonic distortion to under 1% across the entire frequency range.'
      },
      // Stage 7: Smart Case
      {
        id: 'caseStorage',
        anchorKey: 'smartCase',
        stageMin: 0.90,
        stageMax: 1.0,
        align: 'right',
        dx: 160,
        dy: -50,
        badge: 'SMART CASE',
        title: 'Ultra-Low-Power Standby',
        desc: 'Storing AirPods Max in their color-matched Smart Case immediately activates an ultra-low-power state to preserve battery.'
      }
    ];

    // Create DOM nodes for each callout
    this.definitions.forEach(def => {
      // SVG Group: Target dot, outer pulse ring, elbow leader line
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', `leader-group leader-${def.id}`);
      g.style.transition = 'opacity 0.28s ease';
      g.style.opacity = '0';

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      line.setAttribute('class', 'leader-path');
      line.setAttribute('fill', 'none');
      line.setAttribute('stroke', 'rgba(255, 255, 255, 0.65)');
      line.setAttribute('stroke-width', '1.5');
      line.setAttribute('stroke-dasharray', '3 3');

      const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      ring.setAttribute('r', '7');
      ring.setAttribute('fill', 'none');
      ring.setAttribute('stroke', '#0071e3');
      ring.setAttribute('stroke-width', '1.5');
      ring.setAttribute('opacity', '0.85');

      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('r', '3.5');
      dot.setAttribute('fill', '#ffffff');

      g.appendChild(line);
      g.appendChild(ring);
      g.appendChild(dot);
      this.svg.appendChild(g);

      // Glassmorphic HTML Card
      const card = document.createElement('div');
      card.setAttribute('class', `leader-card card-${def.id}`);
      card.style.position = 'absolute';
      card.style.transition = 'opacity 0.28s cubic-bezier(0.16, 1, 0.3, 1), transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)';
      card.style.opacity = '0';
      card.style.transform = 'scale(0.95)';
      card.style.pointerEvents = 'auto';

      card.innerHTML = `
        <div class="glass-pill-badge">${def.badge}</div>
        <h4 class="card-title">${def.title}</h4>
        <p class="card-desc">${def.desc}</p>
      `;

      this.cardsContainer.appendChild(card);

      this.items.push({
        def,
        svgGroup: g,
        line,
        ring,
        dot,
        card
      });
    });
  }

  update(scrollProgress, width, height) {
    this.items.forEach(item => {
      const { def, svgGroup, line, ring, dot, card } = item;
      const targetObj = this.anchors[def.anchorKey];
      if (!targetObj) return;

      const isActive = scrollProgress >= def.stageMin && scrollProgress <= def.stageMax;

      if (!isActive) {
        svgGroup.style.opacity = '0';
        card.style.opacity = '0';
        card.style.transform = 'scale(0.94)';
        return;
      }

      // Compute 3D world position
      targetObj.getWorldPosition(this.tempVec);

      // Project 3D vector to normalized device coordinates (-1 to +1)
      this.tempVec.project(this.camera);

      // Check if anchor is behind camera
      if (this.tempVec.z > 1.0) {
        svgGroup.style.opacity = '0';
        card.style.opacity = '0';
        return;
      }

      // Convert to screen pixels
      const sx = (this.tempVec.x * 0.5 + 0.5) * width;
      const sy = (-(this.tempVec.y * 0.5) + 0.5) * height;

      // Position target dot & ring
      dot.setAttribute('cx', sx);
      dot.setAttribute('cy', sy);
      ring.setAttribute('cx', sx);
      ring.setAttribute('cy', sy);

      // Elbow leader line calculation
      const endX = sx + def.dx;
      const endY = sy + def.dy;
      const midX = sx + def.dx * 0.45;

      const pathData = `M ${sx} ${sy} L ${midX} ${sy} L ${endX} ${endY}`;
      line.setAttribute('d', pathData);

      // Position Card
      if (def.align === 'right') {
        card.style.left = `${endX + 12}px`;
        card.style.top = `${endY - 24}px`;
        card.style.right = 'auto';
      } else {
        card.style.left = 'auto';
        card.style.right = `${width - endX + 12}px`;
        card.style.top = `${endY - 24}px`;
      }

      svgGroup.style.opacity = '1';
      card.style.opacity = '1';
      card.style.transform = 'scale(1)';
    });
  }
}
