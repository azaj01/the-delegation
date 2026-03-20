
import { applyEdgeChanges, applyNodeChanges, Background, BaseEdge, EdgeChange, EdgeLabelRenderer, getBezierPath, getSmoothStepPath, Handle, InternalNode, Node, NodeChange, NodeTypes, Position, ReactFlow, ReactFlowProvider, useReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Check, Plus, Settings, User, X } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AgentNode, getAgentSet, getAllAgents, USER_COLOR, USER_ID, USER_NAME } from '../../data/agents';
import { useTeamStore } from '../../integration/store/teamStore';
import { useCoreStore } from '../../integration/store/coreStore';
import { AgentConfigPanel } from './AgentConfigPanel';
import { systemToFlow, VisualAgentNode } from './flowUtils';
import { TeamsPanel } from './TeamsPanel';

const AgentNodeComponent = ({ data, selected }: any) => {
  const topHandles = data.topHandles || [];
  const bottomHandles = data.bottomHandles || [];
  
  return (
    <div 
      className={`px-4 py-3 shadow-sm rounded-xl bg-white border-2 min-w-[160px] pointer-events-auto transition-all duration-300 ${selected ? 'ring-4 ring-blue-500/30 border-blue-500 scale-105 z-20' : 'z-10'} ${data.isDimmed ? 'opacity-20 translate-y-1' : 'opacity-100'}`} 
      style={{ borderColor: !selected ? (data.color || '#ccc') : undefined }}
    >
      {/* Dynamic Top Handles */}
      {topHandles.map((h: any, i: number) => (
        <Handle
          key={h.id}
          type={h.role}
          position={Position.Top}
          id={h.id}
          className="w-2.5 h-2.5 shadow-sm border-white"
          style={{ 
            left: `calc(50% + ${(i - (topHandles.length - 1) / 2) * 14}px)`,
            backgroundColor: h.color,
            top: '-6px'
          }}
        />
      ))}

      <div className="flex items-center mb-1">
        <div className="rounded-full w-3 h-3 mr-2 shadow-inner" style={{ backgroundColor: data.color }} />
        <div className="font-bold text-[11px] uppercase tracking-wider text-zinc-800">{data.label}</div>
        {data.isLead && (
          <div className="ml-3 bg-blue-100 text-blue-700 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter border border-blue-200 shadow-sm leading-none flex items-center h-4">
            Lead Agent
          </div>
        )}
      </div>
      <div className="text-[9px] text-zinc-400 font-mono bg-zinc-50 px-1.5 py-0.5 rounded border border-zinc-100 inline-block">{data.agent?.model}</div>

      {/* Dynamic Bottom Handles */}
      {bottomHandles.map((h: any, i: number) => (
        <Handle
          key={h.id}
          type={h.role}
          position={Position.Bottom}
          id={h.id}
          className="w-2.5 h-2.5 shadow-sm border-white"
          style={{ 
            left: `calc(50% + ${(i - (bottomHandles.length - 1) / 2) * 14}px)`,
            backgroundColor: h.color,
            bottom: '-6px'
          }}
        />
      ))}
    </div>
  );
};

const UserNodeComponent = ({ data, selected }: any) => {
  const topHandles = data.topHandles || [];
  const bottomHandles = data.bottomHandles || [];

  return (
    <div className={`px-4 py-3 shadow-sm rounded-xl bg-blue-50 border-2 border-blue-200 min-w-[160px] pointer-events-auto transition-all duration-300 ${selected ? 'ring-4 ring-blue-500/30 border-blue-500 scale-105 z-20' : 'z-10'} ${data.isDimmed ? 'opacity-20 translate-y-1' : 'opacity-100'}`}>
      {/* Dynamic Top Handles */}
      {topHandles.map((h: any, i: number) => (
        <Handle
          key={h.id}
          type={h.role}
          position={Position.Top}
          id={h.id}
          className="w-2.5 h-2.5 border-white shadow-sm"
          style={{ 
            left: `calc(50% + ${(i - (topHandles.length - 1) / 2) * 14}px)`,
            backgroundColor: h.color,
            top: '-6px'
          }}
        />
      ))}

      <div className="flex items-center mb-1">
        <div className="p-1.5 bg-blue-500 rounded-lg mr-2 shadow-sm">
          <User size={14} className="text-white" />
        </div>
        <div className="font-bold text-[11px] uppercase tracking-wider text-blue-900">{data.label}</div>
      </div>
      <div className="text-[9px] text-blue-400 font-mono italic px-1">Control Hub</div>
      
      {/* Dynamic Bottom Handles */}
      {bottomHandles.map((h: any, i: number) => (
        <Handle
          key={h.id}
          type={h.role}
          position={Position.Bottom}
          id={h.id}
          className="w-2.5 h-2.5 border-white shadow-sm"
          style={{ 
            left: `calc(50% + ${(i - (bottomHandles.length - 1) / 2) * 14}px)`,
            backgroundColor: h.color,
            bottom: '-6px'
          }}
        />
      ))}
    </div>
  );
};

const DirectionalEdge = ({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, label }: any) => {
  const isSuccess = label === 'OK';
  const isRetry = typeof label === 'string' && label.startsWith('KO:');
  
  // Create deterministic offsets based on edge type to guarantee parallel lanes
  const typeOffset = isSuccess ? 25 : (isRetry ? -25 : 0);
  
  // Add a unique sub-offset based on the ID hash to separate parallel lines of the SAME type
  const hash = id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
  const subOffset = (hash % 3 - 1) * 8; 
  
  const offset = typeOffset + subOffset;

  // Manual boxy path with offset to avoid overlaps
  const centerY = (sourceY + targetY) / 2 + offset;
  
  // Custom boxy path string
  const edgePath = `M ${sourceX},${sourceY} L ${sourceX},${centerY} L ${targetX},${centerY} L ${targetX},${targetY}`;
  const labelX = (sourceX + targetX) / 2;
  const labelY = centerY;

  const retryCount = isRetry ? label.split(':')[1] : null;

  return (
    <>
      <BaseEdge path={edgePath} style={style} />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              opacity: style?.opacity ?? 1,
            }}
            className="flex items-center justify-center transition-opacity duration-300"
          >
            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full shadow-sm border border-white ${isSuccess ? 'bg-green-500' : 'bg-red-500'}`}>
              {isSuccess ? (
                <Check size={10} strokeWidth={4} className="text-white" />
              ) : (
                <>
                  <X size={10} strokeWidth={4} className="text-white" />
                  {retryCount && (
                    <span className="text-[8px] font-black text-white leading-none -ml-0.5">
                      {retryCount}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

const nodeTypes: NodeTypes = {
  agent: AgentNodeComponent,
  user: UserNodeComponent,
};

const edgeTypes = {
  default: DirectionalEdge,
};

const VisualConfiguratorContent: React.FC = () => {
  const { selectedAgentSetId, customSystems } = useTeamStore();
  const { setViewMode, viewMode } = useCoreStore();
  const { fitView } = useReactFlow();

  const [configMode, setConfigMode] = useState<'view' | 'edit'>('view');
  const [selectedTeamId, setSelectedTeamId] = useState<string>(selectedAgentSetId);

  // Sync selectedTeamId when the active one changes (e.g. via switch button in TeamsPanel)
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
  const [edges, setEdges] = useState(initialEdges);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const activeAgent = useMemo(() =>
    selectedAgentId ? agents.find(a => a.id === selectedAgentId) : null
    , [selectedAgentId, agents]);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges]);

  // Handle fitView on appearance or team change
  useEffect(() => {
    if (viewMode === 'design') {
      const timer = setTimeout(() => {
        fitView({ padding: 0.1, duration: 800 });
      }, 400); // Wait for the modal animation to finish
      return () => clearTimeout(timer);
    }
  }, [viewMode, selectedTeamId, initialNodes, fitView]);

  const onNodesChange = (changes: NodeChange<VisualAgentNode>[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  };

  const onEdgesChange = (changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  };

  const onNodeClick = useCallback((_: any, node: Node | InternalNode) => {
    const agentNode = node as VisualAgentNode;
    setSelectedAgentId(agentNode.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedAgentId(null);
  }, []);

  const nodesWithFocus = useMemo(() => {
    const selectedNode = selectedAgentId ? nodes.find(n => n.id === selectedAgentId) : null;
    const isSubagentSelected = selectedNode?.type === 'agent' && !selectedNode.data.isLead;

    if (!isSubagentSelected) {
      return nodes.map(node => ({
        ...node,
        data: { ...node.data, isDimmed: false }
      }));
    }

    return nodes.map(node => ({
      ...node,
      data: { 
        ...node.data, 
        isDimmed: (node.type === 'agent' && !node.data.isLead && node.id !== selectedAgentId)
      }
    }));
  }, [nodes, selectedAgentId]);

  const edgesWithFocus = useMemo(() => {
    const selectedNode = selectedAgentId ? nodes.find(n => n.id === selectedAgentId) : null;
    const isSubagentSelected = selectedNode?.type === 'agent' && !selectedNode.data.isLead;

    if (!isSubagentSelected) {
      return edges.map(edge => ({
        ...edge,
        style: { ...edge.style, opacity: 1 },
        animated: edge.animated,
      }));
    }

    return edges.map(edge => {
      const involvesSelected = edge.source === selectedAgentId || edge.target === selectedAgentId;
      const isCorePath = (edge.source === USER_ID || edge.target === USER_ID) && 
                         (edge.source === system.leadAgent.id || edge.target === system.leadAgent.id);
      
      const shouldBeOpaque = involvesSelected || isCorePath;

      return {
        ...edge,
        style: { 
          ...edge.style, 
          opacity: shouldBeOpaque ? 1 : 0.05 
        },
        animated: shouldBeOpaque ? edge.animated : false,
      };
    });
  }, [edges, nodes, selectedAgentId, system.leadAgent.id]);

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
            nodes={nodesWithFocus}
            edges={edgesWithFocus}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            nodeOrigin={[0.5, 0]}
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

export const VisualConfigurator: React.FC = () => (
  <ReactFlowProvider>
    <VisualConfiguratorContent />
  </ReactFlowProvider>
);
