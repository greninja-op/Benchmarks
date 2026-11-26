import { COLORWAYS } from '../data/colorways';

interface ColorSwatchBarProps {
  activeIndex: number;
  isLocked: boolean;
  onSelectColor: (index: number) => void;
  onResetAuto: () => void;
}

export function ColorSwatchBar({
  activeIndex,
  isLocked,
  onSelectColor,
  onResetAuto,
}: ColorSwatchBarProps) {
  const active = COLORWAYS[activeIndex] ?? COLORWAYS[0];

  return (
    <div className="swatch-dock" role="region" aria-label="AirPods Max Finishes">
      <span className="swatch-dock-label">{active.name}</span>
      <div className="swatch-list" role="radiogroup" aria-label="Select finish">
        {COLORWAYS.map((c, i) => {
          const isActive = i === activeIndex;
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              aria-label={c.name}
              title={c.name}
              className={`swatch-btn ${isActive ? 'active' : ''}`}
              style={{
                background: `linear-gradient(145deg, ${c.swatchHex} 45%, ${c.swatchRingHex} 100%)`,
              }}
              onClick={() => onSelectColor(i)}
            />
          );
        })}
      </div>
      {isLocked && (
        <button
          type="button"
          className="swatch-auto-btn"
          onClick={onResetAuto}
          title="Resume scroll-driven colorway morphing"
        >
          Auto
        </button>
      )}
    </div>
  );
}
