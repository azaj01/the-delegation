
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useCoreStore } from '../../integration/store/coreStore';
import { AGENTIC_SETS, getAgentSet, getAllAgents, AgenticSystem, DEFAULT_AGENTIC_SET_ID } from '../../data/agents';
import { Users, Plus, RefreshCcw, ShieldCheck, Check, Save, Trash2, Palette, Edit2, X, Pipette, AlertCircle } from 'lucide-react';
import { abortAllCalls } from '../../integration/coreService';
import { useSceneManager } from '../../simulation/SceneContext';

interface TeamsPanelProps {
  onSelectTeam: (id: string) => void;
  selectedTeamId: string;
  onModeChange: (mode: 'view' | 'edit') => void;
  mode: 'view' | 'edit';
}

export const TeamsPanel: React.FC<TeamsPanelProps> = ({ onSelectTeam, selectedTeamId, onModeChange, mode }) => {
  const { customSystems, selectedAgentSetId, setAgentSet, updateSystem, saveCustomSystem, deleteCustomSystem } = useCoreStore();
  const scene = useSceneManager();
  const colorInputRef = useRef<HTMLInputElement>(null);

  const [localEditData, setLocalEditData] = useState<Partial<AgenticSystem>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const allSystems = useMemo(() => {
    const combined = [...customSystems, ...AGENTIC_SETS];
    return combined.filter((sys, index, self) =>
      index === self.findIndex((s) => s.id === sys.id)
    );
  }, [customSystems]);

  const currentSystem = useMemo(() =>
    allSystems.find(s => s.id === selectedTeamId)
    , [allSystems, selectedTeamId]);

  useEffect(() => {
    if (mode === 'edit' && currentSystem) {
      setLocalEditData({
        teamName: currentSystem.teamName || '',
        teamType: currentSystem.teamType || '',
        teamDescription: currentSystem.teamDescription || '',
        color: currentSystem.color || '#A855F7'
      });
      setErrorMsg(null);
      setShowDeleteConfirm(false);
    } else {
      setErrorMsg(null);
      setShowDeleteConfirm(false);
    }
  }, [mode, selectedTeamId, currentSystem]);

  const hasUnsavedChanges = useMemo(() => {
    if (!currentSystem) return false;
    return localEditData.teamName !== (currentSystem.teamName || '') ||
      localEditData.teamType !== (currentSystem.teamType || '') ||
      localEditData.teamDescription !== (currentSystem.teamDescription || '') ||
      localEditData.color !== (currentSystem.color || '#A855F7');
  }, [localEditData, currentSystem]);

  const isFormValid = localEditData.teamName?.trim() &&
    localEditData.teamType?.trim() &&
    localEditData.teamDescription?.trim();

  const handleSwitch = (id: string) => {
    abortAllCalls();
    scene?.resetScene();
    setAgentSet(id);
  };

  const handleSave = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (selectedTeamId) {
      if (!isFormValid) {
        setErrorMsg('Please fill Name, Type and Description or delete the team.');
        return;
      }
      updateSystem(selectedTeamId, localEditData);
      onModeChange('view');
    }
  };

  const handleCloseEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isFormValid) {
      setErrorMsg('Please fill Name, Type and Description or delete the team.');
      return;
    }
    if (hasUnsavedChanges) {
      setErrorMsg('Unsaved changes will be lost. Save or close again to discard.');
      if (errorMsg?.includes('Unsaved changes')) {
        onModeChange('view');
      }
      return;
    }
    onModeChange('view');
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
    setErrorMsg('Delete this team?');
  };

  const confirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedTeamId === selectedAgentSetId) {
      abortAllCalls();
      scene?.resetScene();
      setAgentSet(DEFAULT_AGENTIC_SET_ID);
    }
    deleteCustomSystem(selectedTeamId);
    onModeChange('view');
  };

  const handleCreateNew = () => {
    const newId = `team-${Date.now()}`;
    const newSystem = {
      id: newId, teamName: '', teamType: '', teamDescription: '', color: '#A855F7',
      user: { id: 'user', index: 0, name: 'User', color: '#7EACEA', description: 'The primary user.', instruction: 'Provide approvals and feedback.', model: 'Human', allowedTools: [] },
      leadAgent: { id: `agent-${Date.now()}`, index: 1, name: 'Lead Agent', description: 'Team coordinator.', instruction: 'Coordinate the team to finish the project.', color: '#A855F7', model: 'gemini-3.1-flash-lite-preview', allowedTools: ['propose_task', 'notify_client_project_ready', 'update_client_brief', 'request_client_approval', 'receive_client_approval', 'complete_task'] },
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
          const isActive = useCoreStore.getState().selectedAgentSetId === system.id;
          const isPredefined = AGENTIC_SETS.some(s => s.id === system.id);
          const isEditing = mode === 'edit' && isSelected;
          const agentCount = getAllAgents(system).length;

          return (
            <div
              key={system.id}
              onClick={() => onSelectTeam(system.id)}
              className={`group relative p-3.5 rounded-2xl transition-all cursor-pointer border-[3px] ${isSelected ? 'bg-zinc-50/50 shadow-sm' : 'bg-white hover:border-zinc-200/50'
                }`}
              style={{
                borderColor: isSelected
                  ? system.color
                  : (isActive ? `${system.color}50` : 'transparent')
              }}
            >
              {isEditing && !isPredefined && (
                <div className="mb-3">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[9px] font-black uppercase tracking-[0.1em] text-zinc-900">Edit Team</h3>
                    </div>
                    <button onClick={handleCloseEdit} className="p-1 hover:bg-zinc-200 rounded-lg text-zinc-400">
                      <X size={14} strokeWidth={3} />
                    </button>
                  </div>
                  {errorMsg && (
                    <div className="flex items-center justify-between gap-2 p-2 bg-red-50 border border-red-100 rounded-xl mb-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle size={10} className="text-red-500" />
                        <p className="text-[9px] font-bold text-red-600 leading-tight">{errorMsg}</p>
                      </div>
                      {showDeleteConfirm && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(false); setErrorMsg(null); }} className="px-2 py-0.5 bg-white border border-red-100 text-red-400 rounded-md text-[8px] font-black uppercase tracking-wider">Cancel</button>
                          <button onClick={confirmDelete} className="px-2 py-0.5 bg-red-500 text-white rounded-md text-[8px] font-black uppercase tracking-wider">OK</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {!isPredefined && isSelected && !isEditing && (
                <button
                  onClick={(e) => { e.stopPropagation(); onModeChange('edit'); }}
                  className="absolute top-3.5 right-3.5 flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 rounded-xl text-zinc-800 text-[9px] font-black uppercase tracking-widest transition-all opacity-0 group-hover:opacity-100 z-10"
                >
                  <Edit2 size={12} strokeWidth={2.5} />
                  Edit Team
                </button>
              )}

              <div className="flex items-start gap-3.5">
                <div className="relative shrink-0">
                  <div
                    onClick={(e) => { if (isEditing && !isPredefined) { e.stopPropagation(); colorInputRef.current?.click(); } }}
                    className={`w-8 h-8 rounded-xl shadow-sm flex items-center justify-center transition-all ${isEditing && !isPredefined ? 'cursor-pointer hover:scale-105 active:scale-95' : ''}`}
                    style={{ backgroundColor: isEditing ? localEditData.color : system.color }}
                  >
                    {!isPredefined && isSelected && isEditing && (
                      <Pipette size={14} className="text-white opacity-80" strokeWidth={2.5} />
                    )}
                  </div>
                  {isEditing && !isPredefined && (
                    <input ref={colorInputRef} type="color" value={localEditData.color || '#A855F7'} onChange={(e) => setLocalEditData(prev => ({ ...prev, color: e.target.value }))} className="absolute inset-0 opacity-0 pointer-events-none" />
                  )}
                </div>

                <div className="flex-1 min-w-0 flex flex-col">
                  {isEditing && !isPredefined ? (
                    <div className="space-y-2 mb-3">
                      <div className="space-y-1">
                        <label className="text-[7px] font-black uppercase text-zinc-400 ml-1">Team Name</label>
                        <input value={localEditData.teamName || ''} onChange={(e) => { setLocalEditData(prev => ({ ...prev, teamName: e.target.value })); setErrorMsg(null); }} className="w-full bg-white border border-zinc-100 text-[13px] font-medium rounded-xl px-2.5 py-1.5 outline-none focus:border-blue-500/50" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[7px] font-black uppercase text-zinc-400 ml-1">Team Type</label>
                        <input value={localEditData.teamType || ''} onChange={(e) => { setLocalEditData(prev => ({ ...prev, teamType: e.target.value })); setErrorMsg(null); }} className="w-full bg-white border border-zinc-100 text-[13px] font-medium rounded-xl px-2.5 py-1.5 outline-none focus:border-blue-500/50" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[7px] font-black uppercase text-zinc-400 ml-1">Description</label>
                        <textarea value={localEditData.teamDescription || ''} onChange={(e) => { setLocalEditData(prev => ({ ...prev, teamDescription: e.target.value })); setErrorMsg(null); }} className="w-full bg-white border border-zinc-100 text-[13px] font-medium rounded-xl p-2.5 outline-none resize-none h-20 leading-snug focus:border-blue-500/50" />
                      </div>
                      <button onClick={handleSave} disabled={!isFormValid} className={`w-full py-2.5 mt-1 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all shadow-lg ${isFormValid ? 'bg-zinc-900 text-white shadow-black/10' : 'bg-zinc-50 text-zinc-300 shadow-none cursor-not-allowed'}`}>Save Changes</button>
                    </div>
                  ) : (
                    <div className="space-y-0.5 mb-2">
                      <h4 className={`text-[11px] font-black leading-tight uppercase tracking-wider truncate mb-0.5 ${system.teamName ? 'text-zinc-900' : 'text-zinc-300'}`}>{system.teamName || 'Untitled Team'}</h4>
                      <p className={`text-[9px] font-bold uppercase tracking-[0.1em] ${system.teamType ? 'text-zinc-300' : 'text-zinc-200'}`}>{system.teamType || 'Unspecified Type'}</p>
                      <p className={`text-[10px] leading-relaxed font-medium mt-1.5 line-clamp-3 ${system.teamDescription ? 'text-zinc-500/80' : 'text-zinc-300 italic'}`}>{system.teamDescription || 'No description provided.'}</p>
                    </div>
                  )}

                  <div className={`flex items-center justify-between mt-auto pt-2 ${isEditing ? 'border-t border-zinc-100/30' : ''}`}>
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-50 text-[8px] font-black text-zinc-400 rounded-lg">
                      <Users size={10} strokeWidth={3} />
                      {agentCount} {agentCount === 1 ? 'AGENT' : 'AGENTS'}
                    </div>
                    <div className="flex items-center gap-2">
                      {isActive && !isEditing && (
                        <div className="px-2 py-0.5 rounded-full text-white text-[7px] font-black uppercase tracking-[0.15em]" style={{ backgroundColor: system.color }}>Active</div>
                      )}
                      {isSelected && !isActive && !isEditing && (
                        <button onClick={(e) => { e.stopPropagation(); handleSwitch(system.id); }} className="px-3 py-1.5 bg-zinc-900 text-white rounded-full text-[9px] font-black uppercase tracking-wider shadow-md">Switch</button>
                      )}
                      {isEditing && !isPredefined && (
                        <button onClick={handleDelete} className="flex items-center gap-1.5 px-2 py-1 text-red-500 hover:bg-red-50 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all">
                          <Trash2 size={12} />
                          Delete Team
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="p-4 border-t border-zinc-50 bg-white">
        <button onClick={handleCreateNew} className="w-full flex items-center justify-center gap-2 py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all shadow-lg shadow-black/5 active:scale-[0.98]">
          <Plus size={14} strokeWidth={3} />
          Create New Team
        </button>
      </div>
    </div>
  );
};
