
import React, { useMemo } from 'react';
import { useCoreStore } from '../../integration/store/coreStore';
import { AGENTIC_SETS, getAgentSet, getAllAgents } from '../../data/agents';
import { Users, Plus, RefreshCcw, ShieldCheck } from 'lucide-react';
import { abortAllCalls } from '../../integration/coreService';
import { useSceneManager } from '../../simulation/SceneContext';

interface TeamsPanelProps {
  onSelectTeam: (id: string) => void;
  selectedTeamId: string;
  onCreateTeam?: () => void;
}

export const TeamsPanel: React.FC<TeamsPanelProps> = ({ onSelectTeam, selectedTeamId, onCreateTeam }) => {
  const { customSystems, selectedAgentSetId, setAgentSet } = useCoreStore();
  const scene = useSceneManager();

  const allSystems = useMemo(() => {
    const combined = [...customSystems, ...AGENTIC_SETS];
    return combined.filter((sys, index, self) =>
      index === self.findIndex((s) => s.id === sys.id)
    );
  }, [customSystems]);

  const handleSwitch = (id: string) => {
    // 1. Cancel all in-flight LLM calls
    abortAllCalls();
    // 2. Reset the 3D scene (teleport agents, clear chat)
    scene?.resetScene();
    // 3. Switch agent set + reset project state
    setAgentSet(id);
  };

  const handleCreateNew = () => {
    const newId = `team-${Date.now()}`;
    const newSystem = {
      id: newId,
      teamName: 'New Team',
      teamType: 'Custom Team',
      teamDescription: 'A custom team created for specific tasks.',
      color: '#4387E2',
      user: {
        id: 'user',
        index: 0,
        name: 'User',
        color: '#7EACEA',
        description: 'The primary user.',
        instruction: 'Provide approvals and feedback.',
        model: 'Human',
        allowedTools: [],
      },
      leadAgent: {
        id: `agent-${Date.now()}`,
        index: 1,
        name: 'Lead Agent',
        description: 'Team coordinator.',
        instruction: 'Coordinate the team to finish the project.',
        color: '#4387E2',
        model: 'gemini-3.1-flash-lite-preview',
        allowedTools: ['propose_task', 'notify_client_project_ready', 'update_client_brief', 'request_client_approval', 'receive_client_approval', 'complete_task'],
      },
      subagents: [],
    };
    
    // We update the active system and switch to it
    useCoreStore.getState().saveCustomSystem(newSystem);
    handleSwitch(newId);
    
    // Force edit mode (architect)
    onCreateTeam?.();
  };

  return (
    <div className="w-80 border-r border-zinc-100 bg-white flex flex-col h-full shrink-0">
      <div className="p-6 border-b border-zinc-50">
        <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest flex items-center gap-2">
          <Users size={16} />
          Teams
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {allSystems.map((system) => {
          const isSelected = selectedTeamId === system.id;
          const isActive = selectedAgentSetId === system.id;
          const agentCount = getAllAgents(system).length;
          const isPredefined = AGENTIC_SETS.some(s => s.id === system.id);

          return (
            <div
              key={system.id}
              onClick={() => onSelectTeam(system.id)}
              className={`group relative p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                isSelected
                  ? 'bg-zinc-50 shadow-sm border-zinc-200'
                  : 'bg-white border-zinc-100 hover:border-zinc-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: system.color }}
                  />
                  <div>
                    <h4 className="text-[11px] font-black text-zinc-900 leading-tight uppercase tracking-tight">{system.teamName}</h4>
                    <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">{system.teamType}</p>
                  </div>
                </div>
                {isActive && (
                  <div className="px-1.5 py-0.5 rounded bg-zinc-900 text-white text-[7px] font-black uppercase tracking-widest">
                    Active
                  </div>
                )}
              </div>

              <p className="text-[10px] text-zinc-500 line-clamp-2 leading-relaxed mb-3">
                {system.teamDescription}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-400">
                  <Users size={10} />
                  {agentCount} Agents
                  {isPredefined && (
                    <div className="flex items-center gap-0.5 text-zinc-300 ml-1">
                      <ShieldCheck size={10} />
                      <span className="text-[8px]">Fixed</span>
                    </div>
                  )}
                </div>

                {isSelected && !isActive && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSwitch(system.id);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 bg-zinc-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-colors shadow-lg shadow-black/10"
                  >
                    <RefreshCcw size={10} />
                    Switch
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4 border-t border-zinc-100">
        <button
          onClick={handleCreateNew}
          className="w-full flex items-center justify-center gap-2 py-3 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-[0.98]"
        >
          <Plus size={14} />
          Create New Team
        </button>
      </div>
    </div>
  );
};
