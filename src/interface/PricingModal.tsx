import { ExternalLink, X } from 'lucide-react';
import React from 'react';
import { GEMINI_PRICING } from '../core/llm/pricing';

interface PricingModalProps {
  onClose: () => void;
}

const PricingModal: React.FC<PricingModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-6 pointer-events-auto overflow-hidden">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-white/60 backdrop-blur-xl"
      />
      <div
        className="relative w-full max-w-md bg-white rounded-[40px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] p-8 md:p-10 border border-zinc-100"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-zinc-300 hover:text-zinc-600 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="max-w-sm mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-black text-zinc-900 tracking-tight mb-2 uppercase">
              Pricing References
            </h2>
            <p className="text-zinc-400 text-xs font-medium leading-relaxed">
              Estimated costs are based on official Google Gemini API pricing for March 2026.
            </p>
          </div>

          {/* Pricing Table */}
          <div className="space-y-4 mb-10 text-zinc-800">
            {Object.entries(GEMINI_PRICING).map(([model, pricing]) => (
              <div key={model} className="p-4 bg-zinc-50 rounded-3xl border border-zinc-100/60">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 truncate">
                  {model}
                </p>
                <div className="flex items-center justify-between text-[11px] font-mono font-bold">
                  <div className="flex flex-col">
                    <span className="text-zinc-400 font-medium uppercase text-[9px] mb-0.5 tracking-tighter">Input / 1M</span>
                    <span>${pricing.inputPer1M.toFixed(2)}</span>
                  </div>
                  <div className="w-px h-6 bg-zinc-200" />
                  <div className="flex flex-col text-right">
                    <span className="text-zinc-400 font-medium uppercase text-[9px] mb-0.5 tracking-tighter">Output / 1M</span>
                    <span>${pricing.outputPer1M.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Official Link */}
          <a
            href="https://ai.google.dev/gemini-api/docs/pricing"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-center gap-2 w-full py-4 bg-zinc-900 text-white rounded-full text-[11px] font-black uppercase tracking-[0.2em] hover:bg-black transition-all active:scale-95 cursor-pointer"
          >
            Official Pricing Page
            <ExternalLink size={12} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default PricingModal;
