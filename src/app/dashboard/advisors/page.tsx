
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BrainCircuit } from 'lucide-react';

const AdvisorsPage = () => {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <BrainCircuit className="h-8 w-8 text-primary" />
            AI Advisors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This is the dedicated page for AI Advisors. You can consult with our specialized AI advisors here to gain insights.
          </p>
          {/* Placeholder for future advisor content */}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvisorsPage;
