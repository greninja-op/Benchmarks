import { forwardRef, useImperativeHandle, useRef } from 'react';
import { CONTROL_CALLOUTS, EXPLODED_CALLOUTS } from '../data/stages';
import type { CalloutSpec, ProjectedAnchor, ShowcaseHUDState } from '../types/showcase';

export interface LeaderLinesHandle {
  update: (anchors: Record<string, ProjectedAnchor>, hud: ShowcaseHUDState) => void;
}

const ALL_CALLOUTS: CalloutSpec[] = [...CONTROL_CALLOUTS, ...EXPLODED_CALLOUTS];

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Zero-re-render 60fps 3D-to-2D SVG technical leader line & callout card renderer.
 * Every polyline endpoint stays pixel-locked onto its exact 3D mesh socket (Vector3.project(camera)).
 */
export const LeaderLinesOverlay = forwardRef<LeaderLinesHandle>(function LeaderLinesOverlay(
  _,
  ref
) {
  const lineRefs = useRef<Record<string, SVGPolylineElement | null>>({});
  const ringRefs = useRef<Record<string, SVGCircleElement | null>>({});
  const coreRefs = useRef<Record<string, SVGCircleElement | null>>({});
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useImperativeHandle(ref, () => ({
    update(anchors, hud) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const isNarrow = vw < 900;

      // Visibility envelopes for Stage 3 Controls and Stage 6 Exploded View
      const p = hud.progress;
      const controlsVis =
        smoothstep(0.285, 0.315, p) * (1.0 - smoothstep(0.415, 0.44, p));
      const explodedVis =
        smoothstep(0.755, 0.782, p) * (1.0 - smoothstep(0.835, 0.858, p));

      for (const spec of ALL_CALLOUTS) {
        const anchor = anchors[spec.anchorId];
        const lineEl = lineRefs.current[spec.id];
        const ringEl = ringRefs.current[spec.id];
        const coreEl = coreRefs.current[spec.id];
        const cardEl = cardRefs.current[spec.id];

        const vis = spec.stage === 2 ? controlsVis : explodedVis;

        if (!anchor || !anchor.visible || vis < 0.01) {
          if (lineEl) lineEl.style.opacity = '0';
          if (ringEl) ringEl.style.opacity = '0';
          if (coreEl) coreEl.style.opacity = '0';
          if (cardEl) cardEl.style.opacity = '0';
          continue;
        }

        const scaleX = isNarrow ? 0.56 : 1.0;
        const scaleY = isNarrow ? 0.72 : 1.0;
        const cardW = spec.stage === 5 ? (isNarrow ? 172 : 214) : isNarrow ? 196 : 248;
        const cardH = spec.stage === 5 ? 88 : 108;

        const ax = anchor.x;
        const ay = anchor.y;

        // Compute ideal card corner target and clamp gracefully inside safe viewport margins
        let targetX = ax + spec.offsetX * scaleX;
        let targetY = ay + spec.offsetY * scaleY;

        const minX = 18;
        const maxX = vw - cardW - 36;
        const minY = 68;
        const maxY = vh - cardH - 86;

        let cardLeft = spec.side === 'left' ? targetX - cardW : targetX;
        let cardTop = targetY - cardH * 0.5;

        cardLeft = Math.max(minX, Math.min(maxX, cardLeft));
        cardTop = Math.max(minY, Math.min(maxY, cardTop));

        // Leader line connects from exact 3D anchor -> angled elbow -> nearest card edge center
        const attachX = spec.side === 'left' ? cardLeft + cardW : cardLeft;
        const attachY = cardTop + cardH * 0.5;
        const elbowX = ax + (attachX - ax) * 0.42;
        const elbowY = attachY;

        if (lineEl) {
          lineEl.setAttribute(
            'points',
            `${ax.toFixed(1)},${ay.toFixed(1)} ${elbowX.toFixed(1)},${elbowY.toFixed(
              1
            )} ${attachX.toFixed(1)},${attachY.toFixed(1)}`
          );
          const totalLen =
            Math.hypot(elbowX - ax, elbowY - ay) + Math.hypot(attachX - elbowX, attachY - elbowY);
          lineEl.style.strokeDasharray = `${totalLen.toFixed(1)}`;
          lineEl.style.strokeDashoffset = `${((1 - vis) * totalLen).toFixed(1)}`;
          lineEl.style.opacity = `${Math.min(1, vis * 1.15)}`;
        }

        if (ringEl) {
          ringEl.setAttribute('cx', ax.toFixed(1));
          ringEl.setAttribute('cy', ay.toFixed(1));
          ringEl.style.opacity = `${vis}`;
        }

        if (coreEl) {
          coreEl.setAttribute('cx', ax.toFixed(1));
          coreEl.setAttribute('cy', ay.toFixed(1));
          coreEl.style.opacity = `${vis}`;
        }

        if (cardEl) {
          const slideY = (1 - vis) * 10;
          cardEl.style.transform = `translate3d(${cardLeft.toFixed(1)}px, ${(
            cardTop + slideY
          ).toFixed(1)}px, 0)`;
          cardEl.style.opacity = `${vis}`;
        }
      }
    },
  }));

  return (
    <div className="leader-overlay" aria-hidden="true">
      <svg className="leader-svg">
        {ALL_CALLOUTS.map((spec) => (
          <g key={spec.id}>
            <polyline
              ref={(el) => {
                lineRefs.current[spec.id] = el;
              }}
              className="leader-line"
              points="0,0 0,0 0,0"
              style={{ opacity: 0 }}
            />
            <circle
              ref={(el) => {
                ringRefs.current[spec.id] = el;
              }}
              className="leader-anchor-ring"
              r={5.2}
              cx={0}
              cy={0}
              style={{ opacity: 0 }}
            />
            <circle
              ref={(el) => {
                coreRefs.current[spec.id] = el;
              }}
              className="leader-anchor-core"
              r={2.4}
              cx={0}
              cy={0}
              style={{ opacity: 0 }}
            />
          </g>
        ))}
      </svg>

      {ALL_CALLOUTS.map((spec) => (
        <div
          key={spec.id}
          ref={(el) => {
            cardRefs.current[spec.id] = el;
          }}
          className={`callout-card ${spec.stage === 5 ? 'compact' : ''}`}
        >
          <div className="callout-kicker">{spec.subtitle}</div>
          <div className="callout-title">{spec.title}</div>
          <div className="callout-detail">{spec.detail}</div>
        </div>
      ))}
    </div>
  );
});
