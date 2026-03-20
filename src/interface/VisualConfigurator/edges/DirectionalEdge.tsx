
import { BaseEdge, EdgeLabelRenderer } from '@xyflow/react';
import { Check, X } from 'lucide-react';
import React from 'react';

export const DirectionalEdge = ({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, label }: any) => {
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
