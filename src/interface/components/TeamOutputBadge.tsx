import { FileText, Image, Music, Video } from 'lucide-react';
import React from 'react';
import { AgenticSystem } from '../../data/agents';

interface TeamOutputBadgeProps {
  system: AgenticSystem;
  className?: string;
}

export const TeamOutputBadge: React.FC<TeamOutputBadgeProps> = ({ system, className = '' }) => {
  return (
    <div className={`flex items-center gap-2.5 px-2.5 py-1.5 bg-zinc-50/50 border border-zinc-100/50 rounded-xl backdrop-blur-sm ${className}`}>
      <div className="flex items-center gap-1.5 text-zinc-400">
        {system.outputType === 'text' && <FileText size={12} strokeWidth={2.5} />}
        {system.outputType === 'image' && <Image size={12} strokeWidth={2.5} />}
        {system.outputType === 'music' && <Music size={12} strokeWidth={2.5} />}
        {system.outputType === 'video' && <Video size={12} strokeWidth={2.5} />}
        <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500">
          {system.outputType || 'TEXT'}
        </span>
      </div>
      <div className="w-px h-3 bg-zinc-200/50" />
      <div className="flex items-center gap-1.5">
        <span className="text-[8px] font-black text-zinc-300 uppercase tracking-tight shrink-0">LLM</span>
        <span className="text-[9px] font-bold text-zinc-600 font-mono lowercase whitespace-nowrap">
          {system.outputModel}
        </span>
      </div>
    </div>
  );
};
