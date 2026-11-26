import React from 'react';
import { LEADER_CALLOUTS } from '../data/colorways';

export interface LeaderLinesRefs {
  containerEl: HTMLDivElement | null;
  pathEls: Record<string, SVGPathElement | null>;
  dotEls: Record<string, SVGCircleElement | null>;
  pulseEls: Record<string, SVGCircleElement | null>;
  cardEls: Record<string, HTMLDivElement | null>;
}

interface Props {
  refsBag: React.MutableRefObject<LeaderLinesRefs>;
}

/**
 * Zero-React-re-render 3D-projected SVG Leader Line HUD.
 * Coordinates and opacities are updated imperatively at 60fps inside requestAnimationFrame
 * directly from Vector3.project(camera) so every pointer stays 100% locked onto the 3D hardware!
 */
export const LeaderLinesOverlay: React.FC<Props> = ({ refsBag }) => {
  return (
    <div
      ref={(el) => {
        refsBag.current.containerEl = el;
      }}
      className="leader-overlay"
      aria-hidden="true"
    >
      <svg className="leader-svg">
        <defs>
          <linearGradient id="leaderStrokeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(29, 29, 31, 0.72)" />
            <stop offset="100%" stopColor="rgba(29, 29, 31, 0.22)" />
          </linearGradient>
        </defs>
        {LEADER_CALLOUTS.map((c) => (
          <g key={c.id}>
            <path
              ref={(el) => {
                refsBag.current.pathEls[c.id] = el;
              }}
              className="leader-path"
              d=""
              stroke="url(#leaderStrokeGrad)"
              strokeWidth="1.25"
              fill="none"
              style={{ opacity: 0 }}
            />
            <circle
              ref={(el) => {
                refsBag.current.pulseEls[c.id] = el;
              }}
              r="8"
              fill="rgba(29, 29, 31, 0.12)"
              style={{ opacity: 0 }}
            />
            <circle
              ref={(el) => {
                refsBag.current.dotEls[c.id] = el;
              }}
              r="3.2"
              fill="#1d1d1f"
              stroke="#ffffff"
              strokeWidth="1.2"
              style={{ opacity: 0 }}
            />
          </g>
        ))}
      </svg>

      {LEADER_CALLOUTS.map((c) => (
        <div
          key={c.id}
          ref={(el) => {
            refsBag.current.cardEls[c.id] = el;
          }}
          className={`leader-card leader-card--${c.side}`}
          style={{ opacity: 0 }}
        >
          <span className="leader-card__eyebrow">{c.subtitle}</span>
          <h4 className="leader-card__title">{c.title}</h4>
          <p className="leader-card__detail">{c.detail}</p>
        </div>
      ))}
    </div>
  );
};
