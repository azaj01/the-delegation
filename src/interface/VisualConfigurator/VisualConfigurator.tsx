
import { applyEdgeChanges, applyNodeChanges, Background, Edge, EdgeChange, NodeChange, NodeTypes, ReactFlow, ReactFlowProvider, useReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Plus, Settings, User, X } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AgentNode, getAgentSet, getAllAgents, USER_COLOR, USER_NAME } from '../../data/agents';
import { useTeamStore } from '../../integration/store/teamStore';
import { useCoreStore } from '../../integration/store/coreStore';
import { AgentConfigPanel } from './AgentConfigPanel';
import { systemToFlow, VisualAgentNode } from './flowUtils';
import { TeamsPanel } from './TeamsPanel';

// Extracted Components & Hooks
import { VisualFlowNode } from './nodes/VisualFlowNode';
import { DirectionalEdge } from './edges/DirectionalEdge';
import { useFlowFocus } from './hooks/useFlowFocus';

const nodeTypes: NodeTypes = {
  agent: VisualFlowNode,
  user: VisualFlowNode,
};

const edgeTypes = {
  default: DirectionalEdge,
};

// --- Internal Sub-components ---

const InternalHeader = ({ onClose }: { onClose: () => void }) => (
  <div className="h-14 border-b border-zinc-100 bg-white flex items-center justify-between px-6 z-50 shrink-0">
    <div className="flex items-center gap-2">
      <Settings size={18} className="text-zinc-900" strokeWidth={2} />
      <h2 className="text-xs font-black text-zinc-900 uppercase tracking-[0.2em] ml-2">Manage Teams</h2>
    </div>

    <div className="flex items-center gap-3">
      <button
        onClick={onClose}
        className="p-2 hover:bg-zinc-100 rounded-xl transition-colors group border border-transparent hover:border-zinc-200"
      >
        <X className="w-5 h-5 text-zinc-400 group-hover:text-zinc-900" />
      </button>
    </div>
  </div>
);

const AgentPlaceholder = () => (
  <div className="w-80 flex flex-col items-center justify-center p-8 text-center text-zinc-400">
    <User size={32} strokeWidth={1.5} className="mb-4 opacity-20" />
    <p className="text-[10px] uppercase font-bold tracking-widest">Select an agent</p>
    <p className="text-[9px] mt-2 leading-relaxed italic opacity-60">Click on any node in the flow to view and edit its details.</p>
  </div>
);

// --- Main Content ---

const VisualConfiguratorContent: React.FC = () => {
  const { selectedAgentSetId, customSystems } = useTeamStore();
  const { setViewMode, viewMode } = useCoreStore();
  const { fitView } = useReactFlow();

  const [configMode, setConfigMode] = useState<'view' | 'edit'>('view');
  const [selectedTeamId, setSelectedTeamId] = useState<string>(selectedAgentSetId);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  // Sync selectedTeamId when the active one changes
  useEffect(() => {
    setSelectedTeamId(selectedAgentSetId);
  }, [selectedAgentSetId]);

  const system = useMemo(() => getAgentSet(selectedTeamId, customSystems), [selectedTeamId, customSystems]);
  
  const agents = useMemo(() => {
    const all = getAllAgents(system);
    const userAgent: AgentNode = {
      id: 'user',
      index: 0,
      name: USER_NAME,
      color: USER_COLOR,
      description: 'The primary user and project visionary.',
      instruction: 'Provide approvals and feedback to the team.',
      model: 'Human',
      allowedTools: [],
    };
    return [userAgent, ...all];
  }, [system]);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => systemToFlow(system), [system]);

  const [nodes, setNodes] = useState<VisualAgentNode[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges]);

  const activeAgent = useMemo(() =>
    selectedAgentId ? agents.find(a => a.id === selectedAgentId) : null
    , [selectedAgentId, agents]);

  // Fit view on appearance or team change
  useEffect(() => {
    if (viewMode === 'design') {
      const timer = setTimeout(() => fitView({ padding: 0.1, duration: 400 }), 100);
      return () => clearTimeout(timer);
    }
  }, [viewMode, selectedTeamId, initialNodes, fitView]);

  // Use custom hook for focus logic
  const { nodesWithFocus, edgesWithFocus } = useFlowFocus(nodes, edges, selectedAgentId, system.leadAgent.id);

  const onNodesChange = useCallback((changes: NodeChange<VisualAgentNode>[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  const onNodeClick = useCallback((_: any, node: any) => {
    setSelectedAgentId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedAgentId(null);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedAgentId(null);
    setSelectedTeamId(selectedAgentSetId);
    setConfigMode('view');
    setViewMode('simulation');
  }, [selectedAgentSetId, setViewMode]);

  return (
    <div className="w-full h-full relative bg-zinc-50 flex flex-col overflow-hidden">
      <InternalHeader onClose={handleClose} />

      <div className="flex-1 min-h-0 relative flex overflow-hidden">
        {/* Left Panel: Agent Config */}
        <div className="relative shrink-0 flex border-r border-zinc-100 bg-white">
          {activeAgent ? (
            <AgentConfigPanel
              agent={activeAgent}
              onClose={() => setSelectedAgentId(null)}
              mode={configMode === 'view' ? 'view' : 'edit'}
            />
          ) : (
            <AgentPlaceholder />
          )}
        </div>

        {/* Center Canvas */}
        <div className="flex-1 relative overflow-hidden">
          <ReactFlow
            nodes={nodesWithFocus}
            edges={edgesWithFocus}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            nodeOrigin={[0.5, 0]}
            fitView
            proOptions={{ hideAttribution: true }}
            nodesConnectable={configMode === 'edit'}
            nodesDraggable={configMode === 'edit'}
            elementsSelectable={true}
            zoomOnScroll={true}
            maxZoom={1.5}
            minZoom={0.5}
          >
            <Background gap={24} color="#bbbbbb" size={2} />
            {configMode === 'edit' && (
              <div className="absolute top-6 left-6 flex flex-col gap-2 z-10">
                <button className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl text-[10px] font-black uppercase tracking-wider text-zinc-600 shadow-sm transition-all hover:bg-zinc-50">
                  <Plus size={14} strokeWidth={3} />
                  Add Agent
                </button>
              </div>
            )}
          </ReactFlow>
        </div>

        {/* Right Panel: Teams */}
        <TeamsPanel
          selectedTeamId={selectedTeamId}
          onSelectTeam={(id) => {
            if (id !== selectedTeamId) {
              setSelectedTeamId(id);
              setSelectedAgentId(null);
              setConfigMode('view');
            }
          }}
          mode={configMode}
          onModeChange={setConfigMode}
        />
      </div>
    </div>
  );
};

export const VisualConfigurator: React.FC = () => (
  <ReactFlowProvider>
    <VisualConfiguratorContent />
  </ReactFlowProvider>
);
