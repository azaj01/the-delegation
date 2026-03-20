import React, { useState } from 'react';
import UIOverlay from './UIOverlay';
import InspectorPanel from './InspectorPanel';
import { Maximize2, Minimize2, Users, LayoutDashboard } from 'lucide-react';
import { useCoreStore } from '../integration/store/coreStore';
import { useUiStore } from '../integration/store/uiStore';
import { getAgentSet, getAllAgents } from '../data/agents';

interface SimulationViewProps {
  canvasRef: React.RefObject<HTMLDivElement>;
  isFullscreen: boolean;
  setIsFullscreen: (value: boolean) => void;
}

const SimulationView: React.FC<SimulationViewProps> = ({ canvasRef, isFullscreen, setIsFullscreen }) => {
  const isPaused = useCoreStore((s) => s.isPaused);
  const setPaused = useCoreStore((s) => s.setPaused);
  const setViewMode = useCoreStore((s) => s.setViewMode);
  const pauseOnCall = useCoreStore((s) => s.pauseOnCall);
  const actionLog = useCoreStore((s) => s.actionLog);
  const selectedNpcIndex = useUiStore((s) => s.selectedNpcIndex);
  const isPlaying = !isPaused;
  const selectedAgentSetId = useCoreStore((s) => s.selectedAgentSetId);

  const activeSet = getAgentSet(selectedAgentSetId);
  const agentCount = getAllAgents(activeSet).length;
  const hasLogs = actionLog.length > 0;

  return (
    <div className="flex flex-col flex-1 min-w-0 min-h-0 relative">
      {/* Simulation View Header */}
      <div className="h-14 border-b border-black/5 flex items-center justify-between px-5 bg-white shrink-0">
        <div className="flex-1 flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest leading-tight">
              {activeSet.teamType}
            </span>
            <span className="text-sm font-black text-zinc-900 leading-tight">
              {activeSet.teamName}
            </span>
          </div>

          <div className="h-6 w-px bg-zinc-100 mx-1" />

          <button
            onClick={() => setViewMode('design')}
            className="flex items-center gap-2.5 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl transition-all shadow-lg shadow-black/10 active:scale-95 cursor-pointer ml-2"
            title="Manage Teams"
          >
            <Users size={16} />
            <span className="text-[11px] font-black uppercase tracking-widest">Team</span>
          </button>
        </div>

        <div className="flex-1 flex items-center justify-end gap-1">
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Panel"}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      <div ref={canvasRef} className="flex-1 min-h-0 relative overflow-hidden bg-black/5">
        <UIOverlay />
        {isFullscreen && selectedNpcIndex !== null && (
          <div className="absolute top-4 right-4 bottom-4 w-96 z-50 pointer-events-none flex flex-col gap-4">
            <InspectorPanel isFloating />
          </div>
        )}
      </div>
    </div>
  );
};

export default SimulationView;
