
import { Edge, Node } from '@xyflow/react';
import { AgenticSystem, AgentNode, USER_COLOR, USER_ID, USER_NAME } from '../../data/agents';

export interface HandleData {
  id: string;
  type: 'hierarchy' | 'success' | 'retry';
  color: string;
  role: 'source' | 'target';
}

export interface VisualAgentNode extends Node {
  type: 'agent' | 'user';
  data: {
    label: string;
    agent?: AgentNode;
    isLead?: boolean;
    color?: string;
    isDimmed?: boolean;
    topHandles: HandleData[];
    bottomHandles: HandleData[];
  };
}


export function systemToFlow(system: AgenticSystem): { nodes: VisualAgentNode[], edges: Edge[] } {
  const allAgents = [system.leadAgent, ...system.subagents];

  // 1. Define nodes and their base layout
  const allNodeData = [
    {
      id: USER_ID,
      name: USER_NAME + " (You)",
      color: USER_COLOR,
      type: 'user' as const,
      x: system.user.position?.x ?? 0,
      y: system.user.position?.y ?? 0
    },
    {
      id: system.leadAgent.id,
      name: system.leadAgent.name,
      color: system.leadAgent.color,
      type: 'agent' as const,
      x: system.leadAgent.position?.x ?? 0,
      y: system.leadAgent.position?.y ?? 150,
      agent: system.leadAgent
    },
    ...system.subagents.map((agent, i) => ({
      id: agent.id,
      name: agent.name,
      color: agent.color,
      type: 'agent' as const,
      x: agent.position?.x ?? ((i - (system.subagents.length - 1) / 2) * 300),
      y: agent.position?.y ?? 420,
      agent,
    }))
  ];

  const metaMap = new Map(allNodeData.map(n => [n.id, n]));

  // 2. Connections
  const conns = [
    ...(system.leadAgent.parentId === USER_ID ? [{ id: 'h-user-lead', from: USER_ID, to: system.leadAgent.id, type: 'hierarchy' as const }] : []),
    ...system.subagents.filter(a => a.parentId && metaMap.has(a.parentId)).map(a => ({
      id: `h-${a.parentId}-${a.id}`, from: a.parentId!, to: a.id, type: 'hierarchy' as const
    })),
    ...allAgents.flatMap(a => [
      ...(a.nextId && metaMap.has(a.nextId) ? [{ id: `f-success-${a.id}-${a.nextId}`, from: a.id, to: a.nextId, type: 'success' as const }] : []),
      ...(a.retryId && metaMap.has(a.retryId) ? [{ id: `f-retry-${a.id}-${a.retryId}`, from: a.id, to: a.retryId, type: 'retry' as const, maxIterations: a.maxIterations || 5 }] : [])
    ])
  ];

  // 3. Build handles and edges
  const handles = new Map<string, { top: HandleData[], bottom: HandleData[] }>();
  const addHandle = (nodeId: string, side: 'top' | 'bottom', h: HandleData) => {
    if (!handles.has(nodeId)) handles.set(nodeId, { top: [], bottom: [] });
    handles.get(nodeId)![side].push(h);
  };

  const finalEdges: Edge[] = conns.map(c => {
    const from = metaMap.get(c.from)!;
    const to = metaMap.get(c.to)!;
    const isUpward = to.y < from.y;
    const [srcS, tgtS] = isUpward ? ['top' as const, 'bottom' as const] : ['bottom' as const, 'top' as const];

    const color = c.type === 'retry' ? '#ef4444' : c.type === 'success' ? '#22c55e' : '#a1a1aa';
    const label = c.type === 'hierarchy' ? undefined : (c.type === 'success' ? 'OK' : `KO:${(c as any).maxIterations}`);

    addHandle(c.from, srcS, { id: `${c.id}-src`, type: c.type, color, role: 'source' });
    addHandle(c.to, tgtS, { id: `${c.id}-tgt`, type: c.type, color, role: 'target' });

    return {
      id: c.id, source: c.from, sourceHandle: `${c.id}-src`, target: c.to, targetHandle: `${c.id}-tgt`,
      label, animated: c.type !== 'hierarchy',
      style: { stroke: color, strokeWidth: c.type === 'hierarchy' ? 2 : 1, strokeDasharray: c.type === 'hierarchy' ? undefined : '5,5' }
    };
  });

  // 4. Final Nodes
  const typeOrder = { retry: 0, hierarchy: 1, success: 2 };
  const sortH = (h: HandleData[]) => [...h].sort((a, b) => typeOrder[a.type] - typeOrder[b.type]);

  const finalNodes: VisualAgentNode[] = allNodeData.map(meta => ({
    id: meta.id, type: meta.type, position: { x: meta.x, y: meta.y },
    data: {
      label: meta.name, agent: meta.agent, isLead: meta.id === system.leadAgent.id, color: meta.color,
      topHandles: sortH(handles.get(meta.id)?.top || []),
      bottomHandles: sortH(handles.get(meta.id)?.bottom || []),
    },
  }));

  return { nodes: finalNodes, edges: finalEdges };
}
