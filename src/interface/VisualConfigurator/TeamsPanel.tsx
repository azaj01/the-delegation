
import { Plus } from 'lucide-react';
import React, { useMemo } from 'react';
import { AGENTIC_SETS } from '../../data/agents';
import { useTeamStore } from '../../integration/store/teamStore';
import { TeamCard } from './TeamCard';

interface TeamsPanelProps {
  onSelectTeam: (id: string) => void;
  selectedTeamId: string;
  onModeChange: (mode: 'view' | 'edit') => void;
  mode: 'view' | 'edit';
}

export const TeamsPanel: React.FC<TeamsPanelProps> = ({ onSelectTeam, selectedTeamId, onModeChange, mode }) => {
  const { customSystems, selectedAgentSetId, saveCustomSystem } = useTeamStore();

  const allSystems = useMemo(() => {
    const combined = [...customSystems, ...AGENTIC_SETS];
    return combined.filter((sys, index, self) =>
      index === self.findIndex((s) => s.id === sys.id)
    );
  }, [customSystems]);

  const handleCreateNew = () => {
    const newId = `team-${Date.now()}`;
    const newSystem = {
      id: newId, 
      teamName: '', 
      teamType: '', 
      teamDescription: '', 
      color: '#A855F7',
      user: { 
        id: 'user', 
        index: 0, 
        name: 'User', 
        color: '#7EACEA', 
        description: 'The primary user.', 
        instruction: 'Provide approvals and feedback.', 
        model: 'Human', 
        allowedTools: [] 
      },
      leadAgent: { 
        id: `agent-${Date.now()}`, 
        index: 1, 
        name: 'Lead Agent', 
        description: 'Team coordinator.', 
        instruction: 'Coordinate the team to finish the project.', 
        color: '#A855F7', 
        model: 'gemini-3.1-flash-lite-preview', 
        allowedTools: [
          'propose_task', 
          'notify_client_project_ready', 
          'update_client_brief', 
          'request_client_approval', 
          'receive_client_approval', 
          'complete_task'
        ] 
      },
      subagents: [],
    };
    saveCustomSystem(newSystem);
    onSelectTeam(newId);
    onModeChange('edit');
  };

  return (
    <div className="w-96 border-l border-zinc-100 bg-white flex flex-col h-full shrink-0">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {allSystems.map((system) => {
          const isSelected = selectedTeamId === system.id;
          const isActive = selectedAgentSetId === system.id;
          const isPredefined = AGENTIC_SETS.some(s => s.id === system.id);

          return (
            <TeamCard
              key={system.id}
              system={system}
              isSelected={isSelected}
              isActive={isActive}
              isPredefined={isPredefined}
              mode={mode}
              onSelectTeam={onSelectTeam}
              onModeChange={onModeChange}
            />
          );
        })}
      </div>
      <div className="p-4 border-t border-zinc-50 bg-white">
        <button 
          onClick={handleCreateNew} 
          className="w-full flex items-center justify-center gap-2 py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all shadow-lg shadow-black/5 active:scale-[0.98]"
        >
          <Plus size={14} strokeWidth={3} />
          Create New Team
        </button>
      </div>
    </div>
  );
};
