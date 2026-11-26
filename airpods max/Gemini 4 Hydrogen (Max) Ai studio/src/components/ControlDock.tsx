import React from 'react';
import { ChevronDown, ChevronUp, Orbit, RotateCcw } from 'lucide-react';
import {
  AIRPODS_COLORWAYS,
  SCROLL_STAGES,
  type AirPodsColorway,
  type ColorwayId,
} from '../data/airpodsSpec';

interface ControlDockProps {
  selectedColorway: AirPodsColorway;
  activeStageIndex: number;
  freeOrbit: boolean;
  hudHidden: boolean;
  onSelectColorway: (id: ColorwayId) => void;
  onJumpToStage: (targetScroll: number) => void;
  onToggleFreeOrbit: () => void;
  onToggleHud: () => void;
}

export const ControlDock: React.FC<ControlDockProps> = ({
  selectedColorway,
  activeStageIndex,
  freeOrbit,
  hudHidden,
  onSelectColorway,
  onJumpToStage,
  onToggleFreeOrbit,
  onToggleHud,
}) => {
  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-[min(1060px,95vw)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        hudHidden ? 'translate-y-[calc(100%-26px)]' : 'translate-y-0'
      }`}
    >
      {/* Collapse / Expand toggle tab */}
      <div className="flex justify-center mb-1.5">
        <button
          type="button"
          onClick={onToggleHud}
          aria-expanded={!hudHidden}
          aria-label={hudHidden ? 'Show Controls' : 'Hide Controls'}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/94 border border-[#1d1d1f]/10 text-[11px] font-medium text-[#1d1d1f]/75 hover:text-[#1d1d1f] shadow-[0_2px_10px_rgba(0,0,0,0.06)] transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d1d1f]"
        >
          {hudHidden ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Show Controls</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Hide Controls</span>
            </>
          )}
        </button>
      </div>

      {/* Unified Horizontal Control Dock */}
      <div className="rounded-2xl bg-white/95 border border-[#1d1d1f]/10 px-3.5 py-2.5 shadow-[0_10px_32px_rgba(0,0,0,0.08)] flex flex-wrap md:flex-nowrap items-center justify-between gap-2.5">
        {/* 5 Signature Finishes Swatches */}
        <div
          role="group"
          aria-label="AirPods Max finishes"
          className="flex items-center gap-1.5 shrink-0"
        >
          {AIRPODS_COLORWAYS.map((cw) => {
            const active = cw.id === selectedColorway.id;
            return (
              <button
                key={cw.id}
                type="button"
                onClick={() => onSelectColorway(cw.id)}
                aria-label={`Finish: ${cw.name}`}
                aria-pressed={active}
                title={cw.name}
                className={`relative w-5 h-5 rounded-full transition-transform cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d1d1f] ${
                  active ? 'scale-110 ring-2 ring-[#1d1d1f] ring-offset-2' : 'hover:scale-105'
                }`}
                style={{
                  backgroundColor: cw.swatchHex,
                  boxShadow: `inset 0 1px 2px rgba(255,255,255,0.45), inset 0 -1px 2px ${cw.swatchRingHex}`,
                }}
              />
            );
          })}
          <span className="ml-1.5 text-[12px] font-medium text-[#1d1d1f] whitespace-nowrap min-w-[68px]">
            {selectedColorway.name}
          </span>
        </div>

        {/* Divider */}
        <div className="hidden md:block w-px h-5 bg-[#1d1d1f]/10 shrink-0" aria-hidden="true" />

        {/* 7 Stage Chapter Pills */}
        <div
          role="navigation"
          aria-label="Showcase stages"
          className="flex items-center gap-1 overflow-x-auto max-w-full py-0.5"
        >
          {SCROLL_STAGES.map((stage) => {
            const active = stage.index === activeStageIndex && !freeOrbit;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => onJumpToStage(stage.targetScroll)}
                aria-current={active ? 'step' : undefined}
                className={`px-2 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d1d1f] ${
                  active
                    ? 'bg-[#1d1d1f] text-white'
                    : 'text-[#1d1d1f]/65 hover:text-[#1d1d1f] hover:bg-[#1d1d1f]/6'
                }`}
              >
                {stage.label}
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="hidden md:block w-px h-5 bg-[#1d1d1f]/10 shrink-0" aria-hidden="true" />

        {/* Interactive 360° Free Orbit Toggle */}
        <button
          type="button"
          onClick={onToggleFreeOrbit}
          aria-pressed={freeOrbit}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d1d1f] ${
            freeOrbit
              ? 'bg-[#1d1d1f] text-white'
              : 'bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]'
          }`}
        >
          {freeOrbit ? (
            <>
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Resume Scroll</span>
            </>
          ) : (
            <>
              <Orbit className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Inspect 360°</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
