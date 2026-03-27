import { Info, RefreshCcw, ScrollText } from 'lucide-react';
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';

import { getAgentSet, getAllAgents } from '../data/agents';
import { useCoreStore } from '../integration/store/coreStore';
import { useTeamStore } from '../integration/store/teamStore';
import { useSceneManager } from '../simulation/SceneContext';
import { USER_COLOR } from '../theme/brand';
import ResetModal from './ResetModal';
import PricingModal from './PricingModal';

export function formatTokens(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return num.toString();
}

const ProjectView: React.FC = () => {
  const {
    userBrief,
    phase,
    actionLog,
    resetProject,
  } = useCoreStore();
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const scene = useSceneManager();

  const hasLogs = actionLog.length > 0;

  const handleResetConfirm = () => {
    // 1. Reset the 3D scene (teleport agents, clear chat)
    scene?.resetScene();
    // 3. Clear project state
    resetProject();
    setIsResetModalOpen(false);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 bg-white/50">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-black text-zinc-900 leading-tight">Project Info</h2>
          <div className="flex items-center gap-2">
            <div
              className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors"
              style={{
                backgroundColor: phase === 'working' ? USER_COLOR : (phase === 'done' ? '#22c55e' : '#f4f4f5'),
                color: phase === 'idle' ? '#a1a1aa' : 'white'
              }}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${phase === 'working' ? 'bg-white animate-pulse' : 'bg-white opacity-40'}`} />
              {phase === 'idle' ? 'Ready to Start' : phase}
            </div>
          </div>
        </div>
      </div>

      <div className="h-px bg-zinc-100 w-full mb-6" />

      {/* Reset Project Button */}
      {hasLogs && (
        <div className="mb-8 flex justify-end">
          <button
            onClick={() => setIsResetModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100/50 hover:bg-zinc-100 text-zinc-400 hover:text-red-500 rounded-lg transition-all active:scale-95 group border border-transparent hover:border-red-100"
          >
            <RefreshCcw size={12} className="transition-transform group-hover:rotate-180 duration-500" />
            <span className="text-[10px] font-black uppercase tracking-widest">Reset Project</span>
          </button>
        </div>
      )}

      {/* Brief */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">User Brief</p>
          <div className="h-px flex-1 bg-zinc-100" />
        </div>
        {userBrief ? (
          <div className="markdown-content text-xs text-zinc-600 leading-relaxed font-medium bg-white/40 p-4 rounded-xl border border-zinc-100/50 max-h-[300px] overflow-y-auto custom-scrollbar">
            <ReactMarkdown>
              {userBrief}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="text-xs text-zinc-400 italic">No active brief. Talk to the Lead Agent to define your project.</p>
        )}
      </div>

      {/* Token Usage */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 flex-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Token Usage</p>
            <div className="h-px flex-1 bg-zinc-100" />
          </div>
          <button
            onClick={() => setIsPricingModalOpen(true)}
            className="flex items-center gap-2 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 hover:border-emerald-200 rounded-lg transition-all active:scale-95 group ml-4 cursor-pointer"
          >
            <span className="text-[10px] font-black uppercase tracking-tight text-emerald-600">
              Total Est. ${useCoreStore.getState().totalEstimatedCost.toFixed(3)}
            </span>
            <Info size={11} className="text-emerald-500 group-hover:text-emerald-600" />
          </button>
        </div>

        <div className="bg-zinc-50 rounded-xl p-5 border border-zinc-100 mb-6">
          <div className="flex flex-col gap-1 mb-6">
            <span className="text-4xl font-mono font-black text-zinc-900 tracking-tighter">
              {formatTokens(useCoreStore.getState().totalTokenUsage.totalTokens)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold font-mono">
            <span className="text-zinc-700">{formatTokens(useCoreStore.getState().totalTokenUsage.promptTokens)} <span className="text-zinc-400 font-medium">input</span></span>
            <span className="text-zinc-300">+</span>
            <span className="text-zinc-700">{formatTokens(useCoreStore.getState().totalTokenUsage.completionTokens)} <span className="text-zinc-400 font-medium">output</span></span>
          </div>
        </div>

        <div className="space-y-1">
          {Object.entries(useCoreStore.getState().agentTokenUsage)
            .sort(([, a], [, b]) => b.totalTokens - a.totalTokens)
            .map(([idx, usage]) => {
              const agentIndex = parseInt(idx);
              const selectedAgentSetId = useTeamStore.getState().selectedAgentSetId;
              const agents = getAllAgents(getAgentSet(selectedAgentSetId));
              const agent = agentIndex === -1
                ? { name: 'System', color: '#71717a' }
                : agents.find(a => a.index === agentIndex);

              if (!agent || usage.totalTokens === 0) return null;

              return (
                <div key={idx} className="flex items-center justify-between py-2 px-2 hover:bg-zinc-100/50 rounded-lg transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.1)]" style={{ backgroundColor: agent.color }} />
                    <span className="text-[11px] font-bold text-zinc-600 uppercase tracking-tight group-hover:text-zinc-900 transition-colors">
                      {agent.name}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                      {useCoreStore.getState().agentEstimatedCost[agentIndex] > 0 && (
                        <span className="text-[9px] font-mono font-bold text-emerald-600/70">
                          ${useCoreStore.getState().agentEstimatedCost[agentIndex].toFixed(4)}
                        </span>
                      )}
                      <span className="text-[11px] font-mono font-black text-zinc-800">
                        {formatTokens(usage.totalTokens)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[9px] font-bold font-mono text-zinc-400">
                      <span>{formatTokens(usage.promptTokens)} <span className="font-medium opacity-60">input</span></span>
                      <span className="text-zinc-200">+</span>
                      <span>{formatTokens(usage.completionTokens)} <span className="font-medium opacity-60">output</span></span>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      <ResetModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={handleResetConfirm}
      />

      {isPricingModalOpen && (
        <PricingModal onClose={() => setIsPricingModalOpen(false)} />
      )}
    </div>
  );
};

export default ProjectView;
