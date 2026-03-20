
import { Edge, Node } from '@xyflow/react';
import { AgenticSystem, AgentNode } from '../../data/agents';

export interface VisualAgentNode extends Node {
  type: 'agent' | 'user';
  data: {
    label: string;
    agent?: AgentNode;
    isLead?: boolean;
    color?: string;
  };
}

export function systemToFlow(system: AgenticSystem): { nodes: VisualAgentNode[], edges: Edge[] } {
  const nodes: VisualAgentNode[] = [];
  const edges: Edge[] = [];

  // 1. User Node
  nodes.push({
    id: 'user',
    type: 'user',
    position: { x: 0, y: 0 },
    data: {
      label: system.user.name,
      color: system.user.color
    },
  });

  // 2. Lead Agent Node
  nodes.push({
    id: system.leadAgent.id,
    type: 'agent',
    position: system.leadAgent.position || { x: 0, y: 150 },
    data: {
      label: system.leadAgent.name,
      agent: system.leadAgent,
      isLead: true,
      color: system.leadAgent.color
    },
  });

  // Edge from User to Lead
  edges.push({
    id: 'user-to-lead',
    source: 'user',
    target: system.leadAgent.id,
    animated: true,
  });

  // 3. Subagents
  const subagentCount = system.subagents.length;
  const spacing = 250;
  
  system.subagents.forEach((agent, index) => {
    // Calculate horizontal position to center them under the lead agent
    const xPos = (index - (subagentCount - 1) / 2) * spacing;
    
    nodes.push({
      id: agent.id,
      type: 'agent',
      position: agent.position || { x: xPos, y: 300 },
      data: {
        label: agent.name,
        agent: agent,
        isLead: false,
        color: agent.color
      },
    });

    if (agent.reportsToId) {
      edges.push({
        id: `edge-${agent.reportsToId}-${agent.id}`,
        source: agent.reportsToId,
        target: agent.id,
      });
    }
  });

  return { nodes, edges };
}
