
import { BaseEdge, EdgeLabelRenderer } from '@xyflow/react';
import { Check, Repeat2, X } from 'lucide-react';
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
            <div className="flex items-center gap-1.5 p-0.5">
              {isSuccess ? (
                <div className="flex items-center justify-center w-5 h-5 rounded-full shadow-sm border border-white bg-green-500">
                  <Check size={10} strokeWidth={4} className="text-white" />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-center w-5 h-5 rounded-full shadow-sm border border-white bg-red-500">
                    <X size={10} strokeWidth={4} className="text-white" />
                  </div>
                  {retryCount && (
                    <div className="flex items-center gap-1.5 pl-1.5 pr-2 py-0.5 h-5 rounded-full shadow-sm border border-white bg-gray-100">
                      <Repeat2 size={10} strokeWidth={2.5} className="text-gray-500" />
                      <span className="text-[10px] font-black text-gray-700 leading-none">
                        {retryCount}
                      </span>
                    </div>
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
