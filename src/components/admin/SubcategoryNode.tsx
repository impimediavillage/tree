'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';

interface SubcategoryNodeData {
  name: string;
  image?: string;
  level: number;
  onEdit?: () => void;
  onDelete?: () => void;
}

const SubcategoryNode = memo(({ data }: NodeProps<SubcategoryNodeData>) => {
  const isLevel2 = data.level === 2;
  const borderColor = isLevel2 ? 'border-green-500' : 'border-purple-500';
  const bgGradient = isLevel2 
    ? 'from-green-50 to-green-100 dark:from-green-950 dark:to-green-900'
    : 'from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900';
  const textColor = isLevel2
    ? 'text-green-900 dark:text-green-100'
    : 'text-purple-900 dark:text-purple-100';
  const labelColor = isLevel2
    ? 'text-green-600 dark:text-green-400'
    : 'text-purple-600 dark:text-purple-400';
  const handleColor = isLevel2 ? '!bg-green-500' : '!bg-purple-500';

  return (
    <Card className={`min-w-[220px] border-2 ${borderColor} bg-gradient-to-br ${bgGradient} shadow-md hover:shadow-lg transition-shadow`}>
      <Handle
        type="target"
        position={Position.Left}
        className={`w-3 h-3 ${handleColor} border-2 border-white`}
      />
      
      <div className="p-3 space-y-2">
        {/* Image Preview (smaller for subcategories) */}
        {data.image && (
          <div className="aspect-video bg-white/50 dark:bg-slate-800/50 rounded-md flex items-center justify-center overflow-hidden border">
            <Image
              src={data.image}
              alt={data.name}
              width={220}
              height={120}
              className="object-cover w-full h-full"
            />
          </div>
        )}

        {/* Subcategory Name */}
        <div className="text-center">
          <h4 className={`font-semibold text-sm ${textColor} line-clamp-2`}>
            {data.name}
          </h4>
          <p className={`text-xs ${labelColor} font-medium mt-1`}>
            {isLevel2 ? 'Subcategory' : 'Sub-sub'} (Level {data.level})
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="flex-1 h-7 text-xs"
            onClick={data.onEdit}
          >
            <Edit2 className="h-3 w-3 mr-1" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="flex-1 h-7 text-xs text-destructive hover:bg-destructive/10"
            onClick={data.onDelete}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Del
          </Button>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className={`w-3 h-3 ${handleColor} border-2 border-white`}
      />
    </Card>
  );
});

SubcategoryNode.displayName = 'SubcategoryNode';

export default SubcategoryNode;
