
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { ReactFlow, Background, Controls, NodeTypes, Handle, Position, applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange, Node, InternalNode } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCoreStore } from '../../integration/store/coreStore';
import { useUiStore } from '../../integration/store/uiStore';
import { getAgentSet, getAllAgents } from '../../data/agents';
import { systemToFlow, VisualAgentNode } from './flowUtils';
import { Settings2, X, User, Edit3, Eye, Plus, Save } from 'lucide-react';
import { AgentConfigPanel } from './AgentConfigPanel';
import { AgentNode } from '../../data/agents';

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

  const system = useMemo(() => getAgentSet(selectedAgentSetId, customSystems), [selectedAgentSetId, customSystems]);
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

    if (configMode === 'view') {
      if (agentNode.type === 'user') {
        setSelectedNpc(0);
      } else if (agentNode.data?.agent && 'index' in agentNode.data.agent) {
        setSelectedNpc(agentNode.data.agent.index as number);
      }
      useUiStore.setState({ inspectorTab: 'info' });
    }
  }, [configMode, setSelectedNpc]);

  const onPaneClick = useCallback(() => {
    setSelectedAgentId(null);
    if (configMode === 'view') {
      setSelectedNpc(null);
    }
  }, [configMode, setSelectedNpc]);

  return (
    <div className="w-full h-full relative bg-zinc-50 flex flex-col overflow-hidden">
      {/* ToolBar */}
      <div className="h-20 border-b border-zinc-100 bg-white flex items-center justify-between px-6 z-50 shrink-0">
        <div className="flex items-center gap-4">
          <div
            className="p-2 rounded-xl shadow-lg shadow-black/10 transition-all duration-500 ease-in-out"
            style={{ backgroundColor: system.color || '#18181b' }}
          >
            <Settings2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              {configMode === 'edit' ? (
                <input
                  value={system.companyName}
                  onChange={(e) => updateActiveSystem({ companyName: e.target.value })}
                  className="text-sm font-bold text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded-lg outline-none focus:ring-2 ring-blue-500/30 w-48 transition-all"
                  placeholder="Company Name"
                />
              ) : (
                <h2 className="text-sm font-bold text-zinc-800 leading-none">{system.companyName}</h2>
              )}

            </div>
            <div className="flex items-center gap-2 mt-1.5">
              {configMode === 'edit' ? (
                <>
                  <input
                    value={system.companyType}
                    onChange={(e) => updateActiveSystem({ companyType: e.target.value })}
                    className="text-[10px] text-zinc-500 uppercase tracking-widest font-black bg-zinc-100 px-2 py-0.5 rounded outline-none w-48"
                    placeholder="Company Type"
                  />
                  <div className="relative group/color">
                    <input
                      type="color"
                      value={system.color}
                      onChange={(e) => updateActiveSystem({ color: e.target.value })}
                      className="w-4 h-4 rounded-full overflow-hidden p-0 border-none cursor-pointer appearance-none bg-transparent"
                    />
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-zinc-900 text-white text-[8px] font-bold rounded opacity-0 group-hover/color:opacity-100 pointer-events-none transition-opacity uppercase whitespace-nowrap">
                      Theme Color
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-black">{system.companyType}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-zinc-100 p-1 rounded-xl border border-zinc-200">
          <button
            onClick={() => {
              setConfigMode('view');
              setSelectedAgentId(null);
              setSelectedNpc(null);
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${configMode === 'view' ? 'bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200' : 'text-zinc-500 hover:text-zinc-700'}`}
          >
            <Eye size={12} strokeWidth={3} />
            Monitor
          </button>
          <button
            onClick={() => {
              setConfigMode('edit');
              setSelectedAgentId(null);
              setSelectedNpc(null);
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${configMode === 'edit' ? 'bg-zinc-900 text-white shadow-lg shadow-black/20' : 'text-zinc-500 hover:text-zinc-700'}`}
          >
            <Edit3 size={12} strokeWidth={3} />
            Architect
          </button>
        </div>

        <div className="flex items-center gap-3">
          {configMode === 'edit' && (
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-lg shadow-blue-500/20 active:scale-95">
              <Save size={12} strokeWidth={3} />
              Publish Changes
            </button>
          )}
          <button
            onClick={() => {
              setSelectedNpc(null);
              setViewMode('simulation');
            }}
            className="p-2 hover:bg-zinc-100 rounded-xl transition-colors group border border-transparent hover:border-zinc-200"
          >
            <X className="w-5 h-5 text-zinc-400 group-hover:text-zinc-900" />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative flex">
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

        <div className="relative shrink-0 flex">
          {activeAgent && (
            <AgentConfigPanel
              agent={activeAgent}
              onClose={() => {
                setSelectedAgentId(null);
                setSelectedNpc(null);
              }}
              mode={configMode === 'view' ? 'view' : 'edit'}
            />
          )}
        </div>
      </div>
    </div>
  );
};
