
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { ReactFlow, Background, Controls, NodeTypes, Handle, Position, applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange, Node, InternalNode } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCoreStore } from '../../integration/store/coreStore';
import { useUiStore } from '../../integration/store/uiStore';
import { getAgentSet, getAllAgents, AGENTIC_SETS } from '../../data/agents';
import { systemToFlow, VisualAgentNode } from './flowUtils';
import { Settings2, X, User, Edit3, Eye, Plus, Save, Users, Settings } from 'lucide-react';
import { AgentConfigPanel } from './AgentConfigPanel';
import { AgentNode } from '../../data/agents';
import { TeamsPanel } from './TeamsPanel';

const AgentNodeComponent = ({ data, selected }: any) => (
  <div className={`px-4 py-2 shadow-md rounded-md bg-white border-2 min-w-[37.5] pointer-events-auto transition-all ${selected ? 'ring-4 ring-blue-500/30 border-blue-500 scale-105 z-20' : 'z-10'}`} style={{ borderColor: !selected ? (data.color || '#ccc') : undefined }}>
    <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-zinc-300!" />
    <div className="flex items-center">
      <div className="rounded-full w-3 h-3 mr-2" style={{ backgroundColor: data.color }} />
      <div className="font-bold text-xs uppercase tracking-wider">{data.label}</div>
    </div>
    <div className="text-[9px] text-zinc-400 mt-1 font-mono">{data.agent?.model}</div>
    <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-zinc-300!" />
  </div>
);

const UserNodeComponent = ({ data, selected }: any) => (
  <div className={`px-4 py-2 shadow-md rounded-md bg-blue-50 border-2 border-blue-200 min-w-[37.5] pointer-events-auto transition-all ${selected ? 'ring-4 ring-blue-500/30 border-blue-500 scale-105 z-20' : 'z-10'}`}>
    <div className="flex items-center">
      <div className="p-1 bg-blue-500 rounded mr-2">
        <User size={12} className="text-white" />
      </div>
      <div className="font-bold text-xs uppercase tracking-wider text-blue-800">{data.label}</div>
    </div>
    <div className="text-[9px] text-blue-400 mt-1 font-mono italic">Entry Point</div>
    <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-blue-400!" />
  </div>
);

const nodeTypes: NodeTypes = {
  agent: AgentNodeComponent,
  user: UserNodeComponent,
};

export const VisualConfigurator: React.FC = () => {
  const { selectedAgentSetId, setViewMode, customSystems, updateActiveSystem } = useCoreStore();
  const { setSelectedNpc } = useUiStore();

  const [configMode, setConfigMode] = useState<'view' | 'edit'>('view');
  const [selectedTeamId, setSelectedTeamId] = useState<string>(selectedAgentSetId);

  // Sync selectedTeamId when the active one changes (e.g. via switch button in TeamsPanel)
  useEffect(() => {
    setSelectedTeamId(selectedAgentSetId);
  }, [selectedAgentSetId]);

  const system = useMemo(() => getAgentSet(selectedTeamId, customSystems), [selectedTeamId, customSystems]);
  const isPredefined = useMemo(() => AGENTIC_SETS.some(s => s.id === system.id), [system]);
  const isEditable = !isPredefined;
  const agents = useMemo(() => {
    const all = getAllAgents(system);
    const userAgent: AgentNode = {
      id: 'user',
      index: 0,
      name: system.user.name,
      color: system.user.color,
      description: 'The primary user and project visionary.',
      instruction: 'Provide approvals and feedback to the team.',
      model: 'Human',
      allowedTools: [],
    };
    return [userAgent, ...all];
  }, [system]);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => systemToFlow(system), [system]);

  const [nodes, setNodes] = useState<VisualAgentNode[]>(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const activeAgent = useMemo(() =>
    selectedAgentId ? agents.find(a => a.id === selectedAgentId) : null
    , [selectedAgentId, agents]);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges]);

  const onNodesChange = (changes: NodeChange<VisualAgentNode>[]) => {
    if (configMode === 'edit') {
      setNodes((nds) => applyNodeChanges(changes, nds));
    }
  };

  const onEdgesChange = (changes: EdgeChange[]) => {
    if (configMode === 'edit') {
      setEdges((eds) => applyEdgeChanges(changes, eds));
    }
  };

  const onNodeClick = useCallback((_: any, node: Node | InternalNode) => {
    const agentNode = node as VisualAgentNode;
    setSelectedAgentId(agentNode.id);

    if (configMode === 'view' && selectedTeamId === selectedAgentSetId) {
      if (agentNode.type === 'user') {
        setSelectedNpc(0);
      } else if (agentNode.data?.agent && 'index' in agentNode.data.agent) {
        setSelectedNpc(agentNode.data.agent.index as number);
      }
      useUiStore.setState({ inspectorTab: 'info' });
    }
  }, [configMode, setSelectedNpc, selectedTeamId, selectedAgentSetId]);

  const onPaneClick = useCallback(() => {
    setSelectedAgentId(null);
    if (configMode === 'view') {
      setSelectedNpc(null);
    }
  }, [configMode, setSelectedNpc]);

  return (
    <div className="w-full h-full relative bg-zinc-50 flex flex-col overflow-hidden">
      {/* Internal Header */}
      <div className="h-14 border-b border-zinc-100 bg-white flex items-center justify-between px-6 z-50 shrink-0">
        <div className="flex items-center gap-2">
          <Settings size={18} className="text-zinc-900" strokeWidth={2} />
          <h2 className="text-xs font-black text-zinc-900 uppercase tracking-[0.2em] ml-2">Manage Teams</h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setSelectedAgentId(null);
              setSelectedNpc(null);
              setSelectedTeamId(selectedAgentSetId);
              setConfigMode('view');
              setViewMode('simulation');
            }}
            className="p-2 hover:bg-zinc-100 rounded-xl transition-colors group border border-transparent hover:border-zinc-200"
          >
            <X className="w-5 h-5 text-zinc-400 group-hover:text-zinc-900" />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative flex overflow-hidden">
        {/* Left Panel: Agent Config */}
        <div className="relative shrink-0 flex border-r border-zinc-100 bg-white">
          {activeAgent ? (
            <AgentConfigPanel
              agent={activeAgent}
              onClose={() => {
                setSelectedAgentId(null);
              }}
              mode={configMode === 'view' ? 'view' : 'edit'}
            />
          ) : (
            <div className="w-80 flex flex-col items-center justify-center p-8 text-center text-zinc-400">
              <User size={32} strokeWidth={1.5} className="mb-4 opacity-20" />
              <p className="text-[10px] uppercase font-bold tracking-widest">Select an agent</p>
              <p className="text-[9px] mt-2 leading-relaxed italic opacity-60">Click on any node in the flow to view and edit its details.</p>
            </div>
          )}
        </div>

        {/* Center Canvas */}
        <div className="flex-1 relative overflow-hidden">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            nodesConnectable={configMode === 'edit'}
            nodesDraggable={configMode === 'edit'}
            elementsSelectable={true}
            proOptions={{ hideAttribution: true }}
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
