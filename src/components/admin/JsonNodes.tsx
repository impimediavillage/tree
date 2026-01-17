'use client';

import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Badge } from '@/components/ui/badge';
import { Database, Box, FileJson, Hash, Type as TypeIcon, CheckSquare } from 'lucide-react';

interface JsonObjectNodeProps {
  data: {
    label: string;
    fieldCount: number;
    path: string;
  };
}

export const JsonObjectNode = memo(({ data }: JsonObjectNodeProps) => {
  return (
    <div className="px-4 py-3 rounded-lg border-2 border-purple-500 bg-purple-50 dark:bg-purple-950/20 shadow-md min-w-[200px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-purple-500" />
      
      <div className="flex items-center gap-2 mb-2">
        <Database className="h-4 w-4 text-purple-600" />
        <span className="font-bold text-sm text-purple-900 dark:text-purple-100">{data.label}</span>
      </div>
      
      <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-800">
        {data.fieldCount} fields
      </Badge>
      
      <div className="text-xs text-muted-foreground mt-1 font-mono truncate max-w-[180px]">
        {data.path}
      </div>
      
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-purple-500" />
    </div>
  );
});

JsonObjectNode.displayName = 'JsonObjectNode';

interface JsonArrayNodeProps {
  data: {
    label: string;
    itemCount: number;
    path: string;
  };
}

export const JsonArrayNode = memo(({ data }: JsonArrayNodeProps) => {
  return (
    <div className="px-4 py-3 rounded-lg border-2 border-blue-500 bg-blue-50 dark:bg-blue-950/20 shadow-md min-w-[180px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-blue-500" />
      
      <div className="flex items-center gap-2 mb-2">
        <Box className="h-4 w-4 text-blue-600" />
        <span className="font-bold text-sm text-blue-900 dark:text-blue-100">{data.label}</span>
      </div>
      
      <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
        [{data.itemCount} items]
      </Badge>
      
      <div className="text-xs text-muted-foreground mt-1 font-mono truncate max-w-[160px]">
        {data.path}
      </div>
      
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-blue-500" />
    </div>
  );
});

JsonArrayNode.displayName = 'JsonArrayNode';

interface JsonPrimitiveNodeProps {
  data: {
    label: string;
    value: string | number | boolean;
    type: 'string' | 'number' | 'boolean';
    path: string;
  };
}

export const JsonPrimitiveNode = memo(({ data }: JsonPrimitiveNodeProps) => {
  const getIcon = () => {
    switch (data.type) {
      case 'string': return <TypeIcon className="h-3 w-3 text-green-600" />;
      case 'number': return <Hash className="h-3 w-3 text-orange-600" />;
      case 'boolean': return <CheckSquare className="h-3 w-3 text-pink-600" />;
    }
  };

  const getBorderColor = () => {
    switch (data.type) {
      case 'string': return 'border-green-500 bg-green-50 dark:bg-green-950/20';
      case 'number': return 'border-orange-500 bg-orange-50 dark:bg-orange-950/20';
      case 'boolean': return 'border-pink-500 bg-pink-50 dark:bg-pink-950/20';
    }
  };

  const getHandleColor = () => {
    switch (data.type) {
      case 'string': return '!bg-green-500';
      case 'number': return '!bg-orange-500';
      case 'boolean': return '!bg-pink-500';
    }
  };

  return (
    <div className={`px-3 py-2 rounded-lg border-2 ${getBorderColor()} shadow-sm min-w-[160px] max-w-[250px]`}>
      <Handle type="target" position={Position.Top} className={`w-2 h-2 ${getHandleColor()}`} />
      
      <div className="flex items-center gap-2 mb-1">
        {getIcon()}
        <span className="font-semibold text-xs text-gray-700 dark:text-gray-200">{data.label}</span>
      </div>
      
      <div className="text-xs font-mono bg-white/50 dark:bg-black/20 px-2 py-1 rounded border truncate">
        {String(data.value)}
      </div>
      
      <div className="text-[10px] text-muted-foreground mt-1 font-mono truncate">
        {data.path}
      </div>
      
      <Handle type="source" position={Position.Bottom} className={`w-2 h-2 ${getHandleColor()}`} />
    </div>
  );
});

JsonPrimitiveNode.displayName = 'JsonPrimitiveNode';

interface JsonMetadataNodeProps {
  data: {
    label: string;
    fieldCount: number;
    path: string;
  };
}

export const JsonMetadataNode = memo(({ data }: JsonMetadataNodeProps) => {
  return (
    <div className="px-4 py-3 rounded-lg border-2 border-indigo-500 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 shadow-md min-w-[200px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-indigo-500" />
      
      <div className="flex items-center gap-2 mb-2">
        <FileJson className="h-4 w-4 text-indigo-600" />
        <span className="font-bold text-sm text-indigo-900 dark:text-indigo-100">{data.label}</span>
      </div>
      
      <Badge variant="secondary" className="text-xs bg-indigo-100 text-indigo-800">
        ✨ Metadata ({data.fieldCount})
      </Badge>
      
      <div className="text-xs text-muted-foreground mt-1 font-mono truncate max-w-[180px]">
        {data.path}
      </div>
      
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-indigo-500" />
    </div>
  );
});

JsonMetadataNode.displayName = 'JsonMetadataNode';
