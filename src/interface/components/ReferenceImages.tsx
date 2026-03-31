import React, { useRef } from 'react';
import { Image as ImageIcon, Plus, X, UploadCloud } from 'lucide-react';
import { useCoreStore } from '../../integration/store/coreStore';
import { USER_COLOR } from '../../theme/brand';

export const ReferenceImages: React.FC = () => {
  const { referenceImages, addReferenceImage, removeReferenceImage } = useCoreStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (referenceImages.length >= 3) break;

      const reader = new FileReader();
      reader.onloadend = () => {
        addReferenceImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    // Reset input
    e.target.value = '';
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <UploadCloud size={12} className="text-zinc-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Reference Images</span>
        </div>
        <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-tighter">
          {referenceImages.length}/3 Slots
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {/* Existing Images */}
        {referenceImages.map((img, idx) => (
          <div 
            key={idx} 
            className="group relative aspect-square rounded-xl overflow-hidden border border-zinc-100 bg-zinc-50 shadow-sm animate-in zoom-in-95 duration-200"
          >
            <img 
              src={img} 
              alt={`Reference ${idx + 1}`} 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
              <button 
                onClick={() => removeReferenceImage(idx)}
                className="p-1.5 bg-white/20 hover:bg-white/40 text-white rounded-full transition-all active:scale-90"
              >
                <X size={14} strokeWidth={3} />
              </button>
            </div>
          </div>
        ))}

        {/* Add Button */}
        {referenceImages.length < 3 && (
          <button
            onClick={triggerUpload}
            className="aspect-square rounded-xl border-2 border-dashed border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50 transition-all flex flex-col items-center justify-center gap-1 group active:scale-95"
          >
            <div className="w-6 h-6 rounded-lg bg-zinc-50 group-hover:bg-white flex items-center justify-center transition-colors border border-transparent group-hover:border-zinc-100 shadow-sm">
              <Plus size={14} className="text-zinc-400 group-hover:text-zinc-900 transition-colors" />
            </div>
            <span className="text-[8px] font-black uppercase tracking-tighter text-zinc-300 group-hover:text-zinc-500">Add</span>
          </button>
        )}

        {/* Empty Slots */}
        {Array.from({ length: Math.max(0, 3 - referenceImages.length - (referenceImages.length < 3 ? 1 : 0)) }).map((_, i) => (
          <div 
            key={`empty-${i}`} 
            className="aspect-square rounded-xl border border-zinc-50 bg-zinc-50/30 flex items-center justify-center opacity-40"
          >
            <ImageIcon size={14} className="text-zinc-200" />
          </div>
        ))}
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        multiple 
        className="hidden" 
      />

      <p className="text-[9px] text-zinc-400 font-medium leading-tight">
        Add visual references to guide the team's creative direction.
      </p>
    </div>
  );
};
