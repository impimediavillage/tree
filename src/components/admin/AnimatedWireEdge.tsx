'use client';

import { memo, useState } from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer, BaseEdge } from 'reactflow';

/**
 * Animated hanging wire edge - looks like a cable that can be unplugged and reconnected
 */
function AnimatedWireEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isBeingDragged, setIsBeingDragged] = useState(false);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.5, // More pronounced curve like a hanging wire
  });

  // Wire color based on type or state
  const wireColor = isBeingDragged 
    ? '#f59e0b' // Orange when dragging
    : isHovered 
    ? '#3b82f6' // Blue when hovered
    : data?.color || '#8b5cf6'; // Default purple or custom color

  const strokeWidth = isHovered || isBeingDragged ? 4 : 2;

  return (
    <>
      {/* Outer glow for depth effect */}
      <BaseEdge
        id={`${id}-glow`}
        path={edgePath}
        style={{
          ...style,
          stroke: wireColor,
          strokeWidth: strokeWidth + 4,
          opacity: 0.2,
          filter: 'blur(4px)',
        }}
      />

      {/* Main wire with interaction wrapper */}
      <g
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ cursor: 'pointer' }}
      >
        <BaseEdge
          id={id}
          path={edgePath}
          markerEnd={markerEnd}
          style={{
            ...style,
            stroke: wireColor,
            strokeWidth,
            strokeLinecap: 'round',
            transition: 'all 0.2s ease',
          }}
        />
      </g>

      {/* Animated particles flowing through wire */}
      {(isHovered || isBeingDragged) && (
        <g>
          <circle r="3" fill={wireColor} opacity="0.8">
            <animateMotion
              dur="2s"
              repeatCount="indefinite"
              path={edgePath}
            />
            <animate
              attributeName="opacity"
              values="0.8;0.3;0.8"
              dur="2s"
              repeatCount="indefinite"
            />
          </circle>
        </g>
      )}

      {/* Connection point indicators (plugs) */}
      <EdgeLabelRenderer>
        {isHovered && (
          <>
            {/* Source plug */}
            <div
              style={{
                position: 'absolute',
                transform: `translate(-50%, -50%) translate(${sourceX}px,${sourceY}px)`,
                pointerEvents: 'all',
              }}
              className="flex items-center justify-center"
            >
              <div 
                className="w-3 h-3 rounded-full border-2 animate-pulse"
                style={{ 
                  backgroundColor: wireColor,
                  borderColor: 'white',
                  boxShadow: `0 0 8px ${wireColor}`
                }}
              />
            </div>

            {/* Target plug */}
            <div
              style={{
                position: 'absolute',
                transform: `translate(-50%, -50%) translate(${targetX}px,${targetY}px)`,
                pointerEvents: 'all',
              }}
              className="flex items-center justify-center"
            >
              <div 
                className="w-3 h-3 rounded-full border-2 animate-pulse"
                style={{ 
                  backgroundColor: wireColor,
                  borderColor: 'white',
                  boxShadow: `0 0 8px ${wireColor}`
                }}
              />
            </div>

            {/* Label showing connection type */}
            {data?.label && (
              <div
                style={{
                  position: 'absolute',
                  transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                  pointerEvents: 'none',
                  borderColor: wireColor
                }}
                className="px-2 py-1 bg-white dark:bg-gray-800 border-2 rounded-md text-xs font-semibold shadow-lg animate-in fade-in-0 zoom-in-95"
              >
                {data.label}
              </div>
            )}
          </>
        )}
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(AnimatedWireEdge);
