import React, { useState } from 'react';
import { useAgencyStore } from '../store/agencyStore';
import { Maximize2, Key, Info } from 'lucide-react';
import InfoModal from './InfoModal';

const Header: React.FC = () => {
  const { phase } = useAgencyStore();
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  return (
    <header className="h-14 border-b border-zinc-100 flex items-center justify-between px-6 bg-white shrink-0 relative z-40">
      {/* Left: Project Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-zinc-900 tracking-tight">The Embodied Agency</span>
          <button
            onClick={() => setIsInfoOpen(true)}
            className="text-zinc-300 hover:text-zinc-500 transition-colors cursor-pointer"
          >
            <Info size={16} />
          </button>
        </div>
      </div>

      {/* Center: Main Title (Removed as requested) */}

      {/* Right: Global Controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleFullscreen}
          className="text-zinc-400 hover:text-zinc-900 transition-colors flex items-center gap-2"
          title="Fullscreen Browser"
        >
          <Maximize2 size={18} />
        </button>
        <button
          className="text-zinc-400 hover:text-zinc-900 transition-colors flex items-center gap-2"
          title="BYOK"
        >
          <Key size={18} />
        </button>
      </div>

      {isInfoOpen && <InfoModal onClose={() => setIsInfoOpen(false)} />}
    </header>
  );
};

export default Header;
