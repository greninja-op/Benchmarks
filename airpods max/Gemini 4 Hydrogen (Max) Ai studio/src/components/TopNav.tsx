import React from 'react';

interface TopNavProps {
  activeStageIndex: number;
  onJumpToStage: (targetScroll: number) => void;
  onOpenSpecs: () => void;
}

const NAV_ITEMS = [
  { label: 'Overview', targetScroll: 0.0, stageRange: [0, 0] },
  { label: 'Finishes', targetScroll: 0.19, stageRange: [1, 1] },
  { label: 'Engineering', targetScroll: 0.80, stageRange: [2, 5] },
  { label: 'Smart Case', targetScroll: 0.985, stageRange: [6, 6] },
];

export const TopNav: React.FC<TopNavProps> = ({
  activeStageIndex,
  onJumpToStage,
  onOpenSpecs,
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-30 h-14 px-6 md:px-10 flex items-center justify-between gap-8 border-b border-[#1d1d1f]/8 bg-[#f5f5f7]/90">
      <button
        type="button"
        onClick={() => onJumpToStage(0)}
        className="font-display text-[17px] font-semibold tracking-tight text-[#1d1d1f] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1d1d1f]"
      >
        AirPods Max
      </button>

      <nav
        aria-label="Primary sections"
        className="hidden md:flex items-center gap-7 text-[13px] font-medium text-[#1d1d1f]/65"
      >
        {NAV_ITEMS.map((item) => {
          const isActive =
            activeStageIndex >= item.stageRange[0] && activeStageIndex <= item.stageRange[1];
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => onJumpToStage(item.targetScroll)}
              className={`relative py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1d1d1f] ${
                isActive ? 'text-[#1d1d1f]' : 'hover:text-[#1d1d1f]'
              }`}
            >
              {item.label}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute left-0 right-0 -bottom-[1px] h-[1.5px] bg-[#1d1d1f]"
                />
              )}
            </button>
          );
        })}
      </nav>

      <div className="flex items-center shrink-0">
        <button
          type="button"
          onClick={onOpenSpecs}
          className="px-4 py-1.5 text-[12px] font-medium text-white bg-[#1d1d1f] rounded-full hover:bg-[#333336] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d1d1f]"
        >
          Tech Specs
        </button>
      </div>
    </header>
  );
};
