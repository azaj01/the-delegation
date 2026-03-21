import { Handle, Position } from '@xyflow/react';
import { User } from 'lucide-react';
import React from 'react';
import { HandleData } from '../flowUtils';
import { USER_COLOR, USER_COLOR_LIGHT, USER_COLOR_SOFT } from '../../../theme/brand';

const NodeHandle = ({ h, i, total, position }: { h: HandleData, i: number, total: number, position: 'top' | 'bottom' }) => (
  <Handle
    type={h.role}
    position={position === 'top' ? Position.Top : Position.Bottom}
    id={h.id}
    className="!w-2.5 !h-2.5 !border-white shadow-sm hover:scale-125 transition-transform"
    style={{
      left: `calc(50% + ${(i - (total - 1) / 2) * 14}px)`,
      backgroundColor: h.color,
      [position]: 0,
      transform: `translate(-50%, ${position === 'top' ? '-50%' : '50%'})`,
    }}
  />
);

export const VisualFlowNode = ({ data, selected, type }: any) => {
  const isUser = type === 'user';
  const topHandles: HandleData[] = data.topHandles || [];
  const bottomHandles: HandleData[] = data.bottomHandles || [];

  return (
    <div
      className={`
        relative px-5 py-3 shadow-sm rounded-xl border-2 pointer-events-auto transition-all duration-300 w-fit min-w-[160px] bg-white
        ${selected ? 'ring-4 scale-105 z-20 shadow-lg' : 'z-10'}
        ${data.isDimmed ? 'opacity-20 translate-y-1' : 'opacity-100'}

      `}
      style={{
        borderColor: selected ? (isUser ? USER_COLOR : data.color) : (isUser ? USER_COLOR : data.color || '#ccc'),
        boxShadow: selected ? `0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05), 0 0 0 4px ${isUser ? USER_COLOR : data.color}30` : undefined
      }}
    >
      {/* Handles */}
      {topHandles.map((h, i) => <NodeHandle key={h.id} h={h} i={i} total={topHandles.length} position="top" />)}
      {bottomHandles.map((h, i) => <NodeHandle key={h.id} h={h} i={i} total={bottomHandles.length} position="bottom" />)}

      <div className="flex items-center mb-1 gap-2">
        {isUser ? (
          <div className="p-1.5 rounded-lg shadow-sm shrink-0" style={{ backgroundColor: USER_COLOR }}>
            <User size={14} className="text-white" />
          </div>
        ) : (
          <div className="rounded-full w-3 h-3 shadow-inner shrink-0" style={{ backgroundColor: data.color }} />
        )}

        <div 
          className="font-bold text-[11px] uppercase tracking-wider truncate max-w-[140px]"
          style={{ color: isUser ? USER_COLOR : undefined }}
        >
          {data.label}
        </div>

        {data.isLead && !isUser && (
          <div 
            className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter border shadow-sm leading-none flex items-center h-4 shrink-0"
            style={{ 
              backgroundColor: USER_COLOR_LIGHT, 
              color: USER_COLOR,
              borderColor: USER_COLOR_SOFT
            }}
          >
            Lead
          </div>
        )}
      </div>

      <div 
        className="text-[9px] font-mono px-1.5 py-0.5 rounded border inline-block italic" 
        style={isUser ? {
          color: USER_COLOR,
          borderColor: USER_COLOR_SOFT,
          backgroundColor: USER_COLOR_LIGHT
        } : {
          color: '#a1a1aa', // text-zinc-400
          borderColor: '#f4f4f5', // border-zinc-100
          backgroundColor: '#fafafa' // bg-zinc-50
        }}
      >
        {isUser ? 'Control Hub' : data.agent?.model}
      </div>
    </div>
  );
};
