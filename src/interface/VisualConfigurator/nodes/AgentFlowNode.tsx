
import { Handle, Position } from '@xyflow/react';
import React from 'react';
import { HandleData } from '../flowUtils';

export const AgentFlowNode = ({ data, selected }: any) => {
  const topHandles: HandleData[] = data.topHandles || [];
  const bottomHandles: HandleData[] = data.bottomHandles || [];

  return (
    <div
      className={`relative px-5 py-3 shadow-sm rounded-xl bg-white border-2 min-w-[160px] w-fit pointer-events-auto transition-all duration-300 ${selected ? 'ring-4 ring-blue-500/30 border-blue-500 scale-105 z-20' : 'z-10'} ${data.isDimmed ? 'opacity-20 translate-y-1' : 'opacity-100'}`}
      style={{ borderColor: !selected ? (data.color || '#ccc') : undefined }}
    >
      {/* Top Handles — only rendered if connections exist on this side */}
      {topHandles.map((h, i) => (
        <Handle
          key={h.id}
          type={h.role}
          position={Position.Top}
          id={h.id}
          className="!w-2.5 !h-2.5 !border-white shadow-sm"
          style={{
            left: `calc(50% + ${(i - (topHandles.length - 1) / 2) * 14}px)`,
            backgroundColor: h.color,
            top: 0,
            transform: 'translate(-50%, -50%)',
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

      {/* Bottom Handles — only rendered if connections exist on this side */}
      {bottomHandles.map((h, i) => (
        <Handle
          key={h.id}
          type={h.role}
          position={Position.Bottom}
          id={h.id}
          className="!w-2.5 !h-2.5 !border-white shadow-sm"
          style={{
            left: `calc(50% + ${(i - (bottomHandles.length - 1) / 2) * 14}px)`,
            backgroundColor: h.color,
            bottom: 0,
            transform: 'translate(-50%, 50%)',
          }}
        />
      ))}
    </div>
  );
};
