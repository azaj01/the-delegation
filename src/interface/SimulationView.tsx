import React, { useState } from 'react';
import UIOverlay from './UIOverlay';
import InspectorPanel from './InspectorPanel';
import { Maximize2, Minimize2, Users, LayoutDashboard } from 'lucide-react';
import { useCoreStore } from '../integration/store/coreStore';
import { useUiStore } from '../integration/store/uiStore';
import { getAgentSet, getAllAgents } from '../data/agents';
import AgentSetPickerModal from './AgentSetPickerModal';

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
  const [isPickerOpen, setIsPickerOpen] = useState(false);
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

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('design')}
              className="group flex items-center gap-2 px-2 py-0.5 rounded-full transition-all hover:ring-2 hover:ring-blue-400/30 cursor-pointer"
              style={{ backgroundColor: activeSet.color }}
              title="Open Configurator"
            >
              <LayoutDashboard size={10} className="text-white/70 group-hover:text-white transition-colors" />
              <span className="text-[10px] font-black text-white uppercase tracking-tighter">
                {agentCount} AGENTS
              </span>
            </button>
            <button
              onClick={() => setIsPickerOpen(true)}
              className="flex items-center gap-1.5 px-2 py-1 bg-zinc-50 hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 rounded-md transition-all border border-zinc-100 hover:border-zinc-200 shrink-0"
              title="Change team"
            >
              <Users size={11} />
              <span className="text-[9px] font-black uppercase tracking-widest">Switch</span>
            </button>
          </div>
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

      <AgentSetPickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        hasActiveProject={hasLogs}
      />
    </div>
  );
};

export default SimulationView;
