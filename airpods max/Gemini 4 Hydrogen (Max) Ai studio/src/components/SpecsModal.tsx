import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { TECHNICAL_SPECS, type AirPodsColorway } from '../data/airpodsSpec';

interface SpecsModalProps {
  open: boolean;
  colorway: AirPodsColorway;
  onClose: () => void;
}

export const SpecsModal: React.FC<SpecsModalProps> = ({ open, colorway, onClose }) => {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="specs-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1d1d1f]/35"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl bg-white border border-[#1d1d1f]/10 p-6 md:p-8 shadow-[0_24px_60px_rgba(0,0,0,0.16)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 pb-5 border-b border-[#1d1d1f]/10">
          <div>
            <p className="text-[12px] font-medium text-[#1d1d1f]/55">
              Hardware Architecture · {colorway.name}
            </p>
            <h2
              id="specs-modal-title"
              className="mt-1 font-display text-[24px] font-semibold tracking-tight text-[#1d1d1f]"
            >
              AirPods Max Technical Specifications
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close specifications"
            className="p-2 rounded-full bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d1d1f]"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-6 space-y-6">
          {TECHNICAL_SPECS.map((section) => (
            <div key={section.group}>
              <h3 className="font-display text-[13px] font-semibold text-[#1d1d1f] mb-2.5">
                {section.group}
              </h3>
              <dl className="divide-y divide-[#1d1d1f]/8 border-t border-b border-[#1d1d1f]/8">
                {section.items.map(([label, val]) => (
                  <div
                    key={label}
                    className="py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-[13px]"
                  >
                    <dt className="text-[#1d1d1f]/60">{label}</dt>
                    <dd className="font-medium text-[#1d1d1f] font-mono-tabular sm:text-right">
                      {val}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
