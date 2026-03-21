import { Cpu, Save, Shield, Target, Trash2, User, X, Info, ChevronDown, Check, Pipette } from 'lucide-react';
import React, { useState, useMemo, useEffect } from 'react';
import { AgentNode, AgenticSystem, USER_ID, USER_NAME, USER_COLOR, DEFAULT_MAX_ITERATIONS } from '../../data/agents';
import { useCoreStore } from '../../integration/store/coreStore';
import { useTeamStore } from '../../integration/store/teamStore';
import { ColorPicker } from './ColorPicker';
import { InfoBubble } from './InfoBubble';
import { CORE_TOOLS } from '../../core/llm/toolDefinitions';
import { getBrightness } from './colorUtils';

interface AgentConfigPanelProps {
  agent: AgentNode;
  system: AgenticSystem;
  onClose: () => void;
  onRemove?: () => void;
  mode?: 'view' | 'edit';
}

export const AgentConfigPanel: React.FC<AgentConfigPanelProps> = ({ 
  agent, 
  system: activeSystem,
  onClose, 
  onRemove,
  mode = 'edit' 
}) => {
  const isView = mode === 'view';
  const { availableModels } = useCoreStore();
  const { updateActiveSystem, saveCustomSystem } = useTeamStore();

  const [editData, setEditData] = useState<AgentNode>(agent);
  const isUser = agent.index === 0;
  const isLead = agent.index === 1;

  useEffect(() => {
    setEditData(agent);
  }, [agent]);

  const allCharacters = useMemo(() => {
    const list = [
      { id: USER_ID, name: USER_NAME, index: 0 },
      activeSystem.leadAgent,
      ...activeSystem.subagents
    ];
    return list;
  }, [activeSystem]);

  const availableParents = useMemo(() => {
    if (isLead) return [{ id: USER_ID, name: USER_NAME }];
    return allCharacters.filter(c => c.id !== agent.id);
  }, [allCharacters, agent.id, isLead]);

  const availableNext = useMemo(() => {
    if (isLead) return [{ id: USER_ID, name: USER_NAME }];
    return allCharacters.filter(c => c.id !== agent.id);
  }, [allCharacters, agent.id, isLead]);

  const availableRetry = useMemo(() => {
    if (isLead) return [agent];
    return allCharacters.filter(c => c.id !== agent.id || c.id === agent.id);
  }, [allCharacters, agent.id, isLead]);

  const handleSave = () => {
    const brightness = getBrightness(editData.color);
    if (brightness > 180) return; // Block save if color is too light

    const oldId = agent.id;
    const newId = editData.id;

    // 1. Create a base for lead agent and subagents with the updated agent
    let newLeadAgent = isLead ? editData : { ...activeSystem.leadAgent };
    let newSubagents = activeSystem.subagents.map(s => 
      s.index === editData.index ? editData : { ...s }
    );

    // 2. If ID changed, update all references in the system
    if (oldId !== newId) {
      const updateAgentRefs = (a: AgentNode): AgentNode => ({
        ...a,
        parentId: a.parentId === oldId ? newId : a.parentId,
        nextId: a.nextId === oldId ? newId : a.nextId,
        retryId: a.retryId === oldId ? newId : a.retryId,
      });

      newLeadAgent = updateAgentRefs(newLeadAgent);
      newSubagents = newSubagents.map(updateAgentRefs);
    }

    const updatedSystem: AgenticSystem = {
      ...activeSystem,
      leadAgent: newLeadAgent,
      subagents: newSubagents,
    };

    saveCustomSystem(updatedSystem);
    onClose();
  };

  const handleNameChange = (name: string) => {
    // Limit to letters, numbers and spaces
    const sanitizedName = name.replace(/[^a-zA-Z0-9 ]/g, '');
    const id = sanitizedName.toLowerCase().replace(/ /g, '-');
    setEditData(prev => ({ ...prev, name: sanitizedName, id }));
  };

  const toggleTool = (toolName: string) => {
    const current = editData.allowedTools || [];
    const updated = current.includes(toolName)
      ? current.filter(t => t !== toolName)
      : [...current, toolName];
    setEditData(prev => ({ ...prev, allowedTools: updated }));
  };

  const renderField = (label: string, icon: React.ReactNode, value: React.ReactNode, helpText?: string, inline?: boolean) => (
    <div className={inline ? "flex items-center justify-between" : "space-y-1.5"}>
      <div className="flex items-center gap-1.5">
        <div className="text-zinc-400">{icon}</div>
        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">{label}</label>
        {helpText && <InfoBubble text={helpText} />}
      </div>
      <div className={inline ? "" : "px-1"}>{value}</div>
    </div>
  );

  return (
    <div className="w-80 h-full bg-white border-l border-zinc-100 flex flex-col pointer-events-auto overflow-hidden animate-in slide-in-from-right-full duration-300">
      {/* Header */}
      <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
        <div className="flex items-center gap-2">
          {isUser ? (
            <div className="p-1 bg-blue-500 rounded text-white"><User size={12} /></div>
          ) : (
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: editData.color }} />
          )}
          <h3 className="font-bold text-sm text-zinc-800 uppercase tracking-tight truncate">
            {isUser ? 'User Info' : (isLead ? 'Lead Agent Info' : 'Subagent Info')}
          </h3>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-zinc-200 rounded-md transition-colors text-zinc-400">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-8">
        {isUser ? (
          <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 bg-blue-50/30 rounded-3xl border border-blue-100/50 italic">
            <div className="p-4 bg-blue-500 rounded-2xl text-white shadow-lg shadow-blue-500/20">
              <User size={32} strokeWidth={2.5} />
            </div>
            <div>
              <h4 className="text-sm font-black text-zinc-800 uppercase tracking-widest mb-1">Primary User</h4>
              <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">This is you. Your identity and role are fixed across all teams for consistency.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Identity Group */}
            <div className="space-y-6">
              {!isView && (
                <div className="space-y-1.5 px-1">
                   <div className="flex items-center gap-1.5">
                    <Pipette size={12} className="text-zinc-400" />
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Agent Color</label>
                  </div>
                  <ColorPicker 
                    color={editData.color} 
                    onChange={(val) => setEditData(prev => ({ ...prev, color: val }))} 
                  />
                </div>
              )}

              {renderField('Name', <User size={12} />, isView ? (
                <p className="text-sm font-bold text-zinc-900">{editData.name}</p>
              ) : (
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-black/5"
                />
              ), 'Limit characters to letters, numbers and spaces. The ID is auto-generated.')}

              {renderField('LLM Model', <Cpu size={12} />, isView ? (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 border border-zinc-200 rounded-lg text-xs font-mono text-zinc-600 w-fit">
                   {editData.model || 'gemini-3.1-flash-lite-preview'}
                </div>
              ) : (
                <select
                  value={editData.model || 'gemini-3.1-flash-lite-preview'}
                  onChange={(e) => setEditData(prev => ({ ...prev, model: e.target.value }))}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-black/5 appearance-none cursor-pointer"
                >
                  {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              ), 'The specific Gemini model this agent will use.')}
            </div>

            {/* Content Group */}
            <div className="space-y-6">
              {renderField('Description', <Target size={12} />, isView ? (
                <p className="text-xs text-zinc-600 leading-relaxed font-medium italic bg-zinc-50/50 p-3 rounded-xl border border-zinc-100/50">
                  {editData.description || "No description provided."}
                </p>
              ) : (
                <input
                  type="text"
                  value={editData.description}
                  onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-black/5"
                  placeholder="Concise summary of capabilities..."
                />
              ), 'A short summary of what this agent does best.')}

              {renderField('Instructions', <Shield size={12} />, isView ? (
                <div className="bg-zinc-50/50 p-4 rounded-xl border border-zinc-100/50 min-h-[100px]">
                  <p className="text-xs text-zinc-600 leading-relaxed whitespace-pre-wrap font-medium">
                    {editData.instruction}
                  </p>
                </div>
              ) : (
                <textarea
                  value={editData.instruction}
                  onChange={(e) => setEditData(prev => ({ ...prev, instruction: e.target.value }))}
                  className="w-full h-48 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-black/5 resize-none font-medium text-zinc-600"
                  placeholder="Core task, persona, and constraints..."
                />
              ), 'Core guidelines and constraints for the agent.')}
            </div>

            {/* Hierarchy Group */}
            <div className="space-y-4 pt-4 border-t border-zinc-100">
               <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300 mb-4">Flow & Hierarchy</h4>
               
               <div className="grid grid-cols-2 gap-4">
                 {renderField('Reports to', <ChevronDown size={12} />, isLead || isView ? (
                   <div className="text-[11px] font-bold text-zinc-900 bg-zinc-50 px-2.5 py-1.5 rounded-lg border border-zinc-100">{isLead ? 'User' : allCharacters.find(c => c.id === editData.parentId)?.name || 'N/A'}</div>
                 ) : (
                   <select
                     value={editData.parentId}
                     onChange={(e) => setEditData(prev => ({ ...prev, parentId: e.target.value }))}
                     className="w-full px-2 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-[11px] font-bold focus:outline-none"
                   >
                     {availableParents.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                 ))}

                 {renderField('Target', <ChevronDown size={12} />, isLead || isView ? (
                   <div className="text-[11px] font-bold text-zinc-900 bg-zinc-50 px-2.5 py-1.5 rounded-lg border border-zinc-100">{isLead ? 'User' : allCharacters.find(c => c.id === editData.nextId)?.name || 'N/A'}</div>
                 ) : (
                   <select
                     value={editData.nextId}
                     onChange={(e) => setEditData(prev => ({ ...prev, nextId: e.target.value }))}
                     className="w-full px-2 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-[11px] font-bold focus:outline-none"
                   >
                     {availableNext.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                 ))}
               </div>

               <div className="grid grid-cols-2 gap-4">
                 {renderField('Retry on fail', <ChevronDown size={12} />, isLead || isView ? (
                   <div className="text-[11px] font-bold text-zinc-900 bg-zinc-50 px-2.5 py-1.5 rounded-lg border border-zinc-100">{isLead ? (editData.retryId === editData.id ? 'Self' : 'N/A') : allCharacters.find(c => c.id === editData.retryId)?.name || 'None'}</div>
                 ) : (
                   <select
                     value={editData.retryId || ''}
                     onChange={(e) => setEditData(prev => ({ ...prev, retryId: e.target.value || undefined }))}
                     className="w-full px-2 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-[11px] font-bold focus:outline-none"
                   >
                     <option value="">None</option>
                     {availableRetry.map(c => <option key={c.id} value={c.id}>{c.id === agent.id ? 'Self' : c.name}</option>)}
                   </select>
                 ))}

                {!!editData.retryId && renderField('Max Retries', <ChevronDown size={12} />, isView ? (
                   <div className="text-[11px] font-bold text-zinc-900 bg-zinc-50 px-2.5 py-1.5 rounded-lg border border-zinc-100">{editData.maxIterations || DEFAULT_MAX_ITERATIONS}</div>
                ) : (
                   <select
                     value={editData.maxIterations || DEFAULT_MAX_ITERATIONS}
                     onChange={(e) => setEditData(prev => ({ ...prev, maxIterations: parseInt(e.target.value) }))}
                     className="w-full px-2 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-[11px] font-bold focus:outline-none appearance-none cursor-pointer"
                   >
                     {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                       <option key={n} value={n}>{n}</option>
                     ))}
                   </select>
                ))}
               </div>
            </div>

            {/* Tools Group */}
            <div className="space-y-4 pt-4 border-t border-zinc-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300">Allowed Tools</h4>
                  <InfoBubble text="Select which capabilities this agent has access to." />
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {isView ? (
                  (editData.allowedTools || []).map(tool => (
                    <span key={tool} className="px-2 py-1 bg-zinc-100 text-zinc-600 text-[10px] font-bold rounded-lg border border-zinc-200">
                      {tool}
                    </span>
                  ))
                ) : (
                  CORE_TOOLS.map(tool => {
                    const isSelected = (editData.allowedTools || []).includes(tool.function.name);
                    return (
                      <button
                        key={tool.function.name}
                        onClick={() => toggleTool(tool.function.name)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all border ${
                          isSelected 
                            ? 'bg-zinc-900 text-white border-zinc-900 shadow-md shadow-zinc-200' 
                            : 'bg-white text-zinc-400 border-zinc-100 hover:border-zinc-300'
                        }`}
                      >
                        {isSelected && <Check size={10} strokeWidth={3} />}
                        {tool.function.name}
                      </button>
                    );
                  })
                )}
                {!isView && (editData.allowedTools || []).length === 0 && (
                  <p className="text-[10px] text-zinc-400 italic font-medium w-full text-center py-4 bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">No tools selected.</p>
                )}
                {isView && (editData.allowedTools || []).length === 0 && (
                  <p className="text-[10px] text-zinc-400 italic font-medium">None</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer Actions */}
      {!isView && !isUser && (
        <div className="p-4 border-t border-zinc-100 bg-zinc-50/30 flex flex-col gap-2">
          <button 
            onClick={handleSave}
            disabled={getBrightness(editData.color) > 180}
            className={`w-full py-3 bg-zinc-900 hover:bg-black text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-black/5 active:scale-95 ${getBrightness(editData.color) > 180 ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Save size={16} strokeWidth={2.5} />
            Update Agent
          </button>
          {onRemove && (
            <button 
              onClick={onRemove}
              className="w-full py-2.5 text-red-500 hover:bg-red-50 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
            >
              <Trash2 size={14} />
              Remove from Team
            </button>
          )}
        </div>
      )}
    </div>
  );
};
