import { Edge, Node } from '@xyflow/react';
import { AgenticSystem, AgentNode, DEFAULT_MAX_ITERATIONS, USER_COLOR, USER_ID, USER_NAME } from '../../data/agents';

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

export function systemToFlow(system: AgenticSystem): { nodes: VisualAgentNode[]; edges: Edge[] } {
  const allNodes: VisualAgentNode[] = [];
  const allEdges: Edge[] = [];
  const handles = new Map<string, { top: HandleData[]; bottom: HandleData[] }>();
  const agentMap = new Map<string, AgentNode>();
  const parentMap = new Map<string, string>();
  const processedAgentIds = new Set<string>();

  const addHandle = (nodeId: string, side: 'top' | 'bottom', h: HandleData) => {
    if (!handles.has(nodeId)) handles.set(nodeId, { top: [], bottom: [] });
    const nodeHandles = handles.get(nodeId)!;
    if (!nodeHandles[side].some(existing => existing.id === h.id)) {
      nodeHandles[side].push(h);
    }
  };

  const isParentOf = (parentId: string, childId: string): boolean => {
    let current = childId;
    while (current && parentMap.has(current)) {
      const p = parentMap.get(current)!;
      if (p === parentId) return true;
      current = p;
    }
    return false;
  };

  const traverse = (agent: AgentNode, parentId?: string) => {
    if (parentId) parentMap.set(agent.id, parentId);
    agentMap.set(agent.id, agent);
    if (processedAgentIds.has(agent.id)) return;
    processedAgentIds.add(agent.id);

    // 1. Hierarchy Edges (Subagents) - Always Parent (Bottom) -> Child (Top)
    if (agent.subagents) {
      agent.subagents.forEach(sub => {
        const edgeId = `h-${agent.id}-${sub.id}`;
        const color = `${agent.color}44`;
        
        addHandle(agent.id, 'bottom', { id: `${edgeId}-src`, type: 'hierarchy', color, role: 'source' });
        addHandle(sub.id, 'top', { id: `${edgeId}-tgt`, type: 'hierarchy', color, role: 'target' });

        allEdges.push({
          id: edgeId,
          source: agent.id,
          sourceHandle: `${edgeId}-src`,
          target: sub.id,
          targetHandle: `${edgeId}-tgt`,
          type: 'hierarchy',
          animated: true,
          style: { stroke: color, strokeWidth: 2, strokeDasharray: '5,5' }
        });
        traverse(sub, agent.id);
      });
    }

    // 2. Flow Edges (Success)
    if (agent.nextId) {
      const edgeId = `f-success-${agent.id}-${agent.nextId}`;
      const color = '#22c55e';
      
      const toParent = agent.nextId === parentId || isParentOf(agent.nextId, agent.id);
      const toChild = isParentOf(agent.id, agent.nextId);
      
      const srcSide = toParent ? 'top' : 'bottom';
      const tgtSide = toParent ? 'bottom' : (toChild ? 'top' : 'top');

      addHandle(agent.id, srcSide, { id: `${edgeId}-src`, type: 'success', color, role: 'source' });
      addHandle(agent.nextId, tgtSide, { id: `${edgeId}-tgt`, type: 'success', color, role: 'target' });

      allEdges.push({
        id: edgeId,
        source: agent.id,
        sourceHandle: `${edgeId}-src`,
        target: agent.nextId,
        targetHandle: `${edgeId}-tgt`,
        label: 'OK',
        type: 'default',
        animated: true,
        style: { stroke: color, strokeWidth: 1 }
      });
    }

    // 3. Flow Edges (Retry)
    if (agent.retryId) {
      const edgeId = `f-retry-${agent.id}-${agent.retryId}`;
      const color = '#ef4444';
      
      const toParent = agent.retryId === parentId || isParentOf(agent.retryId, agent.id) || agent.retryId === USER_ID;
      const toChild = isParentOf(agent.id, agent.retryId);
      
      const srcSide = toParent ? 'top' : (toChild ? 'bottom' : 'top');
      const tgtSide = toParent ? 'bottom' : (toChild ? 'top' : 'top');

      addHandle(agent.id, srcSide, { id: `${edgeId}-src`, type: 'retry', color, role: 'source' });
      addHandle(agent.retryId, tgtSide, { id: `${edgeId}-tgt`, type: 'retry', color, role: 'target' });

      allEdges.push({
        id: edgeId,
        source: agent.id,
        sourceHandle: `${edgeId}-src`,
        target: agent.retryId,
        targetHandle: `${edgeId}-tgt`,
        label: `KO:${agent.maxIterations || DEFAULT_MAX_ITERATIONS}`,
        type: 'default',
        animated: true,
        style: { stroke: color, strokeWidth: 1, strokeDasharray: '5,5' }
      });
    }
  };

  // Add User node
  allNodes.push({
    id: USER_ID,
    type: 'user',
    data: { 
      label: USER_NAME + " (You)", 
      color: USER_COLOR,
      topHandles: [],
      bottomHandles: []
    },
    position: system.user.position || { x: 0, y: 0 },
  });

  // Lead agent connection to User
  const lead = system.leadAgent;
  const leadEdgeId = `h-user-${lead.id}`;
  addHandle(USER_ID, 'bottom', { id: `${leadEdgeId}-src`, type: 'hierarchy', color: '#e4e4e7', role: 'source' });
  addHandle(lead.id, 'top', { id: `${leadEdgeId}-tgt`, type: 'hierarchy', color: '#e4e4e7', role: 'target' });
  
  allEdges.push({
    id: leadEdgeId,
    source: USER_ID,
    sourceHandle: `${leadEdgeId}-src`,
    target: lead.id,
    targetHandle: `${leadEdgeId}-tgt`,
    type: 'hierarchy',
    style: { stroke: '#e4e4e7', strokeWidth: 1, strokeDasharray: '5,5' }
  });

  // Start traversal
  traverse(lead);

  // Create nodes from collected agents
  agentMap.forEach((agent, id) => {
    allNodes.push({
      id,
      type: 'agent',
      data: {
        label: agent.name,
        agent,
        isLead: id === system.leadAgent.id,
        color: agent.color,
        topHandles: [], 
        bottomHandles: [] 
      },
      position: agent.position || { x: 0, y: 0 },
    });
  });

  // Finalize handles for each node
  const typeOrder = { retry: 0, hierarchy: 1, success: 2 };
  const sortH = (h: HandleData[]) => [...h].sort((a, b) => {
    if (a.type !== b.type) return typeOrder[a.type] - typeOrder[b.type];
    return a.id.localeCompare(b.id);
  });

  allNodes.forEach(node => {
    const nodeHandles = handles.get(node.id);
    if (nodeHandles) {
      node.data.topHandles = sortH(nodeHandles.top);
      node.data.bottomHandles = sortH(nodeHandles.bottom);
    }
  });

  return { nodes: allNodes, edges: allEdges };
}
