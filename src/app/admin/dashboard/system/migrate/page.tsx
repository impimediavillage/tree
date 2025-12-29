'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, Database, Loader2, Play, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { db } from '@/lib/firebase';
import { collection, getDocs, writeBatch, doc, serverTimestamp } from 'firebase/firestore';

interface MigrationResult {
  success: boolean;
  updatedCount: number;
  skippedCount: number;
  errors: string[];
  details: string[];
}

export default function SystemMigrationPage() {
  const { isSuperAdmin } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<MigrationResult | null>(null);

  if (!isSuperAdmin) {
    router.replace('/admin/dashboard');
    return null;
  }

  const runDispensaryMigration = async () => {
    setIsRunning(true);
    setResult(null);

    const migrationResult: MigrationResult = {
      success: true,
      updatedCount: 0,
      skippedCount: 0,
      errors: [],
      details: []
    };

    try {
      // Fetch all dispensaries
      const dispensariesRef = collection(db, 'dispensaries');
      const snapshot = await getDocs(dispensariesRef);

      if (snapshot.empty) {
        migrationResult.details.push('No dispensaries found in database');
        setResult(migrationResult);
        return;
      }

      migrationResult.details.push(`Found ${snapshot.size} dispensaries`);

      // Use batched writes for efficiency
      const batch = writeBatch(db);
      let batchCount = 0;
      const MAX_BATCH_SIZE = 500; // Firestore limit

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();

        // Skip if already migrated
        if (data.taxRate !== undefined) {
          migrationResult.skippedCount++;
          migrationResult.details.push(`⏭️  Skipped: ${data.dispensaryName} (already migrated)`);
          continue;
        }

        // Add update to batch
        batch.update(docSnap.ref, {
          taxRate: 15, // South Africa VAT
          inHouseDeliveryPrice: null,
          sameDayDeliveryCutoff: null,
          inHouseDeliveryCutoffTime: null
        });

        migrationResult.updatedCount++;
        migrationResult.details.push(`✅ Queued: ${data.dispensaryName}`);
        batchCount++;

        // Commit batch if we hit the limit
        if (batchCount >= MAX_BATCH_SIZE) {
          await batch.commit();
          migrationResult.details.push(`📦 Committed batch of ${batchCount} updates`);
          batchCount = 0;
        }
      }

      // Commit remaining updates
      if (batchCount > 0) {
        await batch.commit();
        migrationResult.details.push(`📦 Committed final batch of ${batchCount} updates`);
      }

      // Initialize order counter if needed
      const counterRef = doc(db, 'order_counters', 'global');
      const counterBatch = writeBatch(db);
      counterBatch.set(counterRef, {
        letter: 'A',
        number: 0,
        lastUpdated: serverTimestamp()
      }, { merge: true });
      await counterBatch.commit();
      migrationResult.details.push('✅ Order counter initialized');

      toast({
        title: 'Migration Successful',
        description: `Updated ${migrationResult.updatedCount} dispensaries, skipped ${migrationResult.skippedCount}`,
      });

    } catch (error) {
      console.error('Migration error:', error);
      migrationResult.success = false;
      migrationResult.errors.push(error instanceof Error ? error.message : 'Unknown error');
      
      toast({
        title: 'Migration Failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsRunning(false);
      setResult(migrationResult);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8 p-6 bg-muted/50 border border-border/50 rounded-lg shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <Database className="h-14 w-14 text-[#006B3E]" />
          <h1 className="text-4xl font-extrabold text-[#3D2E17]">System Migration</h1>
        </div>
        <p className="text-lg text-[#5D4E37] font-semibold">
          Update database fields for new features
        </p>
      </div>

      {/* Warning Alert */}
      <Alert className="mb-6 border-amber-500 bg-amber-50">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-900 font-bold">Important</AlertTitle>
        <AlertDescription className="text-amber-800">
          This migration will update all dispensary documents with new fields. This operation is safe and can be run multiple times (already-migrated documents will be skipped).
        </AlertDescription>
      </Alert>

      {/* Migration Card */}
      <Card className="border-2 border-border/50 shadow-lg">
        <CardHeader className="bg-muted/30">
          <CardTitle className="text-2xl flex items-center gap-2">
            <RefreshCw className="h-6 w-6 text-[#006B3E]" />
            Dispensary Fields Migration
          </CardTitle>
          <CardDescription className="text-base">
            Add new fields to all dispensaries for tax rates and in-house delivery settings
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-bold text-blue-900 mb-2">This migration will add:</h3>
              <ul className="space-y-1 text-blue-800">
                <li>✓ <strong>taxRate:</strong> 15 (South Africa VAT)</li>
                <li>✓ <strong>inHouseDeliveryPrice:</strong> null (can be set per dispensary)</li>
                <li>✓ <strong>sameDayDeliveryCutoff:</strong> null (can be set per dispensary)</li>
                <li>✓ <strong>inHouseDeliveryCutoffTime:</strong> null (can be set per dispensary)</li>
                <li>✓ <strong>Order Counter:</strong> Initialize global counter for order numbers</li>
              </ul>
            </div>

            <Button
              onClick={runDispensaryMigration}
              disabled={isRunning}
              size="lg"
              className="w-full bg-[#006B3E] hover:bg-[#005230] text-white font-bold text-lg h-14"
            >
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Running Migration...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-5 w-5" />
                  Run Migration
                </>
              )}
            </Button>

            {/* Results */}
            {result && (
              <div className="mt-6 space-y-4">
                {result.success ? (
                  <Alert className="border-green-500 bg-green-50">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-900 font-bold">Migration Complete!</AlertTitle>
                    <AlertDescription className="text-green-800">
                      <div className="mt-2 space-y-1">
                        <p><strong>Updated:</strong> {result.updatedCount} dispensaries</p>
                        <p><strong>Skipped:</strong> {result.skippedCount} (already migrated)</p>
                      </div>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert className="border-red-500 bg-red-50">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertTitle className="text-red-900 font-bold">Migration Failed</AlertTitle>
                    <AlertDescription className="text-red-800">
                      {result.errors.map((error, i) => (
                        <p key={i}>{error}</p>
                      ))}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Detailed Logs */}
                {result.details.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Migration Log</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
                        {result.details.map((detail, i) => (
                          <div key={i}>{detail}</div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
