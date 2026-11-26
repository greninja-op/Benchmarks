import React, { useImperativeHandle, useRef } from 'react';
import { CALLOUT_SPECS } from '../data/airpodsSpec';
import type { StudioFramePayload } from '../engine/studioScene';

export interface LeaderLinesHandle {
  update: (payload: StudioFramePayload) => void;
}

interface LeaderLinesOverlayProps {
  freeOrbit: boolean;
}

export const LeaderLinesOverlay = React.forwardRef<LeaderLinesHandle, LeaderLinesOverlayProps>(
  ({ freeOrbit }, ref) => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const lineRefs = useRef<Record<string, SVGPolylineElement | null>>({});
    const dotRefs = useRef<Record<string, SVGCircleElement | null>>({});
    const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

    useImperativeHandle(ref, () => ({
      update: (payload: StudioFramePayload) => {
        const { state, anchors, width, height } = payload;
        const svg = svgRef.current;
        if (svg) {
          svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        }

        const isMobile = width < 768;

        for (let i = 0; i < CALLOUT_SPECS.length; i++) {
          const spec = CALLOUT_SPECS[i];
          const anchor = anchors[spec.anchorKey];
          const lineEl = lineRefs.current[spec.id];
          const dotEl = dotRefs.current[spec.id];
          const cardEl = cardRefs.current[spec.id];

          const stageOpacity =
            spec.stage === 'controls'
              ? state.controlsCalloutOpacity
              : state.explodedCalloutOpacity;

          const effectiveOpacity = freeOrbit ? 0 : stageOpacity;

          if (!anchor || !anchor.visible || effectiveOpacity <= 0.02) {
            if (lineEl) lineEl.style.opacity = '0';
            if (dotEl) dotEl.style.opacity = '0';
            if (cardEl) cardEl.style.opacity = '0';
            continue;
          }

          const scale = isMobile ? 0.56 : 1;
          const cardWidth = isMobile ? 168 : 224;
          const rawX = anchor.x + spec.offsetX * scale;
          const rawY = anchor.y + spec.offsetY * scale;

          // Keep callouts cleanly inside safe viewport margins above ControlDock & below stage header
          const minX = 16;
          const maxX = Math.max(minX, width - cardWidth - 16);
          const minY = spec.stage === 'exploded' ? 156 : 72;
          const maxY = Math.max(minY, height - 195);

          const labelX = Math.min(Math.max(rawX, minX), maxX);
          const labelY = Math.min(Math.max(rawY, minY), maxY);

          const targetLeftEdge = labelX > anchor.x;
          const elbowX = anchor.x + (labelX - anchor.x) * 0.45;
          const elbowY = labelY + 14;
          const endX = targetLeftEdge ? labelX : labelX + cardWidth;

          if (dotEl) {
            dotEl.setAttribute('cx', anchor.x.toFixed(1));
            dotEl.setAttribute('cy', anchor.y.toFixed(1));
            dotEl.style.opacity = effectiveOpacity.toFixed(3);
          }

          if (lineEl) {
            lineEl.setAttribute(
              'points',
              `${anchor.x.toFixed(1)},${anchor.y.toFixed(1)} ${elbowX.toFixed(1)},${elbowY.toFixed(1)} ${endX.toFixed(1)},${elbowY.toFixed(1)}`,
            );
            lineEl.style.opacity = effectiveOpacity.toFixed(3);
          }

          if (cardEl) {
            cardEl.style.opacity = effectiveOpacity.toFixed(3);
            cardEl.style.transform = `translate3d(${labelX.toFixed(1)}px, ${labelY.toFixed(1)}px, 0)`;
          }
        }
      },
    }), [freeOrbit]);

    return (
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-20 overflow-hidden"
      >
        <svg ref={svgRef} className="absolute inset-0 w-full h-full">
          {CALLOUT_SPECS.map((spec) => (
            <g key={spec.id}>
              <polyline
                ref={(el) => {
                  lineRefs.current[spec.id] = el;
                }}
                fill="none"
                stroke="#1d1d1f"
                strokeOpacity="0.45"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ opacity: 0 }}
              />
              <circle
                ref={(el) => {
                  dotRefs.current[spec.id] = el;
                }}
                r="3.5"
                fill="#1d1d1f"
                stroke="#ffffff"
                strokeWidth="1.5"
                style={{ opacity: 0 }}
              />
            </g>
          ))}
        </svg>

        {CALLOUT_SPECS.map((spec) => (
          <div
            key={spec.id}
            ref={(el) => {
              cardRefs.current[spec.id] = el;
            }}
            style={{ opacity: 0, width: '224px' }}
            className="absolute top-0 left-0 rounded-xl bg-white/94 border border-[#1d1d1f]/12 px-3.5 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.06)] max-md:w-[168px] max-md:px-2.5 max-md:py-2"
          >
            <p className="font-display text-[12px] font-semibold tracking-tight text-[#1d1d1f] leading-snug">
              {spec.title}
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-[#1d1d1f]/65">
              {spec.detail}
            </p>
          </div>
        ))}
      </div>
    );
  },
);

LeaderLinesOverlay.displayName = 'LeaderLinesOverlay';
