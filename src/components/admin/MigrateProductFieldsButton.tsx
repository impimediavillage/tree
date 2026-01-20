'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, Database, Loader2, XCircle } from 'lucide-react';
import { functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { useToast } from '@/hooks/use-toast';

interface MigrationResult {
  success: boolean;
  totalUpdated: number;
  totalSkipped: number;
  totalErrors: number;
  details: {
    [collectionName: string]: {
      found: number;
      updated: number;
      skipped: number;
      errors: number;
    };
  };
  errors: string[];
}

/**
 * 🔧 Product Creator Fields Migration Button
 * 
 * Super Admin tool to add createdBy and vendorUserId to all existing products
 * This fixes the issue where Vendors see ALL orders instead of just their own
 */
export function MigrateProductFieldsButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<MigrationResult | null>(null);
  const { toast } = useToast();

  const handleMigration = async () => {
    setIsRunning(true);
    setResult(null);

    try {
      toast({
        title: '🚀 Migration Started',
        description: 'Processing all product collections... This may take several minutes.',
      });

      const migrateFunction = httpsCallable<void, MigrationResult>(
        functions,
        'migrateProductCreatorFields'
      );

      const response = await migrateFunction();
      const migrationResult = response.data;

      setResult(migrationResult);

      if (migrationResult.success) {
        toast({
          title: '✅ Migration Complete',
          description: `Updated ${migrationResult.totalUpdated} products successfully!`,
        });
      } else {
        toast({
          title: '⚠️ Migration Completed with Errors',
          description: `Updated ${migrationResult.totalUpdated} products, but ${migrationResult.totalErrors} errors occurred.`,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Migration error:', error);
      toast({
        title: '❌ Migration Failed',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Database className="h-4 w-4" />
          Migrate Product Fields
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Product Creator Fields Migration
          </DialogTitle>
          <DialogDescription>
            Add <code className="px-1 py-0.5 bg-muted rounded">createdBy</code> and{' '}
            <code className="px-1 py-0.5 bg-muted rounded">vendorUserId</code> fields to all existing products.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning Card */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">What this does:</p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>Adds <code>createdBy</code> field (vendor's user ID)</li>
                  <li>Adds <code>vendorUserId</code> field (same as createdBy)</li>
                  <li>Processes all 5 product collections</li>
                  <li>Skips products that already have these fields</li>
                  <li>Matches products to users via email and dispensaryId</li>
                </ul>
                <p className="font-semibold mt-3">Why this is needed:</p>
                <p className="text-sm">
                  Without these fields, Vendors see ALL orders from their dispensary instead of only orders containing their own products.
                </p>
              </div>
            </AlertDescription>
          </Alert>

          {/* Collections to Process */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Collections to Process</CardTitle>
              <CardDescription>These collections will be updated:</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {[
                  'cannibinoid_store_products',
                  'traditional_medicine_dispensary_products',
                  'homeopathy_store_products',
                  'mushroom_store_products',
                  'permaculture_store_products',
                ].map((collection) => (
                  <Badge key={collection} variant="secondary" className="justify-center">
                    {collection}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Results Display */}
          {result && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  Migration Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{result.totalUpdated}</div>
                    <div className="text-sm text-muted-foreground">Updated</div>
                  </div>
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">{result.totalSkipped}</div>
                    <div className="text-sm text-muted-foreground">Skipped</div>
                  </div>
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{result.totalErrors}</div>
                    <div className="text-sm text-muted-foreground">Errors</div>
                  </div>
                </div>

                {/* Collection Details */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Collection Details:</h4>
                  <div className="max-h-60 overflow-y-auto space-y-2 text-xs">
                    {Object.entries(result.details).map(([collection, stats]) => (
                      <div key={collection} className="p-2 bg-muted/50 rounded flex justify-between items-center">
                        <span className="font-mono">{collection}</span>
                        <div className="flex gap-3 text-xs">
                          <span className="text-muted-foreground">Found: {stats.found}</span>
                          <span className="text-green-600">Updated: {stats.updated}</span>
                          <span className="text-yellow-600">Skipped: {stats.skipped}</span>
                          {stats.errors > 0 && <span className="text-red-600">Errors: {stats.errors}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Errors List */}
                {result.errors.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-red-600">Errors ({result.errors.length}):</h4>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {result.errors.map((error, index) => (
                        <div key={index} className="text-xs p-2 bg-red-50 dark:bg-red-950/20 rounded text-red-700 dark:text-red-300">
                          {error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isRunning}
          >
            Cancel
          </Button>
          <Button
            onClick={handleMigration}
            disabled={isRunning}
            className="gap-2"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Running Migration...
              </>
            ) : (
              <>
                <Database className="h-4 w-4" />
                Start Migration
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
