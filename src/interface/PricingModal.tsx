import { ExternalLink, X } from 'lucide-react';
import React from 'react';
import { GEMINI_PRICING } from '../core/llm/pricing';

interface PricingModalProps {
  onClose: () => void;
}

const PricingModal: React.FC<PricingModalProps> = ({ onClose }) => {
  const reasoningModels = Object.entries(GEMINI_PRICING).filter(([_, p]) => p.inputPer1M !== undefined);
  const outputModels = Object.entries(GEMINI_PRICING).filter(([_, p]) => p.inputPer1M === undefined);

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-6 pointer-events-auto overflow-hidden">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-white/60 backdrop-blur-xl"
      />
      <div
        className="relative w-full max-w-lg bg-white rounded-[40px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] p-8 md:p-10 border border-zinc-100 max-h-[90vh] overflow-y-auto"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-zinc-300 hover:text-zinc-600 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="mb-4">
            <h2 className="text-2xl font-black text-zinc-900 tracking-tight mb-1">
              Gemini API Pricing
            </h2>
            <a
              href="https://ai.google.dev/gemini-api/docs/pricing"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 hover:border-emerald-200 rounded-full transition-all duration-200 mb-2"
            >
              <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600">Official Pricing Page</span>
              <ExternalLink size={9} className="text-emerald-500" />
            </a>
            <p className="text-zinc-400 text-[10px] font-medium leading-relaxed">
              Official Google Gemini API pricing (March 2026).
            </p>
          </div>

          {/* Reasoning Models */}
          <div className="mb-4">
            <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-2 px-1">Reasoning Models</h3>
            <div className="space-y-1">
              {reasoningModels.map(([model, pricing]) => (
                <div key={model} className="px-5 py-2 bg-zinc-50 rounded-2xl border border-zinc-100/60 flex items-center justify-between">
                  <p className="text-[10px] font-bold text-zinc-800 truncate lowercase flex-1">
                    {model}
                  </p>
                  <div className="flex items-center gap-4 text-[10px] font-mono font-bold">
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-300 font-medium uppercase text-[8px] tracking-tighter">In</span>
                      <span className="text-zinc-900">${pricing.inputPer1M?.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-300 font-medium uppercase text-[8px] tracking-tighter">Out</span>
                      <span className="text-zinc-900">${pricing.outputPer1M?.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Output Models */}
          <div className="mb-6">
            <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-2 px-1">Output Models</h3>
            <div className="space-y-1">
              {['image', 'audio', 'video'].map(type => {
                const typeModels = outputModels.filter(([_, p]) => {
                  if (type === 'image') return p.perImage !== undefined;
                  if (type === 'audio') return p.perSong !== undefined;
                  return p.perSecond !== undefined;
                });
                
                if (typeModels.length === 0) return null;

                return typeModels.map(([model, pricing]) => (
                  <div key={model} className="px-5 py-2 bg-zinc-50 rounded-2xl border border-zinc-100/60 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                       <span className="px-1.5 py-0.5 bg-zinc-200 text-zinc-500 text-[7px] font-black uppercase rounded-[4px] tracking-widest shrink-0">
                         {type}
                       </span>
                       <p className="text-[10px] font-bold text-zinc-800 truncate lowercase">
                         {model}
                       </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-zinc-300 font-medium uppercase text-[8px] tracking-tight">
                        {pricing.perImage !== undefined ? 'Img' : pricing.perSong !== undefined ? 'Song' : 'Sec'}
                      </span>
                      <span className="text-[12px] font-mono font-bold text-zinc-900">
                        ${(pricing.perImage || pricing.perSong || pricing.perSecond || 0).toFixed(3)}
                      </span>
                    </div>
                  </div>
                ));
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingModal;
