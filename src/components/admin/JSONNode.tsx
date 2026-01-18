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
  // Safety check
  if (!data) {
    return (
      <div className="px-4 py-3 rounded-lg border-2 shadow-lg bg-red-50 min-w-[220px]">
        <span className="text-red-600 text-xs">Invalid node data</span>
      </div>
    );
  }

  // CRITICAL: Force all values to strings to prevent React error #31
  const safeLabel = typeof data.label === 'string' ? data.label : String(data.label || 'Unknown');
  const safeType = data.type || 'string';
  const safeColor = data.color || '#666';
  const safeIsExpandable = Boolean(data.isExpandable);
  
  // ABSOLUTELY ensure displayValue is a string, never an object
  let safeDisplayValue: string;
  if (typeof data.displayValue === 'string') {
    safeDisplayValue = data.displayValue;
  } else if (data.displayValue === null || data.displayValue === undefined) {
    safeDisplayValue = 'null';
  } else if (typeof data.displayValue === 'object') {
    // EMERGENCY: displayValue is an object! Convert it immediately
    try {
      safeDisplayValue = `{${Object.keys(data.displayValue).length} fields}`;
    } catch {
      safeDisplayValue = '[Object]';
    }
  } else {
    safeDisplayValue = String(data.displayValue);
  }

  return (
    <div
      className="px-4 py-3 rounded-lg border-2 shadow-lg bg-white min-w-[220px] max-w-[280px]"
      style={{ borderColor: safeColor }}
    >
      <Handle type="target" position={Position.Left} className="w-2 h-2" />
      
      <div className="space-y-2">
        {/* Field Name */}
        <div className="flex items-center gap-2">
          {safeIsExpandable ? (
            <ChevronRight className="h-4 w-4 flex-shrink-0" style={{ color: safeColor }} />
          ) : (
            <Circle className="h-2 w-2 flex-shrink-0" fill={safeColor} style={{ color: safeColor }} />
          )}
          <span className="font-semibold text-sm truncate" style={{ color: safeColor }}>
            {safeLabel}
          </span>
        </div>

        {/* Type Badge */}
        <Badge
          variant="secondary"
          className="text-xs"
          style={{ backgroundColor: `${safeColor}20`, color: safeColor }}
        >
          {safeType}
        </Badge>

        {/* Value Display */}
        {!safeIsExpandable && (
          <div className="text-xs text-gray-600 truncate" title={safeDisplayValue}>
            {safeDisplayValue}
          </div>
        )}

        {/* Expandable indicator */}
        {safeIsExpandable && (
          <div className="text-xs text-gray-500">
            {safeDisplayValue}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="w-2 h-2" />
    </div>
  );
}

export default memo(JSONNode);
