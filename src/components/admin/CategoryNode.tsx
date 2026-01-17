'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';

interface CategoryNodeData {
  name: string;
  image?: string;
  level: number;
  onEdit?: () => void;
  onDelete?: () => void;
}

const CategoryNode = memo(({ data }: NodeProps<CategoryNodeData>) => {
  return (
    <Card className="min-w-[280px] border-2 border-indigo-500 bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950 dark:to-indigo-900 shadow-lg hover:shadow-xl transition-shadow">
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-indigo-500 border-2 border-white"
      />
      
      <div className="p-4 space-y-3">
        {/* Image Preview */}
        <div className="aspect-video bg-white/50 dark:bg-slate-800/50 rounded-md flex items-center justify-center overflow-hidden border-2 border-indigo-300 dark:border-indigo-700">
          {data.image ? (
            <Image
              src={data.image}
              alt={data.name}
              width={280}
              height={160}
              className="object-cover w-full h-full"
            />
          ) : (
            <ImageIcon className="h-12 w-12 text-indigo-300" />
          )}
        </div>

        {/* Category Name */}
        <div className="text-center">
          <h3 className="font-bold text-lg text-indigo-900 dark:text-indigo-100 line-clamp-2">
            {data.name}
          </h3>
          <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-1">
            Category (Level {data.level})
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 bg-white/80 dark:bg-slate-800/80"
            onClick={data.onEdit}
          >
            <Edit2 className="h-3 w-3 mr-1" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 bg-white/80 dark:bg-slate-800/80 text-destructive hover:bg-destructive/10"
            onClick={data.onDelete}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Delete
          </Button>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-indigo-500 border-2 border-white"
      />
    </Card>
  );
});

CategoryNode.displayName = 'CategoryNode';

export default CategoryNode;
