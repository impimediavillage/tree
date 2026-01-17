'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, Circle } from 'lucide-react';

interface JSONNodeData {
  label: string;
  value?: any;
  fieldName?: string;
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  isExpandable: boolean;
  depth: number;
  fullPath: string;
  color: string;
  displayValue: string;
}

function JSONNode({ data }: NodeProps<JSONNodeData>) {
  const { label, type, isExpandable, displayValue, color } = data;

  return (
    <div
      className="px-4 py-3 rounded-lg border-2 shadow-lg bg-white min-w-[220px] max-w-[280px]"
      style={{ borderColor: color }}
    >
      <Handle type="target" position={Position.Left} className="w-2 h-2" />
      
      <div className="space-y-2">
        {/* Field Name */}
        <div className="flex items-center gap-2">
          {isExpandable ? (
            <ChevronRight className="h-4 w-4 flex-shrink-0" style={{ color }} />
          ) : (
            <Circle className="h-2 w-2 flex-shrink-0" fill={color} style={{ color }} />
          )}
          <span className="font-semibold text-sm truncate" style={{ color }}>
            {label}
          </span>
        </div>

        {/* Type Badge */}
        <Badge
          variant="secondary"
          className="text-xs"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {type}
        </Badge>

        {/* Value Display */}
        {!isExpandable && (
          <div className="text-xs text-gray-600 truncate" title={displayValue}>
            {displayValue}
          </div>
        )}

        {/* Expandable indicator */}
        {isExpandable && (
          <div className="text-xs text-gray-500">
            {displayValue}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="w-2 h-2" />
    </div>
  );
}

export default memo(JSONNode);
