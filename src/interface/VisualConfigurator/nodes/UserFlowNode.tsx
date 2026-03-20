
import { Handle, Position } from '@xyflow/react';
import { User } from 'lucide-react';
import React from 'react';
import { HandleData } from '../flowUtils';

export const UserFlowNode = ({ data, selected }: any) => {
  const topHandles: HandleData[] = data.topHandles || [];
  const bottomHandles: HandleData[] = data.bottomHandles || [];

  return (
    <div className={`relative px-4 py-3 shadow-sm rounded-xl bg-blue-50 border-2 border-blue-200 min-w-[220px] pointer-events-auto transition-all duration-300 ${selected ? 'ring-4 ring-blue-500/30 border-blue-500 scale-105 z-20' : 'z-10'} ${data.isDimmed ? 'opacity-20 translate-y-1' : 'opacity-100'}`}>
      {/* Top Handles */}
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
        <div className="p-1.5 bg-blue-500 rounded-lg mr-2 shadow-sm">
          <User size={14} className="text-white" />
        </div>
        <div className="font-bold text-[11px] uppercase tracking-wider text-blue-900">{data.label}</div>
      </div>
      <div className="text-[9px] text-blue-400 font-mono italic px-1">Control Hub</div>

      {/* Bottom Handles */}
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
