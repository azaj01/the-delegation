import React from 'react';
import { AgentNode } from '../../data/agents';
import { X, Save, Trash2, Shield, Target, Cpu, User } from 'lucide-react';

interface AgentConfigPanelProps {
  agent: AgentNode;
  onClose: () => void;
  onSave?: (agent: AgentNode) => void;
  mode?: 'view' | 'edit';
}

export const AgentConfigPanel: React.FC<AgentConfigPanelProps> = ({ 
  agent, 
  onClose, 
  onSave, 
  mode = 'edit' 
}) => {
  const isView = mode === 'view';

  return (
    <div className="w-80 h-full bg-white border-l border-zinc-100 flex flex-col pointer-events-auto overflow-hidden animate-in slide-in-from-right-full duration-300">
      {/* Header */}
      <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
        <div className="flex items-center gap-2">
          {agent.index === 0 ? (
            <div className="p-1 bg-blue-500 rounded text-white"><User size={12} /></div>
          ) : (
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: agent.color }} />
          )}
          <h3 className="font-bold text-sm text-zinc-800 uppercase tracking-tight">
            {isView ? 'Agent Information' : 'Configure Agent'}
          </h3>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-zinc-200 rounded-md transition-colors text-zinc-400">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Name & Identity */}
        <section className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">Identity</label>
          <div className="space-y-4">
            <div>
              <p className="text-[10px] text-zinc-500 mb-1 font-bold">Agent Name</p>
              {isView ? (
                <p className="text-sm font-bold text-zinc-900 px-1">{agent.name}</p>
              ) : (
                <input
                  type="text"
                  defaultValue={agent.name}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              )}
            </div>
            {agent.index !== 0 && (
              <div>
                <p className="text-[10px] text-zinc-500 mb-1 font-bold">LLM Model</p>
                <div className="flex items-center gap-2 px-3 py-2 bg-zinc-100 border border-zinc-200 rounded-lg text-xs font-mono text-zinc-600">
                  <Cpu size={12} />
                  {agent.model}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Description */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Target size={14} className="text-zinc-400" />
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">Description</label>
          </div>
          {isView ? (
            <p className="text-xs text-zinc-600 leading-relaxed font-medium bg-zinc-50/50 p-3 rounded-xl border border-zinc-100/50 italic">
              {agent.description || "No description provided."}
            </p>
          ) : (
            <input
              type="text"
              defaultValue={agent.description}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
              placeholder="Concise summary of capabilities..."
            />
          )}
        </section>

        {/* Instructions */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-zinc-400" />
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">Instructions</label>
          </div>
          {isView ? (
            <div className="bg-zinc-50/50 p-4 rounded-xl border border-zinc-100/50">
              <p className="text-xs text-zinc-600 leading-relaxed whitespace-pre-wrap font-medium">
                {agent.instruction}
              </p>
            </div>
          ) : (
            <textarea
              defaultValue={agent.instruction}
              className="w-full h-48 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none font-medium"
              placeholder="Core task, persona, and constraints..."
            />
          )}
        </section>
      </div>

      {/* Footer Actions */}
      {!isView && (
        <div className="p-4 border-t border-zinc-100 bg-zinc-50/30 flex flex-col gap-2">
          <button className="w-full py-2.5 bg-zinc-900 hover:bg-black text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95">
            <Save size={16} />
            Save Character
          </button>
          <button className="w-full py-2 text-red-500 hover:bg-red-50 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all">
            <Trash2 size={14} />
            Remove from Team
          </button>
        </div>
      )}
    </div>
  );
};
