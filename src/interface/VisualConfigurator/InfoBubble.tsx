import { HelpCircle } from 'lucide-react';
import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { USER_COLOR } from '../../theme/brand';

interface InfoBubbleProps {
  text: string;
}

export const InfoBubble: React.FC<InfoBubbleProps> = ({ text }) => {
  const [isVisible, setIsVisible] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
    }
  };

  return (
    <div className="relative inline-block ml-1">
      <button
        ref={triggerRef}
        type="button"
        onMouseEnter={() => {
          updateCoords();
          setIsVisible(true);
        }}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => {
          updateCoords();
          setIsVisible(!isVisible);
        }}
        className="text-zinc-300 transition-colors cursor-help outline-none"
        style={{ color: isVisible ? USER_COLOR : undefined }}
      >
        <HelpCircle size={12} strokeWidth={2.5} />
      </button>

      {createPortal(
        <>
          {isVisible && (
            <div
              className="fixed bg-zinc-900 text-white text-[10px] px-3 py-2 rounded-lg shadow-2xl z-[9999] pointer-events-none border border-zinc-800 w-max max-w-[200px] text-center"
              style={{
                left: coords.x + 8,
                top: coords.y - 8,
                transform: 'translate(-50%, -100%)',
              }}
            >
              {text}
            </div>
          )}
        </>,
        document.body
      )}
    </div>
  );
};
