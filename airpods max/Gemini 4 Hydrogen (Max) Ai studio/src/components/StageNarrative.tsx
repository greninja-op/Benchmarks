import React from 'react';
import { ArrowDown } from 'lucide-react';
import { type AirPodsColorway, type ScrollStage } from '../data/airpodsSpec';

interface StageNarrativeProps {
  stage: ScrollStage;
  colorway: AirPodsColorway;
  hudHidden: boolean;
  freeOrbit: boolean;
  onExploreSpecs: () => void;
  onNextStage: () => void;
}

export const StageNarrative: React.FC<StageNarrativeProps> = ({
  stage,
  colorway,
  hudHidden,
  freeOrbit,
  onExploreSpecs,
  onNextStage,
}) => {
  if (hudHidden || freeOrbit) {
    return null;
  }

  const isHero = stage.index === 0;
  const isExploded = stage.index === 5;
  const isFinale = stage.index === 6;

  if (isHero) {
    return (
      <section
        aria-label={stage.title}
        className="pointer-events-none fixed inset-x-0 top-16 z-20 flex flex-col items-center text-center px-6"
      >
        <p className="text-[12px] font-medium tracking-wide text-[#1d1d1f]/55">
          {stage.kicker}
        </p>
        <h1 className="mt-1 font-display text-[clamp(2.25rem,4.5vw,3.75rem)] font-semibold tracking-tight text-[#1d1d1f] leading-[1.06] text-balance">
          {stage.title}
        </h1>
        <p className="mt-2 max-w-lg text-[14px] md:text-[15px] leading-relaxed text-[#1d1d1f]/70">
          {stage.description}
        </p>

        {stage.metrics && (
          <div className="mt-3 flex items-center gap-3 text-[12px] text-[#1d1d1f]/60 font-mono-tabular">
            {stage.metrics.map((m, idx) => (
              <React.Fragment key={m.label}>
                {idx > 0 && <span aria-hidden="true">·</span>}
                <span>
                  <strong className="font-medium text-[#1d1d1f]">{m.value}</strong> {m.label}
                </span>
              </React.Fragment>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={onNextStage}
          className="pointer-events-auto mt-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-[#1d1d1f]/70 hover:text-[#1d1d1f] transition-colors cursor-pointer"
        >
          <span>Scroll to explore</span>
          <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </section>
    );
  }

  if (isExploded) {
    return (
      <section
        aria-label={stage.title}
        className="pointer-events-none fixed inset-x-0 top-16 z-20 flex flex-col items-center text-center px-6"
      >
        <p className="text-[12px] font-medium tracking-wide text-[#1d1d1f]/55">
          {stage.kicker}
        </p>
        <h2 className="mt-0.5 font-display text-[clamp(1.6rem,3vw,2.4rem)] font-semibold tracking-tight text-[#1d1d1f] leading-tight text-balance">
          {stage.title}
        </h2>
        <p className="mt-1 max-w-xl text-[13px] md:text-[14px] leading-relaxed text-[#1d1d1f]/70">
          {stage.description}
        </p>
      </section>
    );
  }

  const positionClass =
    stage.alignment === 'right'
      ? 'right-6 md:right-12 top-24 md:top-1/2 md:-translate-y-1/2 text-left'
      : 'left-6 md:left-12 top-24 md:top-1/2 md:-translate-y-1/2 text-left';

  return (
    <section
      aria-label={stage.title}
      className={`pointer-events-none fixed z-20 max-w-[330px] md:max-w-[360px] ${positionClass}`}
    >
      <div className="rounded-2xl bg-[#f5f5f7]/88 border border-[#1d1d1f]/8 px-5 py-4 shadow-[0_8px_28px_rgba(0,0,0,0.04)]">
        <p className="text-[11px] font-medium tracking-wide text-[#1d1d1f]/55">
          {stage.kicker}
        </p>
        <h2 className="mt-1 font-display text-[24px] md:text-[28px] font-semibold tracking-tight text-[#1d1d1f] leading-[1.14] text-balance">
          {stage.title}
        </h2>
        <p className="mt-2.5 text-[14px] leading-relaxed text-[#1d1d1f]/72">
          {stage.description}
        </p>

        {stage.index === 1 && (
          <div className="mt-3 pt-3 border-t border-[#1d1d1f]/8 flex items-center gap-2 text-[12px] text-[#1d1d1f]/75">
            <span
              className="inline-block w-3 h-3 rounded-full border border-[#1d1d1f]/20"
              style={{ backgroundColor: colorway.swatchHex }}
            />
            <span>Active Finish:</span>
            <strong className="font-medium text-[#1d1d1f]">{colorway.name}</strong>
          </div>
        )}

        {stage.metrics && (
          <div className="mt-3 pt-3 border-t border-[#1d1d1f]/8 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#1d1d1f]/65 font-mono-tabular">
            {stage.metrics.map((m, idx) => (
              <React.Fragment key={m.label}>
                {idx > 0 && <span aria-hidden="true">·</span>}
                <span>
                  <strong className="font-medium text-[#1d1d1f]">{m.value}</strong> {m.label}
                </span>
              </React.Fragment>
            ))}
          </div>
        )}

        {isFinale && (
          <div className="pointer-events-auto mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={onExploreSpecs}
              className="px-4 py-2 text-[13px] font-medium text-white bg-[#1d1d1f] rounded-full hover:bg-[#333336] transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d1d1f]"
            >
              Full Specifications
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
