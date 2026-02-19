
import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import DebugPanel from './DebugPanel';
import { AGENTS } from '../data/agents';

const UIOverlay: React.FC = () => {
  const { isThinking, setThinking, setAIResponse, setAnimation, isDebugOpen, toggleDebug, selectedNpcIndex } = useStore();
  const [input, setInput] = useState('');

  const selectedAgent = selectedNpcIndex != null ? AGENTS[selectedNpcIndex] ?? null : null;

  const handleSend = async () => {
    if (!input.trim() || isThinking) return;

    setThinking(true);
    const userMsg = input;
    setInput('');

    // Local response simulation instead of Gemini
    setTimeout(() => {
      setAIResponse(`Response to: "${userMsg}"`);
      setAnimation('Wave');
      setThinking(false);
    }, 500);
  };

  return (
    <div className="fixed inset-0 pointer-events-none flex flex-col justify-between p-8">
      {/* Top Header */}
      <div className="flex justify-between items-start">
        <div className="bg-white/80 backdrop-blur-lg p-4 rounded-2xl border border-black/5 shadow-sm max-w-sm pointer-events-auto">
          <h1 className="text-xl font-bold mb-1 text-zinc-900">Autonomous Characters Lab</h1>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <p className="text-xs text-zinc-500 font-medium tracking-tight">Three.js WebGPU • Gemini AI</p>
          </div>
        </div>

        {/* Debug Button */}
        <button
          onClick={toggleDebug}
          className={`pointer-events-auto px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 border ${
            isDebugOpen
            ? 'bg-zinc-900 text-white border-zinc-900 shadow-lg'
            : 'bg-white/80 text-zinc-500 border-black/5 hover:bg-white hover:text-zinc-900'
          }`}
        >
          {isDebugOpen ? 'Close Debug' : 'Debug'}
        </button>
      </div>

      {/* Debug Panel Mount */}
      <DebugPanel />

      {/* NPC Info Panel — shown when an NPC is selected */}
      {selectedAgent && (
        <div className="absolute bottom-28 left-8 w-72 bg-white/85 backdrop-blur-2xl rounded-2xl border border-black/5 shadow-2xl p-5 pointer-events-auto animate-in fade-in slide-in-from-left-4 duration-300">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-0.5">
                {selectedAgent.role}
              </p>
              <h2 className="text-xl font-black text-zinc-900 leading-tight">{selectedAgent.name}</h2>
            </div>
            <span className="text-xs font-bold bg-zinc-100 text-zinc-500 px-2 py-1 rounded-lg uppercase tracking-wide">
              {selectedAgent.lang}
            </span>
          </div>

          <p className="text-xs text-zinc-600 leading-relaxed mb-3 italic">
            "{selectedAgent.mission}"
          </p>

          <div className="flex flex-wrap gap-1 mb-3">
            {selectedAgent.expertise.map((tag) => (
              <span key={tag} className="text-[10px] font-bold bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full">
                {tag}
              </span>
            ))}
          </div>

          <p className="text-[11px] text-zinc-400 leading-snug">{selectedAgent.personality}</p>
        </div>
      )}

      {/* Input Field */}
      <div className="flex justify-center">
        <div className="bg-white/90 backdrop-blur-xl p-2 pl-6 rounded-full border border-black/10 w-full max-w-2xl flex items-center gap-2 pointer-events-auto shadow-xl shadow-black/5">
          <input
            type="text"
            className="bg-transparent border-none outline-none flex-1 py-3 text-zinc-800 placeholder-zinc-400 font-medium"
            placeholder="Talk to the character..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button
            onClick={handleSend}
            disabled={isThinking}
            className={`px-8 py-3 rounded-full font-bold transition-all duration-300 ${
              isThinking
              ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
              : 'bg-zinc-900 text-white hover:bg-black active:scale-95'
            }`}
          >
            {isThinking ? '...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UIOverlay;
