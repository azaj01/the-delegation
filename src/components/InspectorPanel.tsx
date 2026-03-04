import React, { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { useSceneManager } from '../three/SceneContext';
import { useAgencyStore } from '../store/agencyStore';
import AgentView from './AgentView';
import ProjectView from './ProjectView';
import ChatPanel from './ChatPanel';
import { AGENTS } from '../data/agents';
import { Info, MessageSquare } from 'lucide-react';

const AM_INDEX = 1;

const InspectorPanel: React.FC = () => {
  const { selectedNpcIndex, inspectorTab, setInspectorTab } = useStore();
  const scene = useSceneManager();
  const { phase, pendingApprovalTaskId, tasks } = useAgencyStore();

  const agent = selectedNpcIndex !== null ? AGENTS[selectedNpcIndex] : null;

  // Auto-switch to chat tab for special agents
  useEffect(() => {
    if (selectedNpcIndex === null) return;

    if (selectedNpcIndex === AM_INDEX && phase === 'done') {
      setInspectorTab('chat');
      return;
    }

    if (pendingApprovalTaskId && phase !== 'done') {
      const approvalTask = tasks.find(t => t.id === pendingApprovalTaskId);
      const approvalAgentIndex = approvalTask?.assignedAgentIds[0];
      if (approvalAgentIndex !== undefined && selectedNpcIndex === approvalAgentIndex) {
        setInspectorTab('chat');
        scene?.startChat(selectedNpcIndex);
      }
    }
  }, [selectedNpcIndex]);

  return (
    <div className="w-80 h-full bg-white border-l border-zinc-100 flex flex-col pointer-events-auto shrink-0 relative z-30">
      {!agent ? (
        <ProjectView />
      ) : (
        <>
          {/* Tab Header (Only when agent is selected) */}
          <div className="flex border-b border-zinc-100 bg-zinc-50/50">
            <button
              onClick={() => setInspectorTab('info')}
              className={`flex-1 py-4 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                inspectorTab === 'info'
                ? 'text-zinc-900 bg-white border-b-2 border-zinc-900'
                : 'text-zinc-400 hover:text-zinc-600'
              }`}
            >
              <Info size={14} />
              Info
            </button>
            <button
              onClick={() => setInspectorTab('chat')}
              className={`flex-1 py-4 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                inspectorTab === 'chat'
                ? 'text-zinc-900 bg-white border-b-2 border-zinc-900'
                : 'text-zinc-400 hover:text-zinc-600'
              }`}
            >
              <MessageSquare size={14} />
              Chat
            </button>
          </div>

          <div className="flex-1 overflow-y-auto relative min-h-0 bg-zinc-50/30">
            {inspectorTab === 'info' ? (
              <AgentView agentIndex={selectedNpcIndex!} />
            ) : (
              <ChatPanel />
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default InspectorPanel;
