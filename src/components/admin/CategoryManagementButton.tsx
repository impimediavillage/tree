'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Copy, Loader2, CheckCircle, XCircle, Database } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useToast } from '@/hooks/use-toast';

export function CategoryManagementButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sourceDoc, setSourceDoc] = useState('Homeopathic store');
  const [targetDoc, setTargetDoc] = useState('Apothecary');
  const { toast } = useToast();

  const handleCopyCategories = async () => {
    if (!sourceDoc || !targetDoc) {
      toast({
        title: 'Error',
        description: 'Both source and target document names are required',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);

    try {
      const functions = getFunctions();
      const copyCategoryStructure = httpsCallable(functions, 'copyCategoryStructure');

      const result = await copyCategoryStructure({
        sourceDocId: sourceDoc,
        targetDocId: targetDoc
      });

      const data = result.data as { success: boolean; message: string; documentId?: string };

      if (data.success) {
        toast({
          title: 'Success!',
          description: data.message,
          variant: 'default'
        });
        setIsOpen(false);
        // Reset to defaults
        setSourceDoc('Homeopathic store');
        setTargetDoc('Apothecary');
      } else {
        throw new Error(data.message || 'Failed to copy categories');
      }
    } catch (error: any) {
      console.error('Error copying categories:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to copy category structure',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Card className="hover:shadow-xl transition-shadow bg-muted/50 border-border/50 cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl font-extrabold text-[#3D2E17]">
              <Database className="text-[#006B3E] h-10 w-10" /> Category Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#5D4E37] font-semibold mb-4">
              Copy category structures between dispensary types or create new ones from templates.
            </p>
            <Button className="w-full bg-[#006B3E] hover:bg-[#5D4E37] text-white font-bold">
              Manage Categories
            </Button>
          </CardContent>
        </Card>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Copy Category Structure
          </DialogTitle>
          <DialogDescription>
            Copy all product categories from one dispensary type to another.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="source">Source Document ID</Label>
            <Input
              id="source"
              value={sourceDoc}
              onChange={(e) => setSourceDoc(e.target.value)}
              placeholder="e.g., Homeopathic store"
            />
            <p className="text-xs text-muted-foreground">
              The dispensary type to copy categories FROM
            </p>
          </div>

          <div className="flex items-center justify-center py-2">
            <Copy className="h-6 w-6 text-muted-foreground" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="target">Target Document ID</Label>
            <Input
              id="target"
              value={targetDoc}
              onChange={(e) => setTargetDoc(e.target.value)}
              placeholder="e.g., Apothecary"
            />
            <p className="text-xs text-muted-foreground">
              The new dispensary type name to create
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm">
            <p className="font-semibold text-amber-800 mb-1">⚠️ Important:</p>
            <ul className="text-amber-700 space-y-1 ml-4 list-disc">
              <li>Target document must not already exist</li>
              <li>All category data will be copied</li>
              <li>Original document remains unchanged</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            className="flex-1"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCopyCategories}
            disabled={isLoading || !sourceDoc || !targetDoc}
            className="flex-1 bg-[#006B3E] hover:bg-[#5D4E37]"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Copying...
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copy Categories
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
