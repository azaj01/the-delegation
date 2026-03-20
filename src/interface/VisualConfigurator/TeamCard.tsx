import { Edit2, Pipette, Trash2, Users, X } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AgenticSystem, DEFAULT_AGENTIC_SET_ID, getAllAgents } from '../../data/agents';
import { abortAllCalls } from '../../integration/coreService';
import { useCoreStore } from '../../integration/store/coreStore';
import { useSceneManager } from '../../simulation/SceneContext';
import { getBrightness, getDarkenedColor } from './colorUtils';

interface TeamCardProps {
  system: AgenticSystem;
  isSelected: boolean;
  isActive: boolean;
  isPredefined: boolean;
  mode: 'view' | 'edit';
  onSelectTeam: (id: string) => void;
  onModeChange: (mode: 'view' | 'edit') => void;
}

export const TeamCard: React.FC<TeamCardProps> = ({
  system,
  isSelected,
  isActive,
  isPredefined,
  mode,
  onSelectTeam,
  onModeChange,
}) => {
  const { setAgentSet, updateSystem, deleteCustomSystem, selectedAgentSetId } = useCoreStore();
  const scene = useSceneManager();
  const colorInputRef = useRef<HTMLInputElement>(null);

  const [localEditData, setLocalEditData] = useState<Partial<AgenticSystem>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [suggestedColor, setSuggestedColor] = useState<string | null>(null);
  const [prevColor, setPrevColor] = useState<string | null>(null);

  const isEditing = mode === 'edit' && isSelected;
  const agentCount = useMemo(() => getAllAgents(system).length, [system]);

  useEffect(() => {
    if (isEditing) {
      setLocalEditData({
        teamName: system.teamName || '',
        teamType: system.teamType || '',
        teamDescription: system.teamDescription || '',
        color: system.color || '#A855F7'
      });
      setErrorMsg(null);
      setShowDeleteConfirm(false);
      setSuggestedColor(null);
      setPrevColor(system.color || '#A855F7');
    } else {
      setErrorMsg(null);
      setShowDeleteConfirm(false);
      setSuggestedColor(null);
    }
  }, [isEditing, system]);

  const hasUnsavedChanges = useMemo(() => {
    return localEditData.teamName !== (system.teamName || '') ||
      localEditData.teamType !== (system.teamType || '') ||
      localEditData.teamDescription !== (system.teamDescription || '') ||
      localEditData.color !== (system.color || '#A855F7');
  }, [localEditData, system]);

  const isFormValid = !!(localEditData.teamName?.trim() &&
    localEditData.teamType?.trim() &&
    localEditData.teamDescription?.trim() &&
    !suggestedColor);

  const handleSwitch = (e: React.MouseEvent) => {
    e.stopPropagation();
    abortAllCalls();
    scene?.resetScene();
    setAgentSet(system.id);
  };

  const handleSave = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!isFormValid) {
      setErrorMsg('Please fill Name, Type and Description or delete the team.');
      return;
    }
    updateSystem(system.id, localEditData);
    onModeChange('view');
  };

  const handleCloseEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isFormValid) {
      if (suggestedColor) {
        setErrorMsg('Please choose a darker color (use suggestion or pick another) before saving.');
      } else {
        setErrorMsg('Please fill Name, Type and Description or delete the team.');
      }
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
    if (system.id === selectedAgentSetId) {
      abortAllCalls();
      scene?.resetScene();
      setAgentSet(DEFAULT_AGENTIC_SET_ID);
    }
    deleteCustomSystem(system.id);
    onModeChange('view');
  };

  const handleLiveColorChange = (newColor: string) => {
    setLocalEditData(prev => ({ ...prev, color: newColor }));
    setSuggestedColor(null);
    setErrorMsg(null);
  };

  const handleCommitColorChange = (newColor: string) => {
    const brightness = getBrightness(newColor);
    if (brightness > 180) {
      const suggested = getDarkenedColor(newColor);
      setSuggestedColor(suggested);
      setErrorMsg('Selected color is too light for white text.');
    } else {
      setSuggestedColor(null);
      setErrorMsg(null);
      setPrevColor(newColor);
    }
  };

  return (
    <div
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
              <p className="text-[9px] font-bold text-red-600 leading-tight uppercase tracking-tight">
                {errorMsg}
              </p>
              {showDeleteConfirm && (
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(false); setErrorMsg(null); }} className="px-2 py-0.5 bg-white border border-red-100 text-red-400 rounded-md text-[8px] font-black uppercase tracking-wider">Cancel</button>
                  <button onClick={confirmDelete} className="px-2 py-0.5 bg-red-500 text-white rounded-md text-[8px] font-black uppercase tracking-wider">OK</button>
                </div>
              )}
            </div>
          )}

          {suggestedColor && (
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (prevColor) {
                    setLocalEditData(prev => ({ ...prev, color: prevColor }));
                  }
                  setSuggestedColor(null);
                  setErrorMsg(null);
                }}
                className="flex-1 py-2 bg-white border border-zinc-200 text-zinc-400 rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-zinc-50 transition-colors"
                type="button"
              >
                Discard
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLocalEditData(prev => ({ ...prev, color: suggestedColor }));
                  setPrevColor(suggestedColor);
                  setSuggestedColor(null);
                  setErrorMsg(null);
                }}
                className="flex-[2] py-2 text-white rounded-xl text-[9px] font-black uppercase tracking-wider hover:opacity-90 transition-all shadow-md shadow-black/5"
                style={{ backgroundColor: suggestedColor || '#A855F7' }}
                type="button"
              >
                Use this color
              </button>
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
            style={{ backgroundColor: (isEditing ? localEditData.color : system.color) || '#A855F7' }}
          >
            {!isPredefined && isSelected && isEditing && (
              <Pipette size={14} className="text-white opacity-80" strokeWidth={2.5} />
            )}
          </div>
          {isEditing && !isPredefined && (
            <input
              ref={colorInputRef}
              type="color"
              value={localEditData.color || '#A855F7'}
              onInput={(e) => handleLiveColorChange((e.target as HTMLInputElement).value)}
              onBlur={(e) => handleCommitColorChange((e.target as HTMLInputElement).value)}
              onChange={(e) => handleCommitColorChange((e.target as HTMLInputElement).value)}
              className="absolute inset-0 opacity-0 pointer-events-none"
            />
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col">
          {isEditing && !isPredefined ? (
            <div className="space-y-2 mb-3" onClick={(e) => e.stopPropagation()}>
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
                <button onClick={handleSwitch} className="px-3 py-1.5 bg-zinc-900 text-white rounded-full text-[9px] font-black uppercase tracking-wider shadow-md">Switch</button>
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
};
