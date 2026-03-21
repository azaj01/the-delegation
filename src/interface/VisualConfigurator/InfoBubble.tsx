import { HelpCircle } from 'lucide-react';
import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

interface InfoBubbleProps {
  text: string;
}

export const InfoBubble: React.FC<InfoBubbleProps> = ({ text }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block ml-1">
      <button
        type="button"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
        className="text-zinc-300 hover:text-blue-500 transition-colors cursor-help outline-none"
      >
        <HelpCircle size={12} strokeWidth={2.5} />
      </button>

      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-3 bg-zinc-900 text-white text-[10px] font-medium leading-relaxed rounded-xl shadow-xl z-[100] pointer-events-none border border-zinc-800"
          >
            {text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-zinc-900" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
