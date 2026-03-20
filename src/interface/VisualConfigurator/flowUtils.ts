
import { Edge, Node } from '@xyflow/react';
import { AgenticSystem, AgentNode, USER_COLOR, USER_ID, USER_NAME } from '../../data/agents';

export interface VisualAgentNode extends Node {
  type: 'agent' | 'user';
  data: {
    label: string;
    agent?: AgentNode;
    isLead?: boolean;
    color?: string;
    topHandles: Array<{ id: string; type: 'hierarchy' | 'success' | 'retry'; color: string; label?: string; role: 'source' | 'target' }>;
    bottomHandles: Array<{ id: string; type: 'hierarchy' | 'success' | 'retry'; color: string; label?: string; role: 'source' | 'target' }>;
  };
}
export function systemToFlow(system: AgenticSystem): { nodes: VisualAgentNode[], edges: Edge[] } {
  const allAgents = [system.leadAgent, ...system.subagents];
  
  // 1. Build Node metadata and positions first
  const nodeMetas = new Map<string, { name: string, color: string, type: 'user' | 'agent', y: number, x: number, agent?: AgentNode }>();
  
  // User
  nodeMetas.set(USER_ID, { name: USER_NAME, color: USER_COLOR, type: 'user', x: 0, y: 0 });
  
  // Lead
  const leadPos = system.leadAgent.position || { x: 0, y: 150 };
  nodeMetas.set(system.leadAgent.id, { 
    name: system.leadAgent.name, 
    color: system.leadAgent.color, 
    type: 'agent', 
    x: leadPos.x, 
    y: leadPos.y, 
    agent: system.leadAgent 
  });
  
  // Subagents
  system.subagents.forEach((agent, i) => {
    const spacing = 250;
    const defaultX = (i - (system.subagents.length - 1) / 2) * spacing;
    // Stagger Y position to avoid flat horizontal rows and ensure no two nodes have identical Y coordinates
    const staggerY = 400 + (i % 2 === 0 ? 1 : -1) * (15 + (i * 12));
    const pos = agent.position || { x: defaultX, y: staggerY };
    nodeMetas.set(agent.id, { 
      name: agent.name, 
      color: agent.color, 
      type: 'agent', 
      x: pos.x, 
      y: pos.y, 
      agent 
    });
  });

  // 2. Identify all Connections
  interface Connection {
    id: string;
    from: string;
    to: string;
    type: 'hierarchy' | 'success' | 'retry';
    maxIterations?: number;
  }
  
  const conns: Connection[] = [];
  
  // Hierarchy
  if (system.leadAgent.parentId === USER_ID) {
    conns.push({ id: 'h-user-lead', from: USER_ID, to: system.leadAgent.id, type: 'hierarchy' });
  }
  system.subagents.forEach(agent => {
    if (agent.parentId && nodeMetas.has(agent.parentId)) {
      conns.push({ id: `h-${agent.parentId}-${agent.id}`, from: agent.parentId, to: agent.id, type: 'hierarchy' });
    }
  });

  // Flow
  allAgents.forEach(agent => {
    if (agent.nextId && nodeMetas.has(agent.nextId)) {
      conns.push({ id: `f-success-${agent.id}-${agent.nextId}`, from: agent.id, to: agent.nextId, type: 'success' });
    }
    // Always draw retry if it exists
    if (agent.retryId && nodeMetas.has(agent.retryId)) {
      conns.push({ 
        id: `f-retry-${agent.id}-${agent.retryId}`, 
        from: agent.id, 
        to: agent.retryId, 
        type: 'retry',
        maxIterations: agent.maxIterations || 5 // Use default if not set
      });
    }
  });

  // 3. Determine sides and handle allocations
  const nodeTopHandles = new Map<string, any[]>();
  const nodeBottomHandles = new Map<string, any[]>();
  
  const addHandle = (nodeId: string, side: 'top' | 'bottom', handle: any) => {
    const map = side === 'top' ? nodeTopHandles : nodeBottomHandles;
    if (!map.has(nodeId)) map.set(nodeId, []);
    map.get(nodeId)!.push(handle);
  };

  const finalEdges: Edge[] = [];
  
  conns.forEach(c => {
    const fromMeta = nodeMetas.get(c.from)!;
    const toMeta = nodeMetas.get(c.to)!;
    
    // Direction: UP if target is above source
    const isUpward = toMeta.y < fromMeta.y;
    
    const sourceSide = isUpward ? 'top' : 'bottom';
    const targetSide = isUpward ? 'bottom' : 'top';
    
    const sourceHandleId = `out-${c.to}-${c.type}`;
    const targetHandleId = `in-${c.from}-${c.type}`;
    
    const color = c.type === 'retry' ? '#ef4444' : (c.type === 'success' ? '#3b82f6' : '#a1a1aa');
    const label = c.type === 'hierarchy' ? undefined : (c.type === 'success' ? 'OK' : `KO:${c.maxIterations}`);

    addHandle(c.from, sourceSide, { id: sourceHandleId, type: c.type, color, role: 'source' });
    addHandle(c.to, targetSide, { id: targetHandleId, type: c.type, color, role: 'target' });
    
    finalEdges.push({
      id: c.id,
      source: c.from,
      sourceHandle: sourceHandleId,
      target: c.to,
      targetHandle: targetHandleId,
      label,
      animated: c.type !== 'hierarchy',
      style: { 
        stroke: color, 
        strokeWidth: c.type === 'hierarchy' ? 2 : 1,
        strokeDasharray: c.type === 'hierarchy' ? undefined : '5,5'
      }
    });
  });

  // 4. Build Final Nodes
  const finalNodes: VisualAgentNode[] = Array.from(nodeMetas.entries()).map(([id, meta]) => {
    const top = nodeTopHandles.get(id) || [];
    const bottom = nodeBottomHandles.get(id) || [];
    
    // Sort to keep order consistent
    const typeOrder = { retry: 0, hierarchy: 1, success: 2 };
    top.sort((a, b) => typeOrder[a.type as keyof typeof typeOrder] - typeOrder[b.type as keyof typeof typeOrder]);
    bottom.sort((a, b) => typeOrder[a.type as keyof typeof typeOrder] - typeOrder[b.type as keyof typeof typeOrder]);

    return {
      id,
      type: meta.type,
      position: { x: meta.x, y: meta.y },
      data: {
        label: meta.name,
        agent: meta.agent,
        isLead: id === system.leadAgent.id,
        color: meta.color,
        topHandles: top,
        bottomHandles: bottom
      }
    };
  });

  return { nodes: finalNodes, edges: finalEdges };
}
