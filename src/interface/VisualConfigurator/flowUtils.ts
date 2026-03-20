
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

// Explicit dimensions so React Flow can position handles without waiting for DOM measurement.
// This fixes the first-render misalignment when using nodeOrigin=[0.5, 0].
const NODE_WIDTH = 220;
const NODE_HEIGHT = 90;

export function systemToFlow(system: AgenticSystem): { nodes: VisualAgentNode[], edges: Edge[] } {
  const allAgents = [system.leadAgent, ...system.subagents];

  // 1. Node positions
  const nodeMetas = new Map<string, { name: string; color: string; type: 'user' | 'agent'; x: number; y: number; agent?: AgentNode }>();

  // Center user at 0 by subtracting half width
  nodeMetas.set(USER_ID, { name: USER_NAME, color: USER_COLOR, type: 'user', x: -NODE_WIDTH / 2, y: 0 });

  const leadPos = system.leadAgent.position || { x: 0, y: 150 };
  nodeMetas.set(system.leadAgent.id, {
    name: system.leadAgent.name,
    color: system.leadAgent.color,
    type: 'agent',
    x: leadPos.x - NODE_WIDTH / 2,
    y: leadPos.y,
    agent: system.leadAgent,
  });

  system.subagents.forEach((agent, i) => {
    const spacing = 250;
    const defaultX = (i - (system.subagents.length - 1) / 2) * spacing - NODE_WIDTH / 2;
    const staggerY = 400 + (i % 2 === 0 ? 1 : -1) * (15 + i * 12);
    const pos = agent.position || { x: defaultX, y: staggerY };
    nodeMetas.set(agent.id, { name: agent.name, color: agent.color, type: 'agent', x: pos.x, y: pos.y, agent });
  });

  // 2. Connections
  interface Connection {
    id: string;
    from: string;
    to: string;
    type: 'hierarchy' | 'success' | 'retry';
    maxIterations?: number;
  }

  const conns: Connection[] = [];

  if (system.leadAgent.parentId === USER_ID) {
    conns.push({ id: 'h-user-lead', from: USER_ID, to: system.leadAgent.id, type: 'hierarchy' });
  }
  system.subagents.forEach(agent => {
    if (agent.parentId && nodeMetas.has(agent.parentId)) {
      conns.push({ id: `h-${agent.parentId}-${agent.id}`, from: agent.parentId, to: agent.id, type: 'hierarchy' });
    }
  });
  allAgents.forEach(agent => {
    if (agent.nextId && nodeMetas.has(agent.nextId)) {
      conns.push({ id: `f-success-${agent.id}-${agent.nextId}`, from: agent.id, to: agent.nextId, type: 'success' });
    }
    if (agent.retryId && nodeMetas.has(agent.retryId)) {
      conns.push({ id: `f-retry-${agent.id}-${agent.retryId}`, from: agent.id, to: agent.retryId, type: 'retry', maxIterations: agent.maxIterations || 5 });
    }
  });

  // 3. Build handles per node and edges
  const nodeTopHandles = new Map<string, HandleData[]>();
  const nodeBottomHandles = new Map<string, HandleData[]>();

  const addHandle = (nodeId: string, side: 'top' | 'bottom', handle: HandleData) => {
    const map = side === 'top' ? nodeTopHandles : nodeBottomHandles;
    if (!map.has(nodeId)) map.set(nodeId, []);
    map.get(nodeId)!.push(handle);
  };

  const finalEdges: Edge[] = conns.map(c => {
    const fromMeta = nodeMetas.get(c.from)!;
    const toMeta = nodeMetas.get(c.to)!;
    const isUpward = toMeta.y < fromMeta.y;

    const sourceSide = isUpward ? 'top' : 'bottom';
    const targetSide = isUpward ? 'bottom' : 'top';

    // Unique per-connection handle IDs
    const sourceHandleId = `${c.id}-src`;
    const targetHandleId = `${c.id}-tgt`;

    const color = c.type === 'retry' ? '#ef4444' : c.type === 'success' ? '#22c55e' : '#a1a1aa';
    const label = c.type === 'hierarchy' ? undefined : c.type === 'success' ? 'OK' : `KO:${c.maxIterations}`;

    addHandle(c.from, sourceSide, { id: sourceHandleId, type: c.type, color, role: 'source' });
    addHandle(c.to, targetSide, { id: targetHandleId, type: c.type, color, role: 'target' });

    return {
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
        strokeDasharray: c.type === 'hierarchy' ? undefined : '5,5',
      },
    };
  });

  // 4. Build final nodes with explicit dimensions
  const typeOrder = { retry: 0, hierarchy: 1, success: 2 };
  const sortHandles = (handles: HandleData[]) =>
    [...handles].sort((a, b) => typeOrder[a.type] - typeOrder[b.type]);

  const finalNodes: VisualAgentNode[] = Array.from(nodeMetas.entries()).map(([id, meta]) => ({
    id,
    type: meta.type,
    position: { x: meta.x, y: meta.y },
    measured: { width: NODE_WIDTH, height: NODE_HEIGHT },
    data: {
      label: meta.name,
      agent: meta.agent,
      isLead: id === system.leadAgent.id,
      color: meta.color,
      topHandles: sortHandles(nodeTopHandles.get(id) || []),
      bottomHandles: sortHandles(nodeBottomHandles.get(id) || []),
    },
  }));

  return { nodes: finalNodes, edges: finalEdges };
}
